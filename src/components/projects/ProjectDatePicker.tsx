import { createElement, useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { implementationDateBounds } from '@/utils/external-project-draft';

const dateValue = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function ProjectDatePicker({ label, value, onChange, disabled, error }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const bounds = implementationDateBounds(value);
  const complete = !!bounds && value.length === 10;
  const today = new Date();
  const initial = bounds ? new Date(`${value.padEnd(7, '-01').padEnd(10, '-01')}T12:00:00`) : today;
  const date = initial > today ? today : initial;
  const choose = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'date', maximumDate: today, onChange: (event, selected) => {
        if (event.type === 'set' && selected) onChange(dateValue(selected));
      } });
    } else setOpen(current => !current);
  };
  return <View style={{ gap: 7 }}>
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{label}</Text>
    {Platform.OS === 'web' ? createElement('input', {
      type: 'date', lang: 'vi', 'aria-label': label, 'aria-invalid': !!error,
      value: complete ? value : '', disabled, min: '0001-01-01', max: dateValue(today),
      style: { width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 52, padding: 12, border: `1px solid ${error ? colors.error : colors.border}`, borderRadius: 12, backgroundColor: colors.primaryLight, color: colors.textPrimary, fontFamily: 'inherit', fontSize: 14, colorScheme: 'light', opacity: disabled ? 0.5 : 1 },
      onClick: (event: { currentTarget: HTMLInputElement }) => { try { event.currentTarget.showPicker?.(); } catch {} },
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    }) : <>
      <Button title={complete ? value.split('-').reverse().join('/') : 'Chọn ngày / tháng / năm'} variant="outline" disabled={disabled} onPress={choose} />
      {open && !disabled && <>
        <DateTimePicker value={date} mode="date" display="spinner" locale="vi-VN" maximumDate={today} onChange={(_, selected) => { if (selected) onChange(dateValue(selected)); }} />
        <Button title="Xong" variant="outline" onPress={() => setOpen(false)} />
      </>}
    </>}
    {!!value && !complete && <Text style={{ fontSize: 12, color: colors.textSecondary }}>Thời gian từ tài liệu: {value}. Chọn lịch để bổ sung ngày, tháng, năm.</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.error }}>{error}</Text>}
  </View>;
}
