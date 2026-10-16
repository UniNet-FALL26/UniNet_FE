import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

type Booking = { requestId: string; transactionId: string; date: string; time: string };
// Mock bookings survive returning to the detail screen during this app session.
const bookings = new Map<string, Booking>();
const dateLabel = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const slots = ['09:00', '10:00', '13:30', '14:30', '15:30', '16:30'];

export function ProjectVerificationFlow({ projectId, projectTitle, accountId }: { projectId: string; projectTitle: string; accountId?: string }) {
  const key = `${accountId ?? 'guest'}:${projectId}`;
  const [booking, setBooking] = useState(() => bookings.get(key));
  const [step, setStep] = useState<'schedule' | 'payment' | 'success' | 'details' | null>(null);
  const [date, setDate] = useState(() => { const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0); return next; });
  const [time, setTime] = useState('');
  const [picker, setPicker] = useState(false);
  const [month, setMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));
  const requestId = useRef(`XT-${Date.now().toString(36).toUpperCase()}`);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  const availableSlots = slots.filter(slot => (new Date(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${slot}:00`).getDay() + slots.indexOf(slot)) % 4 !== 0);
  const paid = booking !== undefined;
  const close = () => { setPicker(false); setStep(null); };
  const pay = () => {
    if (bookings.has(key)) { setBooking(bookings.get(key)); setStep('success'); return; }
    if (!time || !availableSlots.includes(time) || date < tomorrow) { setStep('schedule'); return; }
    const result = { requestId: requestId.current, transactionId: `MOCK-${Date.now().toString(36).toUpperCase()}`, date: dateLabel(date), time };
    bookings.set(key, result); setBooking(result); setStep('success');
  };
  const heading = step === 'schedule' ? 'Đặt lịch họp xác thực' : step === 'payment' ? 'Thanh toán xác thực' : step === 'success' ? 'Thanh toán thành công' : 'Chi tiết lịch họp';
  return <>
    <Button title={paid ? 'Xem chi tiết lịch họp' : 'Gửi yêu cầu xác thực'} onPress={() => setStep(paid ? 'details' : 'schedule')} />
    <Modal visible={step !== null} animationType="slide" onRequestClose={() => { if (step === 'payment') setStep('schedule'); else close(); }}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay về chi tiết dự án" onPress={close} style={s.close}><Text style={s.back}>‹</Text></Pressable><Text style={s.heading}>{heading}</Text></View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.muted}>XÁC THỰC DỰ ÁN · {step === 'schedule' ? 'BƯỚC 1/3' : step === 'payment' ? 'BƯỚC 2/3' : 'HOÀN TẤT'}</Text>
          {step === 'success' && <View style={s.success}><Text style={s.check}>✓</Text><Text style={s.title}>Đã thanh toán phí xác thực</Text><Text style={s.muted}>Lịch họp của bạn đã được đặt thành công.</Text></View>}
          <View style={s.card}><Text style={s.muted}>Dự án</Text><Text style={s.title}>{projectTitle}</Text><Text style={s.muted}>Mã yêu cầu: {booking?.requestId ?? requestId.current}</Text><Text style={s.badge}>✓ Đã qua kiểm duyệt với AI</Text></View>
          {step === 'schedule' && <>
            <View style={s.card}>
              <Text style={s.title}>Chọn ngày họp</Text>
              <View style={s.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" disabled={month.getFullYear() === tomorrow.getFullYear() && month.getMonth() === tomorrow.getMonth()} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={s.close}><Text style={s.back}>‹</Text></Pressable><Text style={s.title}>Tháng {month.getMonth() + 1}/{month.getFullYear()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={s.close}><Text style={s.back}>›</Text></Pressable></View>
              <View style={s.calendar}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Text key={day} style={s.weekday}>{day}</Text>)}
                {Array.from({ length: (month.getDay() + 6) % 7 }, (_, i) => <View key={`blank-${i}`} style={s.day} />)}
                {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => {
                  const value = new Date(month.getFullYear(), month.getMonth(), i + 1); const selected = dateLabel(value) === dateLabel(date); const disabled = value < tomorrow;
                  return <Pressable key={i} accessibilityRole="button" accessibilityLabel={dateLabel(value)} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => { setDate(value); setTime(''); }} style={[s.day, selected && s.selected, disabled && s.disabled]}><Text style={selected ? s.white : s.dayText}>{i + 1}</Text></Pressable>;
                })}
              </View>
              <Button variant="outline" title={`Ngày đã chọn: ${dateLabel(date)}`} onPress={() => setPicker(true)} />
              {picker && <DateTimePicker value={date} mode="date" minimumDate={tomorrow} onChange={(event, value) => { setPicker(false); if (event.type === 'set' && value) { value.setHours(0, 0, 0, 0); setDate(value); setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); setTime(''); } }} />}
            </View>
            <View style={s.card}><Text style={s.title}>Khung giờ còn trống</Text><Text style={s.muted}>Giờ Việt Nam (UTC+7) · Lịch minh họa</Text><View style={s.slots}>{availableSlots.map(slot => <Pressable key={slot} accessibilityRole="button" accessibilityState={{ selected: slot === time }} onPress={() => setTime(slot)} style={[s.slot, time === slot && s.selected]}><Text style={time === slot ? s.white : s.dayText}>{slot}</Text></Pressable>)}</View><Text style={s.muted}>Thời lượng dự kiến: 30 phút</Text></View>
            <Button title="Tiếp tục thanh toán" disabled={!time} onPress={() => setStep('payment')} />
          </>}
          {step === 'payment' && <>
            <View style={s.card}><Text style={s.title}>Lịch họp đã chọn</Text><Text style={s.body}>{dateLabel(date)} · {time} (UTC+7)</Text><Text style={s.muted}>Thời lượng: 30 phút · Họp trực tuyến</Text></View>
            <View style={s.card}><Text style={s.body}>Phí xác thực với người: 20.000 VNĐ</Text><View style={s.divider} /><Text style={s.title}>Tổng thanh toán: 20.000 VNĐ</Text></View>
            <View style={s.card}><Text style={s.title}>◉ Ví UniNet Demo</Text><Text style={s.body}>Phương thức thanh toán minh họa</Text><Text style={s.muted}>Nhấn nút bên dưới để giả lập thanh toán thành công. Không phát sinh giao dịch hoặc trừ tiền thật.</Text></View>
            <Button title="Thanh toán 20.000 VNĐ" onPress={pay} /><Button title="Quay lại chỉnh sửa lịch" variant="outline" onPress={() => setStep('schedule')} />
          </>}
          {(step === 'success' || step === 'details') && booking && <>
            <View style={s.card}><Text style={s.title}>{step === 'details' ? 'Lịch họp đã xác nhận' : 'Thông tin thanh toán'}</Text><Text style={s.body}>Số tiền: 20.000 VNĐ</Text><Text selectable style={s.body}>Mã giao dịch: {booking.transactionId}</Text><Text style={s.body}>Ngày họp: {booking.date}</Text><Text style={s.body}>Giờ họp: {booking.time} (UTC+7)</Text><Text style={s.body}>Thời lượng: 30 phút</Text><Text style={s.body}>Hình thức: Trực tuyến</Text><Text style={s.muted}>Lịch họp và thanh toán đang ở chế độ giả lập. Dữ liệu được giữ trong phiên sử dụng ứng dụng.</Text></View>
            {step === 'success' && <Button title="Xem chi tiết lịch họp" onPress={() => setStep('details')} />}
            <Button title="Quay về chi tiết dự án" variant="outline" onPress={close} />
          </>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, back: { fontSize: 32, color: colors.primary }, heading: { flex: 1, fontSize: 19, fontWeight: '700', color: colors.navy }, content: { padding: 18, paddingBottom: 36, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }, card: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }, title: { color: colors.navy, fontSize: 17, fontWeight: '700', lineHeight: 25 }, body: { color: colors.textPrimary, fontSize: 15, lineHeight: 23 }, muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, badge: { backgroundColor: '#E8F8F0', color: colors.success, padding: 10, borderRadius: 8, fontWeight: '600' }, monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendar: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 10, color: colors.textSecondary }, day: { width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 }, dayText: { color: colors.navy, fontSize: 15 }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, disabled: { opacity: 0.25 }, white: { color: '#FFFFFF', fontWeight: '700' }, slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, slot: { minWidth: '29%', minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 }, divider: { height: 1, backgroundColor: colors.border }, success: { alignItems: 'center', gap: 12, paddingVertical: 16 }, check: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F8F0', color: colors.success, fontSize: 44, textAlign: 'center', lineHeight: 72 },
});
