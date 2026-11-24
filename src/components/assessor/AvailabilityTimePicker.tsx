import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { TimeWheel } from './TimeWheel';

const pad = (number: number) => String(number).padStart(2, '0');
const hours = Array.from({ length: 24 }, (_, index) => index);
export function AvailabilityTimePicker({ label, value, disabled, onChange }: {
  label: string; value: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const date = new Date(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00'), [minute, setMinute] = useState('00');
  const validHour = hour !== '' && Number(hour) <= 23;
  const validMinute = minute !== '' && Number(minute) <= 59;
  const minuteNumber = validMinute ? Number(minute) : 0;
  const minutes = useMemo(() => [...new Set([...Array.from({ length: 12 }, (_, index) => index * 5), minuteNumber])].sort((a, b) => a - b), [minuteNumber]);
  const close = () => setOpen(false);
  const confirm = () => {
    if (!validHour || !validMinute) return;
    const next = new Date(value); next.setHours(Number(hour), Number(minute), 0, 0);
    onChange(next.toISOString()); close();
  };
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { setHour(pad(date.getHours())); setMinute(pad(date.getMinutes())); setOpen(true); }} style={({ hovered, pressed }) => [s.trigger, (hovered || pressed) && s.hover]}><Text style={s.triggerText}>{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text><SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={17} tintColor={colors.textSecondary} /></Pressable>
    {open && <Modal transparent visible animationType="none" onRequestClose={close}>
      <View style={s.overlay}><View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={`Chọn ${label.toLowerCase()}`} style={s.dialog}>
        <View style={s.header}><Text style={s.title}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng bộ chọn giờ" onPress={close} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} tintColor={colors.textSecondary} /></Pressable></View>
        <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <View style={s.wheels}>
            <TimeWheel label="Giờ" values={hours} value={validHour ? Number(hour) : 0} onChange={number => setHour(pad(number))} />
            <Text style={s.separator}>:</Text>
            <TimeWheel label="Phút" values={minutes} value={minuteNumber} onChange={number => setMinute(pad(number))} />
          </View>
          <View style={s.manualRow}>
            <View style={s.manualLabel}><SymbolView name={{ ios: 'keyboard', android: 'keyboard_alt', web: 'keyboard_alt' }} size={15} tintColor={colors.textSecondary} /><Text style={s.manualLabelText}>Nhập thủ công</Text></View>
            <TextInput accessibilityLabel="Nhập giờ" inputMode="numeric" maxLength={2} selectTextOnFocus value={hour} onChangeText={text => setHour(text.replace(/\D/g, ''))} style={[s.manualInput, !validHour && s.invalid]} />
            <Text style={s.colon}>:</Text>
            <TextInput accessibilityLabel="Nhập phút" inputMode="numeric" maxLength={2} selectTextOnFocus value={minute} onChangeText={text => setMinute(text.replace(/\D/g, ''))} style={[s.manualInput, !validMinute && s.invalid]} />
          </View>
        </ScrollView>
        <View style={s.footer}><Button title="Hủy" variant="outline" style={s.button} textStyle={s.buttonText} onPress={close} /><Button title="Xác nhận" disabled={!validHour || !validMinute} style={s.button} textStyle={s.buttonText} leadingIcon={<SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} tintColor={colors.surface} />} onPress={confirm} /></View>
      </View></View>
    </Modal>}
  </View>;
}

const s = StyleSheet.create({
  field: { flex: 1, minWidth: 100, gap: 8 }, fieldLabel: { fontSize: 12, color: colors.textSecondary },
  trigger: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 }, triggerText: { fontSize: 20, fontWeight: '600', color: colors.textPrimary },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(16,40,75,0.3)' },
  dialog: { width: '100%', maxWidth: 360, maxHeight: '94%', borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }, title: { fontSize: 13, fontWeight: '600', color: colors.textPrimary }, close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 }, body: { padding: 16, gap: 20 }, wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, separator: { color: colors.textPrimary, fontSize: 26, marginTop: 32 },
  manualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, manualLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.primaryLight }, manualLabelText: { fontSize: 10, color: colors.textSecondary }, colon: { fontSize: 18, color: colors.textSecondary },
  manualInput: { width: 46, minHeight: 36, textAlign: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontWeight: '600', fontSize: 13 }, invalid: { borderColor: colors.error },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, padding: 14 }, button: { minHeight: 44, paddingHorizontal: 16 }, buttonText: { fontSize: 12 }, hover: { backgroundColor: colors.primaryLight },
});
