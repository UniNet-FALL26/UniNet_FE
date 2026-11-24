import { VerificationBookingIcon as BookingIcon } from './VerificationBookingIcon';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { verificationDate, VERIFICATION_TIME_ZONE, VERIFICATION_TIME_LABEL } from '@/utils/verification-date';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { projectService } from '@/services/project.service';
import { projectVerificationService as service } from '@/services/project-verification.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { ApiProjectStatus } from '@/types/project';
import type { MeetingSlot, MeetingSlots, VerificationDetail, VerificationPackage } from '@/types/project-verification';
import { canChooseMeeting, holdSeconds, slotDate, slotTime } from '@/utils/verification-booking';
import { level2Label } from '@/utils/project-verification';
import { VerificationCheckoutScreen } from './VerificationCheckoutScreen';
import { VerificationRegistrationPanel } from './VerificationRegistrationPanel';

const theme = {
  ink: '#111A36',
  canvas: '#F8FAFE',
  line: '#E2E8F3',
  blueWash: '#EAF1FF',
  primary: colors.primary,
  success: '#198046',
  warningText: '#8A4F0E',
  error: '#D64A4A',
};



const errorMessage = (cause: unknown) => {
  const code = cause instanceof ApiError ? cause.code : '';
  if (code === 'MEETING_SLOT_UNAVAILABLE') return 'Khung giờ vừa hết chỗ hoặc trùng lịch. Vui lòng chọn khung giờ khác.';
  if (code === 'PAYMENT_PENDING') return 'Giao dịch đang chờ xử lý. Chưa thể đổi hoặc giữ lại lịch.';
  if (code === 'BOOKING_ALREADY_PAID') return 'Hồ sơ đã thanh toán, không thể đổi lịch.';
  if (code === 'MEETING_CONFLICT' || code === 'VERIFICATION_CONFLICT') return 'Hồ sơ vừa thay đổi. Vui lòng kiểm tra trạng thái mới trước khi tiếp tục.';
  return cause instanceof Error ? cause.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';
};

