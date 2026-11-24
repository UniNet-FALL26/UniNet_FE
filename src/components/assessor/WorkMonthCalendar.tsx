import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { AvailabilitySlot } from '@/services/assessor.service';
import { calendarDays, sameCalendarDay, slotsOnDay } from '@/utils/assessor-calendar';

export function WorkMonthCalendar({ month, selected, today, rows, disabled, onSelect, onMonthChange }: {
  month: Date; selected: Date; today: Date; rows: AvailabilitySlot[]; disabled: boolean;
  onSelect: (day: Date) => void; onMonthChange: (direction: number) => void;
}) {
  return <View role="region" accessibilityLabel="Lịch tháng" style={s.calendar}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" disabled={disabled} onPress={() => onMonthChange(-1)} style={({ pressed }) => [s.arrow, pressed && s.pressed]}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={colors.textPrimary} /></Pressable>
      <Text role="heading" aria-level={2} style={s.title}>Tháng {month.getMonth() + 1}, {month.getFullYear()}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" disabled={disabled} onPress={() => onMonthChange(1)} style={({ pressed }) => [s.arrow, pressed && s.pressed]}><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={colors.textPrimary} /></Pressable>
    </View>
    <View style={s.week}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <Text key={label} style={s.weekday}>{label}</Text>)}</View>
    <View style={s.grid}>{calendarDays(month).map(day => {
      const active = sameCalendarDay(day, selected), hasSlots = slotsOnDay(rows, day).length > 0;
      const current = sameCalendarDay(day, today), outside = day.getMonth() !== month.getMonth();
      const label = `Ngày ${day.toLocaleDateString('vi-VN')}`;
      return <Pressable key={day.toISOString()} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hasSlots ? 'Có khung giờ đã đăng ký' : 'Chưa có khung giờ đăng ký'} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={() => onSelect(day)} style={({ pressed }) => [s.day, pressed && s.pressed]}>
        <View style={[s.number, current && s.today, active && s.selected]}><Text style={[s.dayText, outside && s.outside, active && s.selectedText]}>{day.getDate()}</Text></View>
        <View testID={hasSlots ? `schedule-day-dot-${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}` : undefined} style={[s.dot, hasSlots && s.visibleDot]} />
      </Pressable>;
    })}</View>
    <View style={s.legend}><View style={[s.dot, s.visibleDot]} /><Text style={s.legendText}>Có khung giờ đăng ký</Text></View>
  </View>;
}

const s = StyleSheet.create({
  calendar: { padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.textPrimary },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  week: { flexDirection: 'row' }, weekday: { width: '14.285714%', textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textSecondary, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  number: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  today: { borderColor: colors.border }, selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 12, fontWeight: '500', color: colors.textPrimary }, outside: { color: colors.textMuted }, selectedText: { color: colors.surface, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' }, visibleDot: { backgroundColor: colors.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  legendText: { fontSize: 11, lineHeight: 17, color: colors.textSecondary }, pressed: { opacity: 0.65 },
});
