import { createElement, useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { assessorStyles as s } from './assessor-ui';

export function AvailabilityDateTimePicker({ label, value, onChange, disabled, minimumDate, maximumDate }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean; minimumDate: Date; maximumDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const parsed = new Date(value);
  const valid = !!value && !Number.isNaN(parsed.getTime());
  const date = valid ? parsed : new Date(Math.ceil(minimumDate.getTime() / 60000) * 60000);
  const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const choose = () => {
    if (Platform.OS !== 'android') { setOpen(v => !v); return; }
    DateTimePickerAndroid.open({ value: date, mode: 'date', minimumDate, maximumDate, onChange: (event, selected) => {
      if (event.type !== 'set' || !selected) return;
      const next = new Date(date); next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      DateTimePickerAndroid.open({ value: next, mode: 'time', is24Hour: true, onChange: (event, time) => {
        if (event.type !== 'set' || !time) return;
        next.setHours(time.getHours(), time.getMinutes(), 0, 0); onChange(next.toISOString());
      } });
    } });
  };
  return <View style={{ gap: 8, flexGrow: 1, flexBasis: 260, minWidth: 0 }}>
    <Text style={s.label}>{label}</Text>
    {Platform.OS === 'web' ? createElement('input', {
      type: 'datetime-local', 'aria-label': label, value: valid ? local(date) : '', disabled,
      min: local(minimumDate), max: local(maximumDate), step: 60,
      style: { width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 48, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 10, backgroundColor: colors.surface, color: colors.textPrimary, fontFamily: 'inherit', fontSize: 14, colorScheme: 'light', cursor: disabled ? 'default' : 'pointer' },
      onClick: (event: { currentTarget: HTMLInputElement }) => { try { event.currentTarget.showPicker?.(); } catch {} },
      onChange: (event: { target: { value: string } }) => { const next = new Date(event.target.value); onChange(Number.isNaN(next.getTime()) ? '' : next.toISOString()); },
    }) : <><Button title={valid ? date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chọn ngày và giờ'} variant="outline" disabled={disabled} onPress={choose} />
      {open && !disabled && <><DateTimePicker value={date} mode="datetime" display="spinner" locale="vi-VN" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, selected) => { if (selected) onChange(selected.toISOString()); }} /><Button title="Xong" variant="outline" onPress={() => setOpen(false)} /></>}
    </>}
  </View>;
}
