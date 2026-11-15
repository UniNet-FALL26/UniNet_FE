import { createElement, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type AccessibilityRole } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

type Props = { title: string; initialValue: Date; onConfirm: (date: Date) => void; onClose: () => void };
const pad = (value: number) => String(value).padStart(2, '0');
const dayLabel = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

export function ProjectDateTimeModal({ title, initialValue, onConfirm, onClose }: Props) {
  const { height, width } = useWindowDimensions();
  const wide = width >= 640;
  const [day, setDay] = useState(initialValue);
  const [month, setMonth] = useState(initialValue.getMonth());
  const [year, setYear] = useState(initialValue.getFullYear());
  const [hours, setHours] = useState(pad(initialValue.getHours()));
  const [minutes, setMinutes] = useState(pad(initialValue.getMinutes()));
  const [error, setError] = useState('');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const timeValid = /^\d{1,2}$/.test(hours) && Number(hours) < 24 && /^\d{1,2}$/.test(minutes) && Number(minutes) < 60;
  const selected = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hours), Number(minutes));
  const valid = timeValid && selected.getTime() > now.getTime();
  const previousDisabled = year * 12 + month <= today.getFullYear() * 12 + today.getMonth();
  const moveMonth = (offset: number) => { const next = new Date(year, month + offset, 1); setMonth(next.getMonth()); setYear(next.getFullYear()); };
  const selectStyle = { border: 'none', background: 'transparent', color: colors.navy, fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 600, minHeight: 32, minWidth: 0, cursor: 'pointer' };
  const timeInput = (label: string, value: string, onChange: (value: string) => void) => createElement('input', {
    type: 'text', inputMode: 'numeric', maxLength: 2, 'aria-label': label, value,
    style: { width: 52, minWidth: 0, height: 44, boxSizing: 'border-box', textAlign: 'center', border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: colors.surface, color: colors.navy, fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
    onChange: (event: { currentTarget: HTMLInputElement }) => { onChange(event.currentTarget.value.replace(/\D/g, '')); setError(''); },
    onBlur: () => { if (/^\d$/.test(value)) onChange(value.padStart(2, '0')); },
  });

  return <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn ngày giờ" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal accessibilityRole={'dialog' as AccessibilityRole} accessibilityLabel={title} style={[s.card, { maxHeight: height - 32 }, wide && s.wideCard]}>
        <View style={s.header}><Text accessibilityRole="header" style={s.title}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng cửa sổ chọn ngày giờ" onPress={onClose} style={({ pressed }) => [s.close, pressed && s.pressed]}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} tintColor={colors.textSecondary} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.body, wide && s.wideBody]}>
          <View style={s.calendar}>
          <View style={s.monthHeader}>
            <View style={s.monthSelect}>
              {createElement('select', { 'aria-label': 'Tháng', value: String(month), style: selectStyle, onChange: (event: { currentTarget: HTMLSelectElement }) => setMonth(Number(event.currentTarget.value)) }, Array.from({ length: 12 }, (_, index) => createElement('option', { key: index, value: String(index) }, `Tháng ${index + 1}`)))}
              {createElement('select', { 'aria-label': 'Năm', value: String(year), style: selectStyle, onChange: (event: { currentTarget: HTMLSelectElement }) => setYear(Number(event.currentTarget.value)) }, Array.from({ length: 101 }, (_, index) => today.getFullYear() + index).map(value => createElement('option', { key: value, value: String(value) }, String(value))))}
            </View>
            <View style={s.monthArrows}><Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" disabled={previousDisabled} onPress={() => moveMonth(-1)} style={({ pressed }) => [s.arrow, previousDisabled && s.disabled, pressed && s.pressed]}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={colors.textSecondary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" disabled={year >= today.getFullYear() + 100 && month === 11} onPress={() => moveMonth(1)} style={({ pressed }) => [s.arrow, pressed && s.pressed]}><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable></View>
          </View>
          <View style={s.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <View key={label} style={s.weekday}><Text style={s.weekdayText}>{label}</Text></View>)}</View>
          <View style={s.grid}>{Array.from({ length: cells }, (_, index) => {
            const number = index - firstDay + 1;
            if (number < 1 || number > daysInMonth) return <View key={index} style={s.cell}><View style={s.day}><Text style={s.adjacentDay}>{new Date(year, month, number).getDate()}</Text></View></View>;
            const date = new Date(year, month, number);
            const active = day.getFullYear() === year && day.getMonth() === month && day.getDate() === number;
            const disabled = date < today;
            const isToday = date.getTime() === today.getTime();
            return <View key={index} style={s.cell}><Pressable accessibilityRole="button" accessibilityLabel={`Chọn ngày ${dayLabel(date)}`} aria-pressed={active} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={() => { setDay(date); setError(''); }} style={({ pressed }) => [s.day, isToday && s.today, active && s.selectedDay, pressed && s.dayPressed]}><Text style={[s.dayText, isToday && s.todayText, disabled && s.disabledText, active && s.selectedDayText]}>{number}</Text></Pressable></View>;
          })}</View>
          </View>
          <View style={[s.timeSection, wide && s.timeSidebar]}>
            <View style={[s.datePreview, !wide && s.mobileDatePreview]}>
              <Text style={s.weekdayLabel}>{['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][day.getDay()]}</Text>
              {wide ? <><Text style={s.largeDate}>{pad(day.getDate())}</Text><Text style={s.monthLabel}>Tháng {day.getMonth() + 1}, {day.getFullYear()}</Text></> : <Text style={s.mobileDate}>{dayLabel(day)}</Text>}
            </View>
            <View style={[s.timeBlock, !wide && s.mobileTimeBlock]}>
              <Text style={s.timeLabel}>Thời gian</Text>
              <View style={s.timeControls}>{timeInput('Giờ', hours, setHours)}<Text style={s.colon}>:</Text>{timeInput('Phút', minutes, setMinutes)}</View>
              <Text style={s.subtitle}>Giờ địa phương · 24 giờ</Text>
            </View>
          </View>
          {(!valid || !!error) && <Text accessibilityRole="alert" style={[s.error, wide && s.wideError]}>{error || (timeValid ? 'Vui lòng chọn thời gian sau thời điểm hiện tại.' : 'Giờ từ 00–23, phút từ 00–59.')}</Text>}
        </ScrollView>
        <View style={s.footer}>{wide && <View style={s.footerPreview}><SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} size={14} tintColor={colors.textSecondary} /><Text style={s.summaryText}>{dayLabel(day)} · {hours || '--'}:{minutes || '--'}</Text></View>}<Button title="Hủy" variant="outline" onPress={onClose} style={s.button} textStyle={s.buttonText} /><Button title="Xác nhận" disabled={!valid} onPress={() => { if (!valid || selected.getTime() <= Date.now()) { setError('Vui lòng chọn thời gian sau thời điểm hiện tại.'); return; } onConfirm(selected); }} style={s.button} textStyle={s.buttonText} /></View>
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, backgroundColor: '#10203955', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 380, borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, flexShrink: 1, boxShadow: '0px 16px 64px rgba(16,40,75,0.14)' }, wideCard: { maxWidth: 580 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.navy }, subtitle: { fontSize: 10, lineHeight: 16, color: colors.textSecondary }, close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  body: { flexDirection: 'column' }, wideBody: { flexDirection: 'row', flexWrap: 'wrap' }, calendar: { flex: 1, minWidth: 0, padding: 18 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, paddingBottom: 12 }, monthSelect: { flexDirection: 'row', alignItems: 'center', gap: 2 }, monthArrows: { flexDirection: 'row', gap: 2 }, arrow: { width: 28, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.285714%', alignItems: 'center', paddingBottom: 6 }, weekdayText: { fontSize: 10, lineHeight: 18, fontWeight: '500', color: colors.textSecondary },
  cell: { width: '14.285714%', height: 36, padding: 2 }, day: { width: '100%', maxWidth: 32, height: 32, alignSelf: 'center', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, dayText: { fontSize: 12, lineHeight: 18, color: colors.textPrimary }, adjacentDay: { fontSize: 12, lineHeight: 18, color: colors.border }, today: { borderWidth: 1, borderColor: colors.primary }, todayText: { color: colors.primary, fontWeight: '600' }, selectedDay: { backgroundColor: colors.primary }, selectedDayText: { color: colors.surface, fontWeight: '600' }, disabledText: { color: colors.textMuted, opacity: 0.65 }, dayPressed: { backgroundColor: colors.primaryLight },
  timeSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 18, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }, timeSidebar: { width: 184, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 26, borderTopWidth: 0, borderLeftWidth: 1, borderLeftColor: colors.border, padding: 22 },
  datePreview: { gap: 3 }, mobileDatePreview: { flex: 1 }, weekdayLabel: { fontSize: 12, lineHeight: 18, color: colors.textSecondary }, largeDate: { fontSize: 44, lineHeight: 54, fontWeight: '500', color: colors.navy }, monthLabel: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, mobileDate: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: colors.navy },
  timeBlock: { gap: 8 }, mobileTimeBlock: { alignItems: 'flex-end' }, timeLabel: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: colors.textSecondary }, timeControls: { flexDirection: 'row', alignItems: 'center', gap: 6 }, colon: { fontSize: 18, color: colors.textMuted },
  footerPreview: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }, summaryText: { fontSize: 11, lineHeight: 17, color: colors.textSecondary }, error: { fontSize: 12, lineHeight: 18, color: colors.error, padding: 16 }, wideError: { width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border }, button: { minHeight: 36, minWidth: 72, paddingHorizontal: 14, borderRadius: 8 }, buttonText: { fontSize: 12, fontWeight: '600' }, pressed: { backgroundColor: colors.background }, disabled: { opacity: 0.35 },
});