export function VerificationBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useAuthStore();
  const wide = useWindowDimensions().width >= 900;
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [packages, setPackages] = useState<VerificationPackage[]>([]);
  const [packagePage, setPackagePage] = useState(1);
  const [packagePages, setPackagePages] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [slots, setSlots] = useState<MeetingSlots | null>(null);
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [editingSlotFor, setEditingSlotFor] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const uncertain = useRef(false);
  const reload = () => setRevision(v => v + 1);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setLoading(true); setError(null); setSelectedSlot(null);
    async function load() {
      const project = await projectService.getProjectById(id ?? '', controller.signal);
      if (!project.isCreator || project.status !== ApiProjectStatus.Completed) throw new Error('Chỉ người tạo dự án đã hoàn thành có thể đăng ký thẩm định.');
      const pending = await service.list(project.id, true, controller.signal);
      const resumed = pending.verifications[0] ? await service.detail(pending.verifications[0].id, controller.signal) : null;
      if (controller.signal.aborted) return;
      setTitle(project.title); setDetail(resumed);
      if (resumed) {
        const hasPayment = holdSeconds(resumed, Date.now()) > 0 || resumed.payments.length > 0;
        if (!canChooseMeeting(resumed) || (hasPayment && editingSlotFor !== resumed.verification.id)) {
          setSlots(null);
          uncertain.current = false;
          return;
        }
        const from = new Date(Date.now() + week * 7 * 86400000);
        const result = await service.slots(resumed.verification.id, from.toISOString(), new Date(from.getTime() + 7 * 86400000).toISOString(), controller.signal);
        slotDate(new Date().toISOString(), VERIFICATION_TIME_ZONE);
        if (!controller.signal.aborted) {
          setSlots(result);
          setDay(previous => result.slots.some(s => slotDate(s.startAt, VERIFICATION_TIME_ZONE) === previous) ? previous : result.slots[0] ? slotDate(result.slots[0].startAt, VERIFICATION_TIME_ZONE) : '');
        }
      } else {
        const result = await service.packages(packagePage, controller.signal);
        if (!controller.signal.aborted) {
          const available = result.packages.filter(p => p.isActive && p.type === 0 && p.role === 0);
          setPackages(available);
          setSelectedPackage(previous => available.some(p => p.id === previous) ? previous : available.length === 1 && result.totalPages === 1 ? available[0].id : null);
          setPackagePages(result.totalPages);
        }
      }
      uncertain.current = false;
    }
    void load().catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') setNow(Date.now()); }, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); } });
    return () => { controller.abort(); generation.current = current + 1; clearInterval(timer); subscription.remove(); };
  }, [id, account?.id, week, packagePage, revision, editingSlotFor]));

  const remaining = detail ? holdSeconds(detail, now) : 0;
  const expired = detail?.verification.bookingStatus === 1 && remaining === 0;
  useEffect(() => { if (expired) reload(); }, [expired]);
  const choosing = detail && canChooseMeeting(detail);
  const held = !!detail && remaining > 0;

  async function submit() {
    if (lock.current || loading || error || uncertain.current) return;
    if ((!detail && !selectedPackage) || (detail && (!selectedSlot || !canChooseMeeting(detail)))) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    const current = generation.current;
    try {
      const pending = await service.list(id, true);
      let result: VerificationDetail;
      if (!detail) result = pending.verifications[0] ? await service.detail(pending.verifications[0].id) : await service.create(id, selectedPackage!);
      else result = await service.hold(detail.verification.id, selectedSlot!);
      if (current === generation.current) {
        setDetail(result);
        setEditingSlotFor(null);
        setSelectedSlot(null);
        setNotice(detail ? 'Đã giữ lịch. Thời hạn được xác nhận bởi hệ thống.' : null);
        reload();
      }
    } catch (cause) {
      uncertain.current = true;
      if (current === generation.current) {
        setNotice(errorMessage(cause));
        reload();
      }
    } finally { lock.current = false; setBusy(false); }
  }

  const dates = slots ? [...new Set(slots.slots.map(s => slotDate(s.startAt, VERIFICATION_TIME_ZONE)))] : [];
  const hasPaymentStep = detail && (held || detail.payments.length > 0);
  if (hasPaymentStep && !error && (!choosing || editingSlotFor !== detail.verification.id)) {
    return <VerificationCheckoutScreen
      key={`${account?.id}:${detail.verification.id}`}
      verificationId={detail.verification.id}
      returnProjectId={id}
      projectTitle={title}
      embedded
      onEditSchedule={() => setEditingSlotFor(detail.verification.id)}
    />;
  }

  return <SafeAreaView style={s.safe}>
    <DetailNavigation title={detail ? 'Chọn lịch thẩm định' : 'Đăng ký thẩm định dự án'} crumbs={[{ label: 'Dự án của tôi', href: '/profile/projects' }, { label: 'Chi tiết dự án', href: `/group/${encodeURIComponent(id ?? '')}` }, { label: detail ? 'Chọn lịch thẩm định' : 'Đăng ký thẩm định dự án' }]} />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text accessibilityRole="header" style={s.title}>{detail ? 'Chọn lịch thẩm định' : 'Đăng ký thẩm định dự án'}</Text>
        {!!title && <Text style={s.heroText}>{title}</Text>}
        <Text style={s.heroDescription}>{detail ? 'Chọn khung giờ phù hợp để trao đổi với chuyên viên.' : 'Đăng ký dịch vụ để dự án được chuyên viên xem xét và đánh giá.'}</Text>
        <View style={s.steps}>
          <Text style={detail ? s.step : s.stepActive}>{detail ? '✓ Dịch vụ' : '1. Dịch vụ'}</Text>
          <Text style={detail ? s.stepActive : s.step}>2. Chọn lịch</Text>
          <Text style={s.step}>3. Thanh toán</Text>
        </View>
      </View>

      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button textStyle={s.buttonText} title="Tải lại trạng thái" style={s.compactButton} onPress={reload} /></View>}
      {loading && <Text accessibilityRole="progressbar" style={s.body}>Đang tải dữ liệu mới nhất…</Text>}

      {!loading && !error && !detail && <VerificationRegistrationPanel title={title} packages={packages} selectedPackage={selectedPackage} onSelect={setSelectedPackage} page={packagePage} pages={packagePages} onPage={page => { setSelectedPackage(null); setPackagePage(page); }} />}

      {!loading && !error && detail && <View testID="verification-schedule" style={[s.scheduleLayout, choosing && wide && s.scheduleWide]}>
        {choosing && <>
          <View role="region" accessibilityLabel="Lịch hẹn thẩm định" style={[s.card, s.calendar]}>
            <View style={s.cardHeaderRow}>
              <View style={s.emblem}><BookingIcon name="calendar" size={18} color={theme.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.heading}>{held ? 'Đổi khung giờ' : 'Chọn ngày và khung giờ'}</Text>
                <Text style={s.small}>Múi giờ: {VERIFICATION_TIME_LABEL}. Chỉ hiển thị lịch còn chỗ do hệ thống cung cấp.</Text>
              </View>
            </View>

            <View style={s.row}>
              <Button textStyle={s.buttonText} title="Tuần trước" style={{ ...s.compactButton, minHeight: wide ? 36 : 44 }} variant="outline" disabled={week === 0 || busy} onPress={() => setWeek(v => v - 1)} />
              <View style={s.weekBadge}>
                <Text style={s.weekBadgeText}>Tuần {week + 1}</Text>
              </View>
              <Button textStyle={s.buttonText} title="Tuần sau" style={{ ...s.compactButton, minHeight: wide ? 36 : 44 }} variant="outline" disabled={busy} onPress={() => setWeek(v => v + 1)} />
            </View>

            {!dates.length && <Text style={s.notice}>Không còn lịch trống trong khoảng này. Hãy xem tuần khác hoặc làm mới.</Text>}

            {!!dates.length && (
              <View style={s.wrap}>
                {dates.map(d => {
                  const isDaySelected = day === d;
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isDaySelected }}
                      onPress={() => { setDay(d); setSelectedSlot(null); }}
                      style={[s.chip, wide && { minHeight: 36 }, isDaySelected && s.chipSelected]}
                    >
                      <BookingIcon name="calendar" size={14} color={isDaySelected ? '#FFFFFF' : theme.primary} />
                      <Text style={[s.body, isDaySelected && s.chipTextSelected]}>
                        {d.split('-').reverse().join('/')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={s.wrap}>
              {slots?.slots.filter(slot => slotDate(slot.startAt, VERIFICATION_TIME_ZONE) === day && slot.remainingCapacity > 0 && Date.parse(slot.startAt) > now).map(slot => {
                const isSlotSelected = selectedSlot?.startAt === slot.startAt;
                return (
                  <Pressable
                    key={slot.startAt}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSlotSelected }}
                    onPress={() => setSelectedSlot(slot)}
                    style={[s.slot, wide && { width: 148 }, isSlotSelected && s.slotSelected]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BookingIcon name="clock" size={14} color={isSlotSelected ? theme.primary : colors.textSecondary} />
                      <Text style={[s.heading, { fontSize: 13, lineHeight: 18 }]}>
                        {slotTime(slot.startAt, VERIFICATION_TIME_ZONE)} – {slotTime(slot.endAt, VERIFICATION_TIME_ZONE)}
                      </Text>
                    </View>
                    <View style={s.capacityPill}>
                      <Text style={s.capacityText}>Còn {slot.remainingCapacity} chỗ</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedSlot && slots && (
              <View style={s.selectedConfirmation}>
                <BookingIcon name="check" size={18} color={theme.primary} />
                <Text style={[s.notice, { flex: 1, backgroundColor: 'transparent', padding: 0, borderLeftWidth: 0 }]}>
                  Đã chọn {slotTime(selectedSlot.startAt, VERIFICATION_TIME_ZONE)} – {slotTime(selectedSlot.endAt, VERIFICATION_TIME_ZONE)}, ngày {day.split('-').reverse().join('/')} ({VERIFICATION_TIME_LABEL}). Lịch chỉ được giữ sau khi hệ thống xác nhận.
                </Text>
              </View>
            )}
          </View>
        </>}
        {(held || expired || !choosing) && <View role="region" accessibilityLabel="Hồ sơ thẩm định" style={[s.card, choosing && wide && s.scheduleSummary]}>
          <View style={s.cardHeaderRow}>
            <View style={s.emblem}><BookingIcon name="document" size={18} color={theme.primary} /></View>
            <Text style={s.heading}>{level2Label(detail, true)}</Text>
          </View>

          {detail.verification.scheduledStartAt && (
            <View style={s.scheduleInfoBox}>
              <BookingIcon name="calendar" size={18} color={theme.primary} />
              <Text style={s.body}>
                Lịch hẹn: {verificationDate(detail.verification.scheduledStartAt)}{'\n'}{VERIFICATION_TIME_LABEL}
              </Text>
            </View>
          )}

          {held && (
            <View style={s.timerCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BookingIcon name="clock" size={20} color={theme.warningText} />
                <Text style={[s.kickerDark, { color: theme.warningText }]}>THỜI GIAN GIỮ LỊCH CÒN LẠI</Text>
              </View>
              <Text accessibilityLiveRegion="none" style={s.price}>
                {Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={s.small}>Thời gian giữ lịch còn lại. Giữ lịch chưa phải xác nhận thanh toán.</Text>
            </View>
          )}

          {hasPaymentStep && <Button textStyle={s.buttonText} title="Về bước thanh toán" style={s.compactButton} onPress={() => setEditingSlotFor(null)} disabled={busy} />}
          {expired && <Text accessibilityRole="alert" style={s.error}>Đã hết thời gian giữ lịch. Chọn lại khung giờ khi hệ thống cho phép.</Text>}
          {!choosing && <Text style={s.small}>Hồ sơ hiện không cho phép chọn hoặc đổi lịch. Nếu giao dịch đang chờ, cần kiểm tra thanh toán trước khi đặt lại.</Text>}

        </View>}

      </View>}
    </ScrollView>

    {(!detail || choosing) && (
      <View style={s.footer}>
        {detail && <Button title="Quay lại" variant="outline" textStyle={s.buttonText} style={s.compactButton} disabled={busy || loading} leadingIcon={<BookingIcon name="back" size={16} color={colors.textSecondary} />} onPress={() => {
          if (hasPaymentStep) { setEditingSlotFor(null); return; }
          if (router.canGoBack()) router.back();
          else router.replace(`/group/${encodeURIComponent(id ?? '')}` as never);
        }} />}
        <Button textStyle={s.buttonText}
          title={detail ? 'Xác nhận giữ lịch' : 'Tiếp tục chọn lịch'}
          loading={busy}
          disabled={loading || !!error || (detail ? !selectedSlot || Date.parse(selectedSlot.startAt) <= now : !packages.some(p => p.id === selectedPackage))}
          style={s.primaryButton}

          onPress={submit}
        />
      </View>
    )}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.canvas },
  content: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    paddingVertical: 4,
    gap: 6,
  },
  heroDescription: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 7 },
  compactButton: { minHeight: 44, borderRadius: 7, paddingHorizontal: 12 },
  buttonText: { fontSize: 12, fontWeight: '600' },
  scheduleLayout: { gap: 16, minWidth: 0 }, scheduleWide: { flexDirection: 'row', alignItems: 'flex-start' },
  calendar: { flex: 1, minWidth: 0, padding: 12, gap: 10 }, scheduleSummary: { width: 300 },
  steps: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  step: {
    color: '#64748B',
    backgroundColor: '#F0F4FA',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  stepActive: {
    color: '#FFFFFF',
    backgroundColor: theme.primary,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111A36',
    letterSpacing: -0.3,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#52617E',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,

  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: '#F0F3F8',
    paddingBottom: 10,
  },
  emblem: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heading: {
    color: '#111A36',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  body: {
    color: '#14233B',
    fontSize: 12,
    lineHeight: 19,
  },
  small: {
    color: '#52617E',
    fontSize: 12,
    lineHeight: 19,
  },
  kickerDark: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  notice: {
    backgroundColor: '#EAF1FF',
    borderLeftWidth: 3,
    borderColor: theme.primary,
    padding: 12,
    borderRadius: 8,
    color: '#111A36',
    fontSize: 12,
    lineHeight: 19,
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
  scheduleInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    padding: 14,
    borderRadius: 10,
  },
  timerCard: {
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FBE2B5',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  weekBadge: {
    backgroundColor: '#EAF1FF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekBadgeText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,

  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  slot: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    padding: 8,
    gap: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  slotSelected: {
    borderColor: theme.primary,
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
  },
  capacityPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  capacityText: {
    color: '#198046',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EAF1FF',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderColor: theme.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F3',
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
});
