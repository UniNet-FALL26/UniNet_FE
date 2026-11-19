import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { verificationDate, VERIFICATION_TIME_ZONE, VERIFICATION_TIME_LABEL } from '@/utils/verification-date';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const theme = {
  ink: '#111A36',
  canvas: '#F8FAFE',
  line: '#E2E8F3',
  blueWash: '#EAF1FF',
  primary: '#1252FF',
  success: '#198046',
  warningText: '#8A4F0E',
  error: '#D64A4A',
};

function BookingIcon({ name, size = 18, color = theme.primary }: { name: string; size?: number; color?: string }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoSymbols = require('expo-symbols');
    const SymbolView = expoSymbols?.SymbolView;
    if (typeof SymbolView === 'function' || typeof SymbolView === 'object') {
      const iosMap: Record<string, string> = {
        calendar: 'calendar',
        clock: 'clock',
        check: 'checkmark.circle',
        tag: 'tag',
        info: 'info.circle',
        document: 'doc.text',
      };
      return <SymbolView name={{ ios: iosMap[name] || name, android: name, web: name }} size={size} tintColor={color} />;
    }
  } catch {
    // Graceful fallback when expo-symbols is unavailable or mocked
  }
  return null;
}

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
          setPackages(result.packages.filter(p => p.isActive && p.type === 0 && p.role === 0));
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
        setNotice(detail ? 'Đã giữ lịch. Thời hạn được xác nhận bởi hệ thống.' : 'Hồ sơ đã sẵn sàng. Tiếp tục chọn lịch xác minh.');
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
      onEditSchedule={choosing ? () => setEditingSlotFor(detail.verification.id) : undefined}
    />;
  }

  return <SafeAreaView style={s.safe}>
    <DetailNavigation title={detail ? 'Chọn lịch xác minh' : 'Thanh toán phí dịch vụ thẩm định'} />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View accessible={false} style={s.heroRing} />
        <View style={s.steps}>
          <Text style={detail ? s.step : s.stepActive}>{detail ? '✓ Phí dịch vụ' : 'Phí dịch vụ'}</Text>
          <Text style={detail ? s.stepActive : s.step}>Chọn lịch</Text>
          <Text style={s.step}>Thanh toán</Text>
        </View>
        <Text accessibilityRole="header" style={s.title}>{detail ? 'Chọn lịch thẩm định' : 'Đăng ký thẩm định dự án'}</Text>
        {!!title && <Text style={s.heroText}>{title}</Text>}
      </View>

      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Tải lại trạng thái" onPress={reload} /></View>}
      {loading && <Text accessibilityRole="progressbar" style={s.body}>Đang tải dữ liệu mới nhất…</Text>}

      {!loading && !error && !detail && <>
        <View style={s.sectionHeader}>
          <View style={s.emblem}><BookingIcon name="tag" size={18} color={theme.primary} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text accessibilityRole="header" style={s.heading}>Thanh toán phí dịch vụ thẩm định</Text>
            <Text style={s.body}>Bạn sẽ chọn lịch hẹn trước khi thanh toán.</Text>
          </View>
        </View>

        {!packages.length && <Text style={s.notice}>Dịch vụ thẩm định hiện chưa mở đăng ký.</Text>}

        {packages.map(p => {
          const isSelected = selectedPackage === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => setSelectedPackage(p.id)}
              style={[s.card, s.packageCard, isSelected && s.selected]}
            >
              <View style={s.packageHeader}>
                <View style={[s.radioCircle, isSelected && s.radioCircleSelected]}>
                  {isSelected && <View style={s.radioDot} />}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.kickerDark}>{isSelected ? '● ĐÃ CHỌN GÓI' : '○ GÓI DỊCH VỤ'}</Text>
                  <Text style={s.packageTitle}>Thẩm định dự án với chuyên viên</Text>
                </View>
                <View style={s.priceBox}>
                  <Text style={s.price}>{p.price.toLocaleString('vi-VN')} ₫</Text>
                  {p.durationInDays != null && <Text style={s.durationText}>Thời hạn: {p.durationInDays} ngày</Text>}
                </View>
              </View>

              <View style={s.benefitsList}>
                <View style={s.benefitItem}>
                  <BookingIcon name="check" size={15} color={theme.success} />
                  <Text style={s.benefitText}>Đánh giá chuyên sâu từ hội đồng chuyên viên UniNet</Text>
                </View>
                <View style={s.benefitItem}>
                  <BookingIcon name="check" size={15} color={theme.success} />
                  <Text style={s.benefitText}>Buổi họp trao đổi trực tuyến 1-1 và hỏi đáp trực tiếp</Text>
                </View>
                <View style={s.benefitItem}>
                  <BookingIcon name="check" size={15} color={theme.success} />
                  <Text style={s.benefitText}>Báo cáo thẩm định chính thức cùng khuyến nghị phát triển</Text>
                </View>
              </View>

              {p.durationInDays != null && (
                <Text style={s.small}>Thời hạn dịch vụ: {p.durationInDays} ngày</Text>
              )}
            </Pressable>
          );
        })}

        {packagePages > 1 && (
          <View style={s.row}>
            <Button
              title="Trang trước"
              variant="outline"
              disabled={packagePage <= 1}
              onPress={() => { setSelectedPackage(null); setPackagePage(v => v - 1); }}
            />
            <Text style={s.small}>{packagePage} / {packagePages}</Text>
            <Button
              title="Trang sau"
              variant="outline"
              disabled={packagePage >= packagePages}
              onPress={() => { setSelectedPackage(null); setPackagePage(v => v + 1); }}
            />
          </View>
        )}

        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.emblem}><BookingIcon name="info" size={18} color={theme.primary} /></View>
            <Text style={s.heading}>Điều kiện đăng ký</Text>
          </View>
          <View style={s.benefitItem}>
            <BookingIcon name="check" size={15} color={theme.success} />
            <Text style={s.body}>✓ Bạn là người tạo dự án đã hoàn thành.</Text>
          </View>
          <Text style={s.small}>Chuyên viên sẽ đưa ra kết luận sau buổi thẩm định.</Text>
        </View>
      </>}

      {!loading && !error && detail && <>
        <View style={s.card}>
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

          {hasPaymentStep && <Button title="Về bước thanh toán" onPress={() => setEditingSlotFor(null)} disabled={busy} />}
          {expired && <Text accessibilityRole="alert" style={s.error}>Đã hết thời gian giữ lịch. Chọn lại khung giờ khi hệ thống cho phép.</Text>}
          {!choosing && <Text style={s.small}>Hồ sơ hiện không cho phép chọn hoặc đổi lịch. Nếu giao dịch đang chờ, cần kiểm tra thanh toán trước khi đặt lại.</Text>}

          <View style={s.actionRow}>
            <Button title="Làm mới hồ sơ" variant="outline" onPress={reload} disabled={busy} style={{ flex: 1 }} />
            <Button
              title="Xem hồ sơ thẩm định"
              variant="outline"
              disabled={busy}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/group/verification-dossier/[id]', params: { id: detail.verification.id } } as never)}
            />
          </View>
        </View>

        {choosing && <>
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.emblem}><BookingIcon name="calendar" size={18} color={theme.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.heading}>{held ? 'Đổi khung giờ' : 'Chọn ngày và khung giờ'}</Text>
                <Text style={s.small}>Múi giờ: {VERIFICATION_TIME_LABEL}. Chỉ hiển thị lịch còn chỗ do hệ thống cung cấp.</Text>
              </View>
            </View>

            <View style={s.row}>
              <Button title="Tuần trước" variant="outline" disabled={week === 0 || busy} onPress={() => setWeek(v => v - 1)} />
              <View style={s.weekBadge}>
                <Text style={s.weekBadgeText}>Tuần {week + 1}</Text>
              </View>
              <Button title="Tuần sau" variant="outline" disabled={busy} onPress={() => setWeek(v => v + 1)} />
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
                      style={[s.chip, isDaySelected && s.chipSelected]}
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
                    style={[s.slot, isSlotSelected && s.slotSelected]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BookingIcon name="clock" size={15} color={isSlotSelected ? theme.primary : colors.textSecondary} />
                      <Text style={[s.heading, { fontSize: 15 }]}>
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
      </>}
    </ScrollView>

    {(!detail || choosing) && (
      <View style={s.footer}>
        <Button
          title={detail ? 'Xác nhận giữ lịch' : 'Tiếp tục chọn lịch'}
          loading={busy}
          disabled={loading || !!error || (detail ? !selectedSlot || Date.parse(selectedSlot.startAt) <= now : !packages.some(p => p.id === selectedPackage))}
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
    maxWidth: 960,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
    paddingBottom: 40,
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
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#111A36',
    letterSpacing: -0.3,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#52617E',
  },
  card: {
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
    borderBottomWidth: 1,
    borderColor: '#F0F3F8',
    paddingBottom: 10,
  },
  emblem: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  packageCard: {
    gap: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCD6E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: theme.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
  },
  packageTitle: {
    color: '#111A36',
    fontSize: 16,
    fontWeight: '700',
  },
  priceBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  durationText: {
    fontSize: 12,
    color: '#52617E',
    fontWeight: '500',
  },
  benefitsList: {
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    color: '#14233B',
    fontSize: 13,
    lineHeight: 19,
  },
  selected: {
    borderColor: theme.primary,
    backgroundColor: '#F7FAFF',
    borderWidth: 2,
    boxShadow: '0 4px 14px rgba(18, 82, 255, 0.08)',
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
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  weekBadgeText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    boxShadow: '0 2px 8px rgba(18, 82, 255, 0.25)',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  slot: {
    minWidth: 170,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    padding: 14,
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  slotSelected: {
    borderColor: theme.primary,
    backgroundColor: '#F7FAFF',
    borderWidth: 2,
    boxShadow: '0 3px 10px rgba(18, 82, 255, 0.1)',
  },
  capacityPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F7EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capacityText: {
    color: '#198046',
    fontSize: 12,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F3',
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
});
