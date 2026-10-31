import { verificationDate as date } from '@/utils/verification-date';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { Button } from '@/components/ui/Button';
import { PaymentQrCode } from '@/components/projects/PaymentQrCode';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import { loadVerificationCheckout } from '@/services/verification-checkout';
import { verificationPaymentService as payments } from '@/services/verification-payment.service';
import { canCreateCheckout, checkoutLink, paymentPresentation, paymentQrPayload } from '@/utils/verification-payment';
import { holdSeconds } from '@/utils/verification-booking';
import { rememberPayment } from '@/utils/payment-return';
import { Loading } from '@/components/ui/Loading';

type Snapshot = Awaited<ReturnType<typeof loadVerificationCheckout>>;
const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
function errorText(cause: unknown) {
  const code = cause instanceof ApiError ? cause.code : '';
  if (cause instanceof ApiError && cause.status === 403) return 'Bạn không có quyền xem hoặc thanh toán hồ sơ này.';
  if (code === 'RESERVATION_REQUIRED') return 'Lịch giữ đã hết hạn hoặc chưa được xác nhận. Vui lòng kiểm tra lại hồ sơ và chọn lịch.';
  if (code === 'VERIFICATION_ALREADY_PAID') return 'Hồ sơ đã có thanh toán thành công. Đang tải lại trạng thái.';
  if (code === 'PAYMENT_RECONCILIATION_REQUIRED') return 'Giao dịch cũ cần đối soát trước khi thanh toán tiếp.';
  if (code === 'LEVEL1_REQUIRED' || code === 'LEVEL1_STALE') return 'Kết quả cấp 1 chưa đủ điều kiện hoặc đã thay đổi. Vui lòng kiểm tra lại cấp 1.';
  if (code === 'PAYMENT_NOT_CONFIGURED' || code === 'PAYOS_NOT_CONFIGURED') return 'Dịch vụ thanh toán chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
  if (code === 'INVALID_VERIFICATION_PACKAGE' || code === 'INVALID_PAYMENT_AMOUNT') return 'Gói hiện chưa thể thanh toán. Vui lòng kiểm tra lại hồ sơ hoặc liên hệ hỗ trợ.';
  return cause instanceof Error ? cause.message : 'Không thể tải trạng thái thanh toán. Vui lòng thử lại.';
}

