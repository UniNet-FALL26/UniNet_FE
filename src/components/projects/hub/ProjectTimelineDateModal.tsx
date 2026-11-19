import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { projectToday } from './ProjectDateField';

export const formatTimelineDate = (value: string) => value ? value.split('-').reverse().join('/') : 'Chưa thiết lập';
const calendarMonth = (year: number, month: number) => {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0); date.setFullYear(year, month, 1);
  return date;
};

export function ProjectTimelineDateModal({ title, value, min, max, busy, error, onClose, onConfirm, children }: {
  title: string; value: string; min?: string; max?: string; busy: boolean; error: string;
  onClose: () => void; onConfirm: (value: string) => void;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(() => {
    const initial = value || (min && min > projectToday() ? min : max && max < projectToday() ? max : projectToday());
    return new Date(`${initial.slice(0, 7)}-01T12:00:00`);
  });
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [yearPage, setYearPage] = useState(() => Math.floor(month.getFullYear() / 12) * 12);
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const offset = (calendarMonth(year, monthIndex).getDay() + 6) % 7;
  const lastDay = calendarMonth(year, monthIndex + 1); lastDay.setDate(0);
  const count = lastDay.getDate();
  const navigate = (delta: number) => {
    if (view === 'years') setYearPage(page => page + delta * 12);
    else setMonth(calendarMonth(year + (view === 'months' ? delta : 0), monthIndex + (view === 'days' ? delta : 0)));
  };
  const openPicker = () => {
    if (view === 'days') setView('months');
    else if (view === 'months') { setYearPage(Math.floor(year / 12) * 12); setView('years'); }
    else setView('months');
  };
  const previousDisabled = busy || (view === 'years' ? yearPage <= 0 : year <= 1 && (view === 'months' || monthIndex === 0));
  const nextDisabled = busy || (view === 'years' ? yearPage + 12 > 9999 : year >= 9999 && (view === 'months' || monthIndex === 11));
  return <HubModal title={title} icon="calendar" compact wide={false} maxWidth={440} onClose={onClose} footer={<>
    <HubAction compact title="Hủy" disabled={busy} onPress={onClose} />
    <HubAction compact title="Xác nhận" icon="check" variant="primary" busy={busy} onPress={() => onConfirm(draft)} />
  </>}>
    <View style={styles.content}>
      <View style={styles.selectedDate}>
        <Text style={styles.caption}>Ngày đang chọn</Text>
        <Text accessibilityLiveRegion="polite" style={styles.date}>{formatTimelineDate(draft)}</Text>
      </View>
      {children}
      <View style={styles.month}>
        <HubAction compact title={view === 'days' ? 'Tháng trước' : view === 'months' ? 'Năm trước' : '12 năm trước'} icon="back" variant="quiet" disabled={previousDisabled} onPress={() => navigate(-1)} />
        <Pressable accessibilityRole="button" accessibilityLabel={view === 'days' ? 'Chọn tháng và năm' : view === 'months' ? 'Chọn năm' : 'Quay lại chọn tháng'}
          accessibilityState={{ expanded: view !== 'days', disabled: busy }} disabled={busy} onPress={openPicker}
          style={({ pressed }) => [styles.monthTrigger, pressed && { backgroundColor: c.blueWash }]}>
          <Text accessibilityLiveRegion="polite" style={styles.monthTitle}>{view === 'days' ? `Tháng ${monthIndex + 1}, ${year}` : view === 'months' ? year : `${Math.max(1, yearPage)} – ${Math.min(9999, yearPage + 11)}`}</Text>
          <HubIcon name="chevron" size={13} color={c.textSecondary} />
        </Pressable>
        <HubAction compact title={view === 'days' ? 'Tháng sau' : view === 'months' ? 'Năm sau' : '12 năm sau'} icon="next" variant="quiet" disabled={nextDisabled} onPress={() => navigate(1)} />
      </View>
      {view !== 'days' ? <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, index) => {
          const choice = view === 'months' ? index : yearPage + index;
          if (view === 'years' && (choice < 1 || choice > 9999)) return <View key={index} style={styles.yearCell} />;
          const selected = view === 'months' ? choice === monthIndex : choice === year;
          return <View key={index} style={view === 'months' ? styles.monthCell : styles.yearCell}>
            <Pressable accessibilityRole="button" accessibilityLabel={view === 'months' ? `Chọn tháng ${choice + 1}` : `Chọn năm ${choice}`}
              accessibilityState={{ selected, disabled: busy }} disabled={busy}
              onPress={() => {
                setMonth(calendarMonth(view === 'years' ? choice : year, view === 'months' ? choice : monthIndex));
                setView(view === 'years' ? 'months' : 'days');
              }} style={({ pressed }) => [styles.pickerChoice, selected && styles.active, pressed && { opacity: 0.65 }]}>
              <Text style={[styles.dayText, selected && { color: '#FFFFFF', fontWeight: '600' }]}>{view === 'months' ? `Tháng ${choice + 1}` : choice}</Text>
            </Pressable>
          </View>;
        })}
      </View> : <View style={styles.grid}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}
        {Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > count) return <View key={index} style={styles.cell} />;
          const date = `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const disabled = busy || !!(min && date < min) || !!(max && date > max);
          const selected = draft === date;
          return <View key={index} style={styles.cell}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ngày ${formatTimelineDate(date)}`}
              accessibilityState={{ disabled, selected }} disabled={disabled} onPress={() => setDraft(date)}
              style={({ pressed }) => [styles.day, date === projectToday() && styles.today, selected && styles.active, disabled && { opacity: 0.3 }, pressed && { opacity: 0.65 }]}>
              <Text style={[styles.dayText, selected && { color: '#FFFFFF', fontWeight: '700' }]}>{day}</Text>
            </Pressable>
          </View>;
        })}
      </View>}
      <HubAction compact title="Xóa ngày" variant="quiet" disabled={busy || !draft} onPress={() => setDraft('')} style={{ alignSelf: 'flex-start' }} />
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    </View>
  </HubModal>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 404, alignSelf: 'center', gap: 12 },
  selectedDate: { padding: 12, borderRadius: 9, backgroundColor: c.blueWash, gap: 4 },
  caption: { fontSize: 12, color: c.textSecondary }, date: { fontSize: 21, fontWeight: '600', color: c.ink },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  monthTitle: { fontSize: 13, fontWeight: '600', color: c.ink, textAlign: 'center' },
  monthTrigger: { flex: 1, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, borderRadius: 6 },
  monthCell: { width: '33.333333%', padding: 4 }, yearCell: { width: '25%', padding: 4 },
  pickerChoice: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: `${100 / 7}%`, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  weekday: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
  day: { width: '100%', maxWidth: 44, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  today: { borderColor: c.primary }, active: { backgroundColor: c.primary, borderColor: c.primary }, dayText: { fontSize: 14, color: c.ink },
});
