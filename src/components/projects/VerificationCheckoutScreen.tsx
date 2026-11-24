import { HubIcon as CheckoutIcon } from './hub/ProjectHubUI';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { verificationDate as date } from '@/utils/verification-date';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { canCreateCheckout, canRenewExpiredCheckout, checkoutLink, paymentPresentation, paymentQrPayload } from '@/utils/verification-payment';
import { canChooseMeeting, holdSeconds } from '@/utils/verification-booking';
import { rememberPayment } from '@/utils/payment-return';
import { Loading } from '@/components/ui/Loading';

const theme = {
  ink: '#111A36',
  canvas: '#F8FAFE',
  line: '#E2E8F3',
  blueWash: '#EAF1FF',
  primary: colors.primary,
  success: '#198046',
  successBg: '#E6F7EC',
  warningBg: '#FFF8EE',
  warningBorder: '#FBE2B5',
  warningText: '#8A4F0E',
  dangerBg: '#FFF2F2',
  dangerText: '#D64A4A',
};



type Snapshot = Awaited<ReturnType<typeof loadVerificationCheckout>>;
const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

function errorText(cause: unknown) {
  const code = cause instanceof ApiError ? cause.code : '';
  if (cause instanceof ApiError && cause.status === 403) return 'Bạn không có quyền xem hoặc thanh toán hồ sơ này.';
  if (code === 'RESERVATION_REQUIRED') return 'Lịch giữ đã hết hạn hoặc chưa được xác nhận. Vui lòng kiểm tra lại hồ sơ và chọn lịch.';
  if (code === 'VERIFICATION_ALREADY_PAID') return 'Hồ sơ đã có thanh toán thành công. Đang tải lại trạng thái.';
  if (code === 'PAYMENT_RECONCILIATION_REQUIRED') return 'Giao dịch cũ cần đối soát trước khi thanh toán tiếp.';
  if (code === 'PAYMENT_NOT_CONFIGURED' || code === 'PAYOS_NOT_CONFIGURED') return 'Dịch vụ thanh toán chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
  if (code === 'INVALID_VERIFICATION_PACKAGE' || code === 'INVALID_PAYMENT_AMOUNT') return 'Gói hiện chưa thể thanh toán. Vui lòng kiểm tra lại hồ sơ hoặc liên hệ hỗ trợ.';
  if (code === 'MEETING_SLOT_UNAVAILABLE' || code === 'INVALID_MEETING_SLOT') return 'Khung giờ cũ không còn khả dụng. Vui lòng chọn lại lịch thẩm định.';
  if (code === 'RECONCILIATION_DISABLED') return 'Chưa thể kiểm tra giao dịch cũ. Vui lòng chờ hệ thống cập nhật rồi thử lại.';
  return cause instanceof Error ? cause.message : 'Không thể tải trạng thái thanh toán. Vui lòng thử lại.';
}

type CheckoutProps = {
  verificationId?: string;
  returnProjectId?: string;
  projectTitle?: string;
  embedded?: boolean;
  onEditSchedule?: () => void;
};

