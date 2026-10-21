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

const errorMessage = (cause: unknown) => {
  const code = cause instanceof ApiError ? cause.code : '';
  if (code === 'MEETING_SLOT_UNAVAILABLE') return 'Khung giờ vừa hết chỗ hoặc trùng lịch. Vui lòng chọn khung giờ khác.';
  if (code === 'LEVEL1_REQUIRED' || code === 'LEVEL1_STALE') return 'Cấp 1 chưa đạt hoặc không còn hiện hành. Hãy quay lại kiểm tra cấp 1.';
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
      if (!project.isCreator || project.status !== ApiProjectStatus.Completed) throw new Error('Chỉ người tạo dự án đã hoàn thành có thể đăng ký cấp 2.');
      const pending = await service.list(project.id, true, controller.signal);
      const resumed = pending.verifications[0] ? await service.detail(pending.verifications[0].id, controller.signal) : null;
      if (controller.signal.aborted) return;
      setTitle(project.title); setDetail(resumed);
      if (resumed) {
        if (!canChooseMeeting(resumed)) { setSlots(null); return; }
        const from = new Date(Date.now() + week * 7 * 86400000);
        const result = await service.slots(resumed.verification.id, from.toISOString(), new Date(from.getTime() + 7 * 86400000).toISOString(), controller.signal);
        // Validate the server's zone before rendering dates; never silently substitute device time.
        slotDate(new Date().toISOString(), result.timeZoneId);
        if (!controller.signal.aborted) { setSlots(result); setDay(previous => result.slots.some(s => slotDate(s.startAt, result.timeZoneId) === previous) ? previous : result.slots[0] ? slotDate(result.slots[0].startAt, result.timeZoneId) : ''); }
      } else {
        const level1 = await service.getLevel1(project.id, controller.signal);
        if (level1.status !== 2 || !level1.isCurrent) throw new Error('Cần kết quả cấp 1 đạt và còn hiện hành trước khi chọn gói.');
        const result = await service.packages(packagePage, controller.signal);
        if (!controller.signal.aborted) { setPackages(result.packages.filter(p => p.isActive && p.type === 0 && p.role === 0)); setPackagePages(result.totalPages); }
      }
      uncertain.current = false;
    }
    void load().catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') setNow(Date.now()); }, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); reload(); } });
    return () => { controller.abort(); generation.current = current + 1; clearInterval(timer); subscription.remove(); };
  }, [id, account?.id, week, packagePage, revision]));

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
      // Always reconcile before creating: an earlier request may have completed despite a timeout.
      const pending = await service.list(id, true);
      let result: VerificationDetail;
      if (!detail) result = pending.verifications[0] ? await service.detail(pending.verifications[0].id) : await service.create(id, selectedPackage!);
      else result = await service.hold(detail.verification.id, selectedSlot!);
      if (current === generation.current) { setDetail(result); setSelectedSlot(null); setNotice(detail ? 'Đã giữ lịch. Thời hạn được xác nhận bởi hệ thống.' : 'Hồ sơ đã sẵn sàng. Tiếp tục chọn lịch xác minh.'); reload(); }
    } catch (cause) {
      uncertain.current = true;
      if (current === generation.current) {
        setNotice(errorMessage(cause));
        // GET reconciliation only; never repeat a mutation automatically.
        reload();
      }
    } finally { lock.current = false; setBusy(false); }
  }
  const dates = slots ? [...new Set(slots.slots.map(s => slotDate(s.startAt, slots.timeZoneId)))] : [];
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={s.headerTitle}>{detail ? 'Chọn lịch xác minh' : 'Chọn gói cấp 2'}</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}><Text style={s.kicker}>XÁC MINH CHUYÊN VIÊN · CẤP 2</Text><Text style={s.title}>{detail ? 'Hẹn gặp chuyên viên' : 'Thêm sự tin cậy cho dự án'}</Text><Text style={s.heroText}>{title || 'Dự án đã hoàn thành'}</Text><Text style={s.heroText}>{detail ? '02  Chọn lịch hẹn' : '01  Chọn gói dịch vụ'}  →  Thanh toán  →  Xác minh</Text></View>
      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Tải lại trạng thái" onPress={reload} /><Button title="Xem cấp 1" variant="outline" onPress={() => router.push({ pathname: '/group/level1/[id]', params: { id } } as never)} /></View>}
      {loading && <Text accessibilityRole="progressbar" style={s.body}>Đang tải dữ liệu mới nhất…</Text>}
      {!loading && !error && !detail && <>
        <Text style={s.heading}>Gói dành cho sinh viên</Text><Text style={s.body}>Chọn gói để tạo hồ sơ. Bước này chưa thu phí; bạn sẽ chọn lịch trước khi thanh toán.</Text>
        {!packages.length && <Text style={s.notice}>Chưa có gói xác minh phù hợp đang mở bán.</Text>}
        {packages.map(p => <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: selectedPackage === p.id }} onPress={() => setSelectedPackage(p.id)} style={[s.card, selectedPackage === p.id && s.selected]}>
          <Text style={s.kickerDark}>{selectedPackage === p.id ? '● ĐÃ CHỌN' : '○ CHỌN GÓI'}</Text><Text style={s.heading}>{p.name}</Text><Text style={s.price}>{p.price.toLocaleString('vi-VN')} ₫</Text><Text style={s.body}>Xác minh dự án với chuyên viên</Text>{p.durationInDays != null && <Text style={s.small}>Thời hạn gói: {p.durationInDays} ngày</Text>}
        </Pressable>)}
        <View style={s.row}><Button title="Trang trước" variant="outline" disabled={packagePage <= 1} onPress={() => { setSelectedPackage(null); setPackagePage(v => v - 1); }} /><Text style={s.small}>{packagePage} / {Math.max(1, packagePages)}</Text><Button title="Trang sau" variant="outline" disabled={packagePage >= packagePages} onPress={() => { setSelectedPackage(null); setPackagePage(v => v + 1); }} /></View>
        <View style={s.card}><Text style={s.heading}>Điều kiện đăng ký</Text><Text style={s.body}>✓ Bạn là người tạo dự án đã hoàn thành.{ '\n' }✓ Kết quả cấp 1 đạt và còn hiện hành.</Text><Text style={s.small}>Kết quả cấp 2 do chuyên viên kết luận sau buổi xác minh. Đăng ký gói không bảo đảm dự án sẽ đạt.</Text></View>
      </>}
      {!loading && !error && detail && <>
        <View style={s.card}><Text style={s.heading}>{level2Label(detail, true)}</Text>{detail.verification.scheduledStartAt && <Text style={s.body}>Lịch hẹn: {new Date(detail.verification.scheduledStartAt).toLocaleString('vi-VN', { timeZone: slots?.timeZoneId || 'Asia/Ho_Chi_Minh' })}{'\n'}{slots?.timeZoneId || 'Asia/Ho_Chi_Minh'}</Text>}
          {held && <><Text accessibilityLiveRegion="none" style={s.price}>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</Text><Text style={s.small}>Thời gian giữ lịch còn lại. Giữ lịch chưa phải xác nhận thanh toán.</Text><Text style={s.notice}>Lịch đã được giữ. Thanh toán sẽ được tiếp nối tại màn hình checkout (S06).</Text></>}
          {expired && <Text accessibilityRole="alert" style={s.error}>Đã hết thời gian giữ lịch. Chọn lại khung giờ khi hệ thống cho phép.</Text>}
          {!choosing && <Text style={s.small}>Hồ sơ hiện không cho phép chọn hoặc đổi lịch. Nếu giao dịch đang chờ, cần kiểm tra thanh toán trước khi đặt lại.</Text>}
          <Button title="Làm mới hồ sơ" variant="outline" onPress={reload} disabled={busy} />
        </View>
        {choosing && <>
          <Text style={s.heading}>{held ? 'Đổi khung giờ' : 'Chọn ngày và khung giờ'}</Text><Text style={s.small}>Múi giờ: {slots?.timeZoneId || 'Đang tải từ hệ thống'}. Chỉ hiển thị lịch còn chỗ do hệ thống cung cấp.</Text>
          <View style={s.row}><Button title="Tuần trước" variant="outline" disabled={week === 0 || busy} onPress={() => setWeek(v => v - 1)} /><Text style={s.small}>Tuần {week + 1}</Text><Button title="Tuần sau" variant="outline" disabled={busy} onPress={() => setWeek(v => v + 1)} /></View>
          {!dates.length && <Text style={s.notice}>Không còn lịch trống trong khoảng này. Hãy xem tuần khác hoặc làm mới.</Text>}
          <View style={s.wrap}>{dates.map(d => <Pressable key={d} accessibilityRole="radio" accessibilityState={{ checked: day === d }} onPress={() => { setDay(d); setSelectedSlot(null); }} style={[s.chip, day === d && s.selected]}><Text style={s.body}>{d.split('-').reverse().join('/')}</Text></Pressable>)}</View>
          <View style={s.wrap}>{slots?.slots.filter(slot => slotDate(slot.startAt, slots.timeZoneId) === day && slot.remainingCapacity > 0 && Date.parse(slot.startAt) > now).map(slot => <Pressable key={slot.startAt} accessibilityRole="radio" accessibilityState={{ checked: selectedSlot?.startAt === slot.startAt }} onPress={() => setSelectedSlot(slot)} style={[s.slot, selectedSlot?.startAt === slot.startAt && s.selected]}><Text style={s.heading}>{slotTime(slot.startAt, slots.timeZoneId)} – {slotTime(slot.endAt, slots.timeZoneId)}</Text><Text style={s.small}>Còn {slot.remainingCapacity} chỗ</Text></Pressable>)}</View>
          {selectedSlot && slots && <Text style={s.notice}>Đã chọn {slotTime(selectedSlot.startAt, slots.timeZoneId)} – {slotTime(selectedSlot.endAt, slots.timeZoneId)}, ngày {day.split('-').reverse().join('/')} ({slots.timeZoneId}). Lịch chỉ được giữ sau khi hệ thống xác nhận.</Text>}
        </>}
      </>}
    </ScrollView>
    {(!detail || choosing) && <View style={s.footer}><Button title={detail ? 'Xác nhận giữ lịch' : 'Tiếp tục chọn lịch'} loading={busy} disabled={loading || !!error || (detail ? !selectedSlot || Date.parse(selectedSlot.startAt) <= now : !packages.some(p => p.id === selectedPackage))} onPress={submit} /></View>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, back: { minWidth: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 34, color: colors.primary }, headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  content: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 32 }, hero: { backgroundColor: '#102E54', borderRadius: 24, padding: 26, gap: 14 }, kicker: { color: '#9DCDFF', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' }, title: { fontSize: 28, lineHeight: 36, fontWeight: '800', color: '#FFFFFF' }, heroText: { fontSize: 15, lineHeight: 24, color: '#BDCEE3' }, card: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, padding: 22, gap: 14 }, selected: { borderColor: colors.primary, backgroundColor: '#EDF5FF', borderWidth: 2 }, heading: { color: colors.navy, fontSize: 18, lineHeight: 27, fontWeight: '700' }, body: { color: colors.textPrimary, fontSize: 16, lineHeight: 25 }, small: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 }, price: { color: colors.primary, fontSize: 30, fontWeight: '800' }, kickerDark: { color: colors.primary, fontSize: 12, fontWeight: '700' }, notice: { backgroundColor: colors.primaryLight, padding: 16, borderRadius: 12, color: colors.navy, fontSize: 15, lineHeight: 24 }, error: { color: colors.error, fontSize: 16, lineHeight: 24 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, chip: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface }, slot: { minWidth: 180, flexGrow: 1, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 6, borderRadius: 14, backgroundColor: colors.surface }, footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
});
