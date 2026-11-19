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
import { canCreateCheckout, checkoutLink, paymentPresentation, paymentQrPayload } from '@/utils/verification-payment';
import { canChooseMeeting, holdSeconds } from '@/utils/verification-booking';
import { rememberPayment } from '@/utils/payment-return';
import { Loading } from '@/components/ui/Loading';

const theme = {
  ink: '#111A36',
  canvas: '#F8FAFE',
  line: '#E2E8F3',
  blueWash: '#EAF1FF',
  primary: '#1252FF',
  success: '#198046',
  successBg: '#E6F7EC',
  warningBg: '#FFF8EE',
  warningBorder: '#FBE2B5',
  warningText: '#8A4F0E',
  dangerBg: '#FFF2F2',
  dangerText: '#D64A4A',
};

function CheckoutIcon({ name, size = 18, color = theme.primary }: { name: string; size?: number; color?: string }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoSymbols = require('expo-symbols');
    const SymbolView = expoSymbols?.SymbolView;
    if (typeof SymbolView === 'function' || typeof SymbolView === 'object') {
      const iosMap: Record<string, string> = {
        calendar: 'calendar',
        clock: 'clock',
        check: 'checkmark.circle',
        qrcode: 'qrcode',
        info: 'info.circle',
        refresh: 'arrow.clockwise',
      };
      return <SymbolView name={{ ios: iosMap[name] || name, android: name, web: name }} size={size} tintColor={color} />;
    }
  } catch {
    // Graceful fallback when expo-symbols is unavailable or mocked
  }
  return null;
}

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
  const wide = width >= 840;
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
  const bookingProjectId = projectId || detail?.verification.projectId || detail?.project?.id;
  const backToBooking = () => { if (bookingProjectId) router.dismissTo({ pathname: '/group/verification/[id]', params: { id: bookingProjectId } } as never); };

  if (restoring) return <Loading />;
  if (!isAuthenticated) return <SafeAreaView style={s.safe}><View style={s.content}><Text style={s.heading}>Đăng nhập để kiểm tra thanh toán</Text><Button title="Đăng nhập" onPress={() => router.push({ pathname: '/(auth)/login', params: { paymentReturn: id } } as never)} /></View></SafeAreaView>;

  const paid = !!detail && (transaction?.status === 1 || detail.payments.some(payment => payment.status === 1));
  const amount = paid
    ? (transaction?.status === 1 ? transaction.amountVnd : detail?.payments.find(payment => payment.status === 1)?.amount)
    : transaction?.amountVnd ?? snapshot?.packageData?.price;
  const requiresReview = transaction?.requiresReview || transaction?.reconciliationRequired ||
    detail?.payments.some(payment => payment.requiresManualReview);
  const showPayOS = !!snapshot && !paid && !requiresReview;
  const paymentAction = link || canCreate;

  return <SafeAreaView style={s.safe}>
    <DetailNavigation title="Thẩm định dự án" projectId={detail?.verification.projectId || projectId} />
    <ScrollView contentContainerStyle={[s.content, wide && s.contentWide]}>
      <View style={s.hero}>
        <View accessible={false} style={s.heroRing} />
        <View style={s.steps}>
          <Text style={s.step}>✓ Phí dịch vụ</Text>
          <Text style={s.step}>{remaining > 0 || detail?.verification.bookingStatus === 2 ? '✓ Lịch hẹn' : 'Lịch hẹn'}</Text>
          <Text style={s.stepActive}>Thanh toán</Text>
        </View>
        <Text accessibilityRole="header" style={s.title}>{paid ? 'Thanh toán đã được ghi nhận' : 'Thanh toán phí thẩm định'}</Text>
        <Text style={s.heroText}>{projectTitle || detail?.project?.title || detail?.verification.projectTitle || 'Thẩm định dự án với chuyên viên'}</Text>
      </View>

      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {loading && !snapshot && <Text accessibilityRole="progressbar" style={s.small}>Đang kiểm tra trạng thái thanh toán…</Text>}

      {snapshot && presentation && <View style={[s.grid, wide && s.gridWide]}>
        <View style={[s.summary, wide && s.summaryWide]}>
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

            {onEditSchedule && !paid && <Button title="Đổi lịch hẹn" variant="outline" disabled={busy || loading || !!error || !(detail && canChooseMeeting(detail))} onPress={onEditSchedule} />}
          </View>
        </View>

        <View style={[s.card, wide && s.paymentWide]}>
          <View style={[s.status, requiresReview ? s.statusReview : paid && detail?.verification.bookingStatus === 2 ? s.statusPaid : null]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckoutIcon name={paid ? 'check' : requiresReview ? 'info' : 'clock'} size={18} color={paid ? theme.success : requiresReview ? theme.warningText : theme.primary} />
              <Text accessibilityRole="header" style={s.heading}>{presentation.title}</Text>
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

            {paymentAction && <Button title={link ? 'Mở PayOS' : transaction?.status === 2 ? 'Tạo mã QR để thử lại' : 'Tạo mã QR thanh toán'} onPress={link ? openPayment : createCheckout} loading={busy} disabled={loading || !!error || amount == null} />}
          </View>}

          {detail && <Button title="Xem hồ sơ thẩm định" variant={paid ? 'primary' : 'outline'} disabled={busy} onPress={() => router.push({ pathname: '/group/verification-dossier/[id]', params: { id: detail.verification.id } } as never)} />}
          <Button title="Kiểm tra trạng thái" variant="outline" onPress={refresh} disabled={busy || loading} />
        </View>
      </View>}

      {!snapshot && !loading && <Button title="Tải lại trạng thái" variant="outline" onPress={refresh} disabled={busy} />}
      {!embedded && bookingProjectId && <Button title="Về trang đăng ký thẩm định" variant="outline" onPress={backToBooking} disabled={busy} />}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.canvas },
  content: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  contentWide: {
    padding: 28,
    gap: 20,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    boxShadow: '0 4px 18px rgba(17, 26, 54, 0.04)',
    overflow: 'hidden',
    position: 'relative',
  },
  heroRing: {
    display: 'none',
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  step: {
    color: '#64748B',
    backgroundColor: '#F0F4FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  stepActive: {
    color: '#FFFFFF',
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
    boxShadow: '0 2px 6px rgba(18, 82, 255, 0.25)',
  },
  title: {
    color: '#111A36',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroText: {
    color: '#52617E',
    fontSize: 14,
    lineHeight: 22,
  },
  grid: {
    gap: 16,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summary: {
    minWidth: 0,
  },
  summaryWide: {
    flex: 2,
  },
  paymentWide: {
    flex: 3,
  },
  card: {
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 14,
    boxShadow: '0 2px 10px rgba(17, 26, 54, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emblem: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: '#111A36',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  body: {
    color: '#14233B',
    fontSize: 14,
    lineHeight: 22,
  },
  small: {
    color: '#52617E',
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '600',
  },
  amount: {
    color: theme.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF1FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgePillText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
    paddingTop: 12,
    gap: 6,
  },
  timer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: theme.warningBg,
    borderWidth: 1,
    borderColor: theme.warningBorder,
    padding: 12,
    borderRadius: 10,
  },
  countdown: {
    color: theme.warningText,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  status: {
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statusPaid: {
    backgroundColor: theme.successBg,
    borderColor: '#BBE4CA',
  },
  statusReview: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warningBorder,
  },
  method: {
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
    paddingTop: 12,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 14,
  },
  qr: {
    alignSelf: 'center',
    maxWidth: '100%',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  notice: {
    backgroundColor: '#EAF1FF',
    borderLeftWidth: 3,
    borderColor: theme.primary,
    padding: 14,
    borderRadius: 10,
    color: '#111A36',
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    color: '#D64A4A',
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FAD7D7',
    padding: 14,
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 21,
  },
});