export function VerificationCheckoutScreen({ verificationId, returnProjectId, projectTitle, embedded, onEditSchedule }: CheckoutProps = {}) {
  const params = useLocalSearchParams<{ id: string; projectId?: string }>();
  const id = verificationId ?? params.id;
  const projectId = returnProjectId ?? params.projectId;
  const { account, isLoading: restoring, isAuthenticated } = useAuthStore();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const buttonStyle = { ...s.compactButton, minHeight: wide ? 36 : 44 };
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
  const automaticAttempts = useRef(new Set<string>());
  const refresh = () => setRevision(v => v + 1);

  useFocusEffect(useCallback(() => {
    if (restoring || !isAuthenticated || !account) return;
    const accountId = account.id;
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
        let result = await loadVerificationCheckout(id ?? '', controller.signal);
        if (controller.signal.aborted) return;
        const attemptKey = `${accountId}:${id}:${result.detail.verification.reservedUntil}`;
        if (!result.transaction && result.detail.payments.length === 0 &&
          canCreateCheckout(result.detail, null, Date.now()) && !automaticAttempts.current.has(attemptKey)) {
          automaticAttempts.current.add(attemptKey);
          try {
            await payments.create(id, false);
            if (controller.signal.aborted) return;
            result = await loadVerificationCheckout(id, controller.signal);
            if (controller.signal.aborted) return;
          } catch (cause) {
            if (controller.signal.aborted) return;
            // A timeout can still have created a payment. Read it before offering retry.
            result = await loadVerificationCheckout(id, controller.signal);
            if (controller.signal.aborted) return;
            if (!paymentQrPayload(result.transaction, result.detail, Date.now())) {
              setNotice(`${errorText(cause)} Không thể tự chuẩn bị mã QR. Bạn có thể kiểm tra trạng thái hoặc thử lại.`);
            }
          }
        }
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

  async function renewCheckout() {
    if (lock.current || loading || error || !snapshot || !canRenewExpiredCheckout(snapshot.detail, snapshot.transaction, Date.now())) return;
    lock.current = true; setBusy(true); setNotice(null);
    const current = generation.current;
    const isCurrent = () => active.current && current === generation.current;
    try {
      let latest = await loadVerificationCheckout(id);
      if (!isCurrent()) return;
      setSnapshot(latest);
      if (canRenewExpiredCheckout(latest.detail, latest.transaction, Date.now())) {
        await payments.renew(id);
        if (!isCurrent()) return;
        latest = await loadVerificationCheckout(id);
        if (!isCurrent()) return;
        setSnapshot(latest); setNow(Date.now());
        if (canRenewExpiredCheckout(latest.detail, latest.transaction, Date.now()))
          setNotice('Giao dịch cũ đang được kiểm tra. Vui lòng chờ cập nhật rồi bấm “Tạo lại mã QR”.');
      }
    } catch (cause) { if (isCurrent()) setNotice(errorText(cause)); }
    finally {
      lock.current = false;
      if (isCurrent()) { setBusy(false); await refreshRef.current(); }
    }
  }

  const detail = snapshot?.detail;
  const transaction = snapshot?.transaction ?? null;
  const remaining = detail ? holdSeconds(detail, now) : 0;
  const presentation = detail ? paymentPresentation(detail, transaction, now) : null;
  const link = detail ? checkoutLink(transaction, detail, now) : null;
  const qrPayload = detail && !error ? paymentQrPayload(transaction, detail, now) : null;
  const canCreate = !!snapshot && canCreateCheckout(snapshot.detail, transaction, now);
  const canRenew = !!detail && canRenewExpiredCheckout(detail, transaction, now);
  const bookingProjectId = projectId || detail?.verification.projectId || detail?.project?.id;
  const backToBooking = () => { if (bookingProjectId) router.dismissTo({ pathname: '/group/verification/[id]', params: { id: bookingProjectId } } as never); };

  if (restoring) return <Loading />;
  if (!isAuthenticated) return <SafeAreaView style={s.safe}><View style={s.content}><Text style={s.heading}>Đăng nhập để kiểm tra thanh toán</Text><Button style={buttonStyle} textStyle={s.buttonText} title="Đăng nhập" onPress={() => router.push({ pathname: '/(auth)/login', params: { paymentReturn: id } } as never)} /></View></SafeAreaView>;

  const paid = !!detail && (transaction?.status === 1 || detail.payments.some(payment => payment.status === 1));
  const amount = paid
    ? (transaction?.status === 1 ? transaction.amountVnd : detail?.payments.find(payment => payment.status === 1)?.amount)
    : transaction?.amountVnd ?? snapshot?.packageData?.price;
  const requiresReview = transaction?.requiresReview || transaction?.reconciliationRequired ||
    detail?.payments.some(payment => payment.requiresManualReview);
  const showPayOS = !!snapshot && !paid && !requiresReview;
  const paymentAction = link || canCreate || canRenew;

  return <SafeAreaView style={s.safe}>
    <DetailNavigation title="Thanh toán thẩm định" projectId={bookingProjectId} crumbs={[{ label: 'Dự án của tôi', href: '/profile/projects' }, { label: 'Chi tiết dự án', href: bookingProjectId ? `/group/${encodeURIComponent(bookingProjectId)}` : undefined }, { label: 'Thanh toán thẩm định' }]} />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text accessibilityRole="header" style={s.title}>{paid ? 'Thanh toán đã được ghi nhận' : 'Thanh toán phí thẩm định'}</Text>
        <Text style={s.heroText}>{projectTitle || detail?.project?.title || detail?.verification.projectTitle || 'Thẩm định dự án với chuyên viên'}</Text>
        <Text style={s.heroDescription}>Kiểm tra lịch hẹn và hoàn tất thanh toán phí dịch vụ.</Text>
        <View style={s.steps}>
          <Text style={s.step}>✓ Dịch vụ</Text>
          <Text style={s.step}>{remaining > 0 || detail?.verification.bookingStatus === 2 ? '✓ Chọn lịch' : '2. Chọn lịch'}</Text>
          <Text style={s.stepActive}>3. Thanh toán</Text>
        </View>
      </View>

      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {loading && !snapshot && <Text accessibilityRole="progressbar" style={s.small}>Đang kiểm tra giao dịch và chuẩn bị mã QR…</Text>}

      {snapshot && presentation && <View style={[s.grid, wide && s.gridWide]}>
        <View role="region" accessibilityLabel="Thanh toán thẩm định" style={[s.card, wide && s.paymentWide]}>
          <View style={[s.status, requiresReview ? s.statusReview : paid && detail?.verification.bookingStatus === 2 ? s.statusPaid : null]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckoutIcon name={paid ? 'check' : requiresReview ? 'info' : 'clock'} size={18} color={paid ? theme.success : requiresReview ? theme.warningText : theme.primary} />
              <Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>{presentation.title}</Text>
            </View>
            <Text style={s.body}>{presentation.message}</Text>
            {transaction?.paidAt && paid && <Text style={s.small}>Ghi nhận lúc {date(transaction.paidAt)}</Text>}
          </View>

          {showPayOS && <View style={s.method}>
            <View style={s.cardHeaderRow}>
              <View style={s.emblem}><CheckoutIcon name="qrcode" size={18} color={theme.primary} /></View>
              <Text style={s.heading}>Thanh toán qua PayOS</Text>
            </View>
            {qrPayload ? <>
              <Text style={s.body}>Quét mã QR bằng ứng dụng ngân hàng.</Text>
              <View style={s.qrWrapper}>
                <View style={s.qr}><PaymentQrCode value={qrPayload} /></View>
              </View>
            </> : <Text style={s.body}>{canCreate ? 'Tạo mã QR để thanh toán.' : link ? 'Mở PayOS để xem mã QR.' : 'Mã QR hiện chưa khả dụng. Bạn có thể kiểm tra lại trạng thái giao dịch.'}</Text>}

            {transaction?.status === 0 && transaction.expiredAt && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckoutIcon name="clock" size={14} color={colors.textSecondary} />
                <Text style={s.small}>Hạn thanh toán {date(transaction.expiredAt)} (giờ Việt Nam)</Text>
              </View>
            )}

            {paymentAction && <Button style={buttonStyle} textStyle={s.buttonText} title={canRenew ? 'Tạo lại mã QR' : link ? 'Mở PayOS' : transaction?.status === 2 ? 'Tạo mã QR để thử lại' : 'Tạo mã QR thanh toán'} onPress={canRenew ? renewCheckout : link ? openPayment : createCheckout} loading={busy} disabled={loading || !!error || amount == null} />}
          </View>}

        </View>
        <View role="region" accessibilityLabel="Tóm tắt thanh toán" style={[s.summary, wide && s.summaryWide]}>
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.emblem}><CheckoutIcon name="tag" size={18} color={theme.primary} /></View>
              <Text style={s.label}>{paid ? 'Số tiền đã thanh toán' : 'Số tiền thanh toán'}</Text>
            </View>
            <Text style={s.amount}>{amount != null ? money(amount) : 'Chưa có số tiền'}</Text>
            <View style={s.badgePill}>
              <Text style={s.badgePillText}>{snapshot.packageData?.name || 'Gói thẩm định chuyên viên'}</Text>
            </View>

            {detail?.verification.scheduledStartAt && <View style={s.divider}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckoutIcon name="calendar" size={16} color={theme.primary} />
                <Text style={s.label}>Lịch hẹn · Giờ Việt Nam</Text>
              </View>
              <Text style={s.body}>{date(detail.verification.scheduledStartAt)}{detail.verification.scheduledEndAt ? ` – ${date(detail.verification.scheduledEndAt)}` : ''}</Text>
            </View>}

            {!paid && remaining > 0 && <View style={s.timer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckoutIcon name="clock" size={16} color={theme.warningText} />
                <Text style={s.small}>Giữ lịch còn</Text>
              </View>
              <Text style={s.countdown}>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</Text>
            </View>}

            {(onEditSchedule || canRenew) && !paid && <Button style={buttonStyle} textStyle={s.buttonText} title={canRenew ? 'Chọn lại lịch' : 'Đổi lịch hẹn'} variant="outline" disabled={busy || loading || !!error || !(detail && canChooseMeeting(detail))} onPress={onEditSchedule || backToBooking} />}
            <View style={s.secondaryActions}>
              {detail && <Button style={{ ...buttonStyle, flex: 1 }} textStyle={s.buttonText} title="Xem hồ sơ" accessibilityLabel="Xem hồ sơ thẩm định" leadingIcon={<CheckoutIcon name="document" size={14} color={paid ? '#FFFFFF' : theme.primary} />} variant={paid ? 'primary' : 'outline'} disabled={busy} onPress={() => router.push({ pathname: '/group/verification-dossier/[id]', params: { id: detail.verification.id } } as never)} />}
              <Button style={{ ...buttonStyle, flex: 1 }} textStyle={s.buttonText} title="Kiểm tra" accessibilityLabel="Kiểm tra trạng thái" leadingIcon={<CheckoutIcon name="refresh" size={14} />} variant="outline" onPress={refresh} disabled={busy || loading} />
            </View>
          </View>
        </View>

      </View>}

      {!snapshot && !loading && <Button style={buttonStyle} textStyle={s.buttonText} title="Tải lại trạng thái" variant="outline" onPress={refresh} disabled={busy} />}
      {!embedded && bookingProjectId && <Button style={buttonStyle} textStyle={s.buttonText} title="Về trang đăng ký thẩm định" variant="outline" onPress={backToBooking} disabled={busy} />}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.canvas },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 16, gap: 14, paddingBottom: 28 },
  hero: { paddingVertical: 4, gap: 6 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: theme.ink, letterSpacing: -0.3 },
  heroText: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  heroDescription: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  steps: { flexDirection: 'row', gap: 8, marginTop: 8 },
  step: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#64748B', backgroundColor: '#F0F4FA', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 7 },
  stepActive: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#FFFFFF', backgroundColor: theme.primary, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 7 },
  grid: { gap: 12, minWidth: 0 }, gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  summary: { minWidth: 0 }, summaryWide: { width: 280 }, paymentWide: { flex: 1 },
  card: { minWidth: 0, borderWidth: 1, borderColor: theme.line, borderRadius: 9, backgroundColor: '#FFFFFF', padding: 12, gap: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emblem: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.blueWash, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: theme.ink, flexShrink: 1 },
  body: { fontSize: 12, lineHeight: 19, color: colors.textPrimary, flexShrink: 1 },
  small: { fontSize: 12, lineHeight: 19, color: colors.textSecondary, flexShrink: 1 },
  label: { fontSize: 12, lineHeight: 19, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: theme.primary },
  badgePill: { alignSelf: 'flex-start', backgroundColor: theme.blueWash, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, maxWidth: '100%' },
  badgePillText: { fontSize: 12, lineHeight: 19, fontWeight: '500', color: theme.primary },
  divider: { borderTopWidth: 1, borderColor: theme.line, paddingTop: 10, gap: 5 },
  timer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: theme.warningBg, borderWidth: 1, borderColor: theme.warningBorder, padding: 8, borderRadius: 6 },
  countdown: { fontSize: 17, fontWeight: '700', color: theme.warningText, fontVariant: ['tabular-nums'] },
  status: { gap: 6 },
  statusPaid: { backgroundColor: theme.successBg, borderWidth: 1, borderColor: '#BBE4CA', borderRadius: 6, padding: 10 }, statusReview: { backgroundColor: theme.warningBg, borderWidth: 1, borderColor: theme.warningBorder, borderRadius: 6, padding: 10 },
  method: { gap: 10, borderTopWidth: 1, borderColor: theme.line, paddingTop: 10 },
  qrWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  qr: { alignSelf: 'center', maxWidth: '100%', padding: 6, backgroundColor: '#FFFFFF', borderRadius: 6 },
  compactButton: { minHeight: 44, borderRadius: 6, paddingHorizontal: 8 }, buttonText: { fontSize: 12, fontWeight: '600' },
  secondaryActions: { flexDirection: 'row', gap: 8 },
  notice: { backgroundColor: theme.blueWash, borderLeftWidth: 3, borderColor: theme.primary, padding: 12, borderRadius: 8, color: theme.ink, fontSize: 12, lineHeight: 19 },
  error: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderWidth: 1, borderColor: '#FAD7D7', padding: 12, borderRadius: 8, fontSize: 12, lineHeight: 19 },
});
