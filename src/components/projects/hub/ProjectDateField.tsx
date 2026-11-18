import { createElement, useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Text, View } from 'react-native';
import { HubAction, hubColors as c, ui } from './ProjectHubUI';

export const projectToday = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
export function ProjectDateField({ label, value, onChange, disabled = false, min, max, hint }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; min?: string; max?: string; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = new Date(`${value || projectToday()}T12:00:00`);
  const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const minimumDate = min ? new Date(`${min}T00:00:00`) : undefined;
  const maximumDate = max ? new Date(`${max}T23:59:59`) : undefined;
  const choose = () => {
    if (Platform.OS !== 'android') { setOpen(v => !v); return; }
    DateTimePickerAndroid.open({ value: date, mode: 'date', minimumDate, maximumDate,
      onChange: (event, selected) => { if (event.type === 'set' && selected) onChange(local(selected)); } });
  };
  return <View style={{ gap: 6 }}>
    <Text style={[ui.label, { marginBottom: 0, fontSize: 13 }]}>{label}</Text>
    {Platform.OS === 'web' ? createElement('input', {
      type: 'date', 'aria-label': label, value, disabled, min, max,
      style: { width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 38, padding: '8px 11px', border: `1px solid ${c.line}`, borderRadius: 9, backgroundColor: disabled ? c.canvas : '#FFFFFF', color: c.ink, fontFamily: 'inherit', fontSize: 13, colorScheme: 'light' },
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    }) : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <HubAction compact title={value ? date.toLocaleDateString('vi-VN') : `Chọn ${label.toLocaleLowerCase()}`} icon="calendar" disabled={disabled} onPress={choose} />
      {!!value && !disabled && <HubAction compact title={`Xóa ${label.toLocaleLowerCase()}`} variant="quiet" onPress={() => onChange('')} />}
      {open && !disabled && <View><DateTimePicker value={date} mode="date" display="spinner" locale="vi-VN" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, selected) => { if (selected) onChange(local(selected)); }} /><HubAction compact title="Xong" onPress={() => setOpen(false)} /></View>}
    </View>}
    {!!hint && <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}>{hint}</Text>}
  </View>;
}
