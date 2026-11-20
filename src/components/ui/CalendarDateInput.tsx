import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

export function CalendarDateInput({ label, value, placeholder = 'DD/MM/YYYY', onChangeText, onOpenCalendar, disabled = false, readOnly = false }: {
  label: string; value: string; placeholder?: string; onChangeText?: (value: string) => void;
  onOpenCalendar: () => void; disabled?: boolean; readOnly?: boolean;
}) {
  const icon = <SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} size={19} tintColor={colors.primary} />;
  const openCalendar = () => { Keyboard.dismiss(); onOpenCalendar(); };
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    {readOnly ? <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label.toLowerCase()}`} accessibilityState={{ disabled }} disabled={disabled} onPress={openCalendar} style={[s.control, disabled && s.disabled]}>
      <Text style={[s.value, !value && s.placeholder]}>{value || placeholder}</Text><View style={s.icon}>{icon}</View>
    </Pressable> : <View style={[s.control, disabled && s.disabled]}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} editable={!disabled} placeholder={placeholder} placeholderTextColor={colors.textMuted} maxLength={20} autoCapitalize="none" autoCorrect={false} style={s.input} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${label.toLowerCase()} từ lịch`} accessibilityState={{ disabled }} disabled={disabled} onPress={openCalendar} style={s.icon}>{icon}</Pressable>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  field: { gap: 7 }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  control: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 14 },
  value: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 14 },
  placeholder: { color: colors.textMuted }, icon: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.5 },
});
