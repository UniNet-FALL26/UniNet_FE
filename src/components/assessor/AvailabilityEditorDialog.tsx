import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { AvailabilityTimePicker } from './AvailabilityTimePicker';
import { sameCalendarDay } from '@/utils/assessor-calendar';
import { workScheduleStyles as s } from './work-schedule.styles';

export function AvailabilityEditorDialog({ editing, start, end, day, busy, error, onStartChange, onEndChange, onSave, onClose }: {
  editing: boolean; start: string; end: string; day: Date; busy: boolean; error: string;
  onStartChange: (value: string) => void; onEndChange: (value: string) => void;
  onSave: () => void; onClose: () => void;
}) {
  const narrow = useWindowDimensions().width < 700;
  const buttonStyle = { ...s.button, ...(narrow ? s.mobileButton : {}) };
  const title = editing ? 'Chỉnh sửa khung giờ' : 'Thêm khung giờ';
  const close = () => { if (!busy) onClose(); };
  return <Modal visible transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={local.overlay}>
      <View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={title} style={local.dialog}>
        <View style={local.header}><View style={s.headingCopy}><Text role="heading" aria-level={2} style={s.sectionTitle}>{title}</Text><Text style={s.small}>Giờ hiển thị theo thiết bị của bạn.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng popup khung giờ" disabled={busy} onPress={close} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={19} tintColor={colors.textSecondary} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" style={local.scroll} contentContainerStyle={local.body}>
          <View style={local.selectedDay}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={17} tintColor={colors.primary} /><Text style={s.body}>{day.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</Text></View>
          <View style={local.timeFields}>
          <AvailabilityTimePicker label="Giờ bắt đầu" value={start} onChange={onStartChange} disabled={busy} />
          <AvailabilityTimePicker label="Giờ kết thúc" value={end} onChange={onEndChange} disabled={busy} />
          </View>
          {!sameCalendarDay(new Date(start), new Date(end)) && <Text style={s.small}>Khung giờ nhiều ngày: {new Date(start).toLocaleDateString('vi-VN')} – {new Date(end).toLocaleDateString('vi-VN')}. Thay đổi giờ giữ nguyên các ngày này.</Text>}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
        <View style={local.footer}><Button title="Hủy" variant="outline" disabled={busy} style={buttonStyle} textStyle={s.buttonText} onPress={close} /><Button title={editing ? 'Lưu thay đổi' : 'Lưu khung giờ'} loading={busy} disabled={!start || !end} style={buttonStyle} textStyle={s.buttonText} onPress={onSave} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const local = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16, 40, 75, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  scroll: { flexGrow: 0, flexShrink: 1 }, body: { padding: 16, gap: 14 },
  selectedDay: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }, timeFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