export function VerificationCheckoutScreen({ verificationId, returnProjectId }: { verificationId?: string; returnProjectId?: string } = {}) {
  // Redirect query parameters (status, cancel, orderCode, etc.) never determine payment status.
  const params = useLocalSearchParams<{ id: string; projectId?: string }>();
  const id = verificationId ?? params.id;
  const projectId = returnProjectId ?? params.projectId;
  const { account, isLoading: restoring, isAuthenticated } = useAuthStore();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const active = useRef(false);
  const generation = useRef(0);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = () => setRevision(v => v + 1);

  useFocusEffect(useCallback(() => {
    if (restoring || !isAuthenticated || !account) return;
    active.current = true;
    generation.current++;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let failures = 0;
    const visible = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
      (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    async function load() {
      if (controller.signal.aborted || inFlight || lock.current || !visible()) return;
      inFlight = true;
      if (timer) clearTimeout(timer);
      setLoading(true);
      let pending = true;
      try {
        const result = await loadVerificationCheckout(id ?? '', controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        setSnapshot(result); setError(null); setNow(Date.now());
        const terminal = result.transaction?.status === 1 || result.transaction?.requiresReview || result.transaction?.reconciliationRequired ||
          result.detail.payments.some(p => p.status === 1 || p.requiresManualReview);
        if (terminal) setNotice(null);
        pending = !terminal && (result.transaction?.status === 0 || result.detail.payments.some(p => p.status === 0) || result.detail.verification.bookingStatus === 1);
      } catch (cause) {
        if (controller.signal.aborted) return;
        failures++;
        setError(errorText(cause));
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) { setSnapshot(null); pending = false; }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (pending && failures < 3) timer = setTimeout(() => { void load(); }, 12000);
        }
      }
    }
    refreshRef.current = load;
    void load();
    const foreground = () => { if (timer) clearTimeout(timer); if (visible()) { failures = 0; void load(); } };
    const subscription = AppState.addEventListener('change', foreground);
    const returning = Linking.addEventListener('url', foreground);
    if (Platform.OS === 'web' && typeof document !== 'undefined') { document.addEventListener('visibilitychange', foreground); window.addEventListener('focus', foreground); }
    const clock = setInterval(() => {
      if (!visible()) return;
      setNow(Date.now());
    }, 1000);
    return () => {
      active.current = false; generation.current++; controller.abort(); if (timer) clearTimeout(timer); clearInterval(clock);
      subscription.remove(); returning.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') { document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', foreground); }
    };
  }, [id, account?.id, revision, restoring, isAuthenticated]));

  useEffect(() => {
    if (account && snapshot?.transaction) void rememberPayment({ accountId: account.id, verificationId: id, transactionId: snapshot.transaction.id, projectId });
  }, [account?.id, id, projectId, snapshot?.transaction?.id]);

  async function createCheckout() {
    if (lock.current || loading || error || !snapshot || !canCreateCheckout(snapshot.detail, snapshot.transaction, Date.now())) return;
    lock.current = true; setBusy(true); setNotice(null);
    const current = generation.current;
    const isCurrent = () => active.current && current === generation.current;
    try {
      // Check all server state again before a POST. A prior disconnected request can have succeeded.
      const latest = await loadVerificationCheckout(id);
      if (!isCurrent()) return;
      setSnapshot(latest);
      if (canCreateCheckout(latest.detail, latest.transaction, Date.now())) {
        const transaction = await payments.create(id);
        if (isCurrent() && account) await rememberPayment({ accountId: account.id, verificationId: id, transactionId: transaction.id, projectId });
        if (isCurrent()) { setSnapshot({ ...latest, transaction }); setNotice('Giao dịch đã sẵn sàng. Quét mã QR bên dưới hoặc mở PayOS để thanh toán.'); }
      }
    } catch (cause) {
      if (isCurrent()) setNotice(`${errorText(cause)} Đang kiểm tra lại hồ sơ; không gửi lại thanh toán tự động.`);
    } finally {
      lock.current = false;
      if (active.current) { setBusy(false); await refreshRef.current(); }
    }
  }
  async function openPayment() {
    if (lock.current || !snapshot || error || loading) return;
    lock.current = true; setBusy(true); setNotice(null);
    const current = generation.current;
    try {
      const link = checkoutLink(snapshot.transaction, snapshot.detail, Date.now());
      if (!link) throw new Error('Đường dẫn thanh toán không còn khả dụng. Hãy kiểm tra lại trạng thái.');
      if (Platform.OS === 'web') await Linking.openURL(link);
      else await openBrowserAsync(link);
    } catch (cause) { if (active.current && current === generation.current) setNotice(errorText(cause)); }
    finally { lock.current = false; if (active.current) { setBusy(false); await refreshRef.current(); } }
  }
  const detail = snapshot?.detail;
  const transaction = snapshot?.transaction ?? null;
  const remaining = detail ? holdSeconds(detail, now) : 0;
  const presentation = detail ? paymentPresentation(detail, transaction, now) : null;
  const link = detail ? checkoutLink(transaction, detail, now) : null;
  const qrPayload = detail && !error ? paymentQrPayload(transaction, detail, now) : null;
  const canCreate = !!snapshot && canCreateCheckout(snapshot.detail, transaction, now);
  const amount = transaction?.amountVnd ?? snapshot?.packageData?.price;
  const backToBooking = () => projectId ? router.dismissTo({ pathname: '/group/verification/[id]', params: { id: projectId } } as never) : router.back();
  if (restoring) return <Loading />;
  if (!isAuthenticated) return <SafeAreaView style={s.safe}><View style={s.content}><Text style={s.heading}>Đăng nhập để kiểm tra thanh toán</Text><Button title="Đăng nhập" onPress={() => router.push({ pathname: '/(auth)/login', params: { paymentReturn: id } } as never)} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={s.back} onPress={() => router.back()}><Text style={s.backText}>‹</Text></Pressable><Text style={s.headerTitle}>Thanh toán xác minh</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}><Text style={s.kicker}>BƯỚC 03 · THANH TOÁN</Text><Text style={s.title}>Hoàn tất đăng ký cấp 2</Text><Text style={s.heroText}>Chọn gói → Giữ lịch → Thanh toán → Xác minh</Text></View>
      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Text style={s.small}>Dữ liệu đang hiển thị có thể chưa được cập nhật. Kiểm tra lại trước khi thanh toán.</Text></View>}
      {loading && <Text accessibilityRole="progressbar" style={s.small}>Đang kiểm tra trạng thái từ hệ thống…</Text>}
      {snapshot && presentation && <>
        <View style={s.card}><Text accessibilityRole="header" style={s.heading}>{presentation.title}</Text><Text style={s.body}>{presentation.message}</Text>
          {transaction?.status === 0 && !link && <Text style={s.notice}>Checkout chưa có đường dẫn khả dụng, đã hết hạn hoặc đang cần đối soát. Hãy kiểm tra trạng thái; không tạo thêm giao dịch khi giao dịch cũ đang chờ.</Text>}
          {transaction?.paidAt && transaction.status === 1 && <Text style={s.small}>Backend ghi nhận lúc: {date(transaction.paidAt)}</Text>}
        </View>
        <View style={s.card}><Text style={s.heading}>Chi tiết thanh toán</Text><Text style={s.body}>{snapshot.packageData?.name || 'Gói xác minh chuyên viên'}</Text><Text style={s.small}>{transaction ? 'Số tiền trên giao dịch' : 'Giá gói hiện tại · xác nhận lại khi tạo checkout'}</Text><Text style={s.amount}>{amount != null ? money(amount) : 'Chưa có số tiền'}</Text>
          {detail?.verification.scheduledStartAt && <Text style={s.body}>Lịch hẹn: {date(detail.verification.scheduledStartAt)}{detail.verification.scheduledEndAt ? ` – ${date(detail.verification.scheduledEndAt)}` : ''}{'\n'}Giờ Việt Nam (UTC+7)</Text>}
          {remaining > 0 && <><Text style={s.small}>Thời gian giữ lịch còn lại</Text><Text style={s.countdown}>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</Text></>}
          {transaction?.expiredAt && <Text style={s.small}>Hạn checkout: {date(transaction.expiredAt)} (giờ Việt Nam, UTC+7)</Text>}
        </View>
        {transaction?.status !== 1 && !transaction?.requiresReview && !transaction?.reconciliationRequired && <View style={s.card}><Text style={s.heading}>Thanh toán qua PayOS</Text>
          {qrPayload ? <><Text style={s.body}>Mở ứng dụng ngân hàng và quét mã QR để thanh toán đúng số tiền của giao dịch này.</Text><PaymentQrCode value={qrPayload} /><Text style={s.small}>Trạng thái thanh toán sẽ tự cập nhật sau khi hệ thống ghi nhận giao dịch. Bạn cũng có thể mở PayOS bằng nút bên dưới.</Text></>
            : <Text style={s.body}>{!transaction && canCreate ? 'Chọn “Tạo mã QR thanh toán” bên dưới để tạo giao dịch và hiển thị mã QR.' : link ? 'Giao dịch này chưa có dữ liệu QR. Chọn “Mở PayOS để thanh toán” bên dưới để xem mã QR trên PayOS.' : 'Mã QR chỉ hiển thị khi giao dịch đang chờ thanh toán và lịch giữ còn hiệu lực. Kiểm tra trạng thái để nhận kết quả mới nhất.'}</Text>}
          <Text style={s.small}>Thanh toán thành công chưa phải kết quả đạt xác minh cấp 2.</Text></View>}
      </>}
      <Button title="Kiểm tra trạng thái" variant="outline" onPress={refresh} disabled={busy || loading} />
      {detail && <Button title="Xem hồ sơ và kết quả cấp 2" variant="outline" disabled={busy} onPress={() => router.push({ pathname: '/group/verification-dossier/[id]', params: { id: detail.verification.id } } as never)} />}
      <Button title="Quay lại lịch và hồ sơ" variant="outline" onPress={backToBooking} disabled={busy} />
    </ScrollView>
    {(link || canCreate) && <View style={s.footer}><Button title={link ? 'Mở PayOS để thanh toán' : transaction?.status === 2 ? 'Tạo mã QR để thử lại' : 'Tạo mã QR thanh toán'} onPress={link ? openPayment : createCheckout} loading={busy} disabled={loading || !!error || amount == null} /></View>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, back: { minWidth: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 34, color: colors.primary }, headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  content: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 32 }, hero: { backgroundColor: '#F0F4F8', borderRadius: 24, padding: 20, gap: 12 }, kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.4, fontWeight: '700' }, title: { fontSize: 28, lineHeight: 36, fontWeight: '800', color: colors.navy }, heroText: { fontSize: 15, lineHeight: 24, color: colors.textSecondary }, card: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, padding: 22, gap: 14 }, heading: { color: colors.navy, fontSize: 18, lineHeight: 27, fontWeight: '700' }, body: { color: colors.textPrimary, fontSize: 16, lineHeight: 25 }, small: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 }, amount: { color: colors.primary, fontSize: 32, fontWeight: '800' }, countdown: { color: colors.navy, fontSize: 24, fontWeight: '700' }, notice: { backgroundColor: colors.primaryLight, padding: 16, borderRadius: 12, color: colors.navy, fontSize: 15, lineHeight: 24 }, error: { color: colors.error, fontSize: 16, lineHeight: 24 }, footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
});
