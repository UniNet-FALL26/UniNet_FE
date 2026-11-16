import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HubIcon, hubColors as c, ui, type HubIconName } from './ProjectHubUI';

export const lines = (text: string) => text.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
export const technologies = (text: string) => [...new Set(text.split(/[,\n]/).map(value => value.trim()).filter(Boolean))];
export const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Chưa thể thực hiện thao tác. Vui lòng thử lại.';
export const validDate = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
export const safeUrl = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
export function openProjectUrl(url: string) { if (safeUrl(url)) void Linking.openURL(url); }
export function Field({ label, value, onChange, multiline = false, placeholder, maxLength, hint }: { label: string; value: string; onChange: (text: string) => void; multiline?: boolean; placeholder?: string; maxLength?: number; hint?: string }) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} maxLength={maxLength} placeholder={placeholder} placeholderTextColor={c.textMuted} style={[ui.input, multiline && styles.textarea]} textAlignVertical={multiline ? 'top' : 'center'} />{hint && <Text style={styles.hint}>{hint}</Text>}</View>;
}
export function Choice<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><View role="radiogroup" aria-label={label} style={styles.choices}>{options.map(option => <Pressable key={option.value} role="radio" aria-checked={value === option.value} onPress={() => onChange(option.value)} style={[styles.choice, value === option.value && styles.chosen]}><Text style={[styles.choiceText, value === option.value && { color: c.primary }]}>{option.label}</Text></Pressable>)}</View></View>;
}
export function FormSection({ title, icon, children }: { title: string; icon?: HubIconName; children: ReactNode }) {
  return <View style={styles.formSection}><View style={styles.formTitle}>{icon && <HubIcon name={icon} />}<Text accessibilityRole="header" aria-level={2} style={ui.heading}>{title}</Text></View>{children}</View>;
}
export function BulletList({ values, empty = 'Chưa bổ sung thông tin.', check = false }: { values: string[]; empty?: string; check?: boolean }) {
  return values.length ? <View style={{ gap: 9 }}>{values.map((text, index) => <View key={index} style={styles.bulletRow}>{check ? <HubIcon name="check" color={c.success} size={17} /> : <View style={styles.bullet} />}<Text style={styles.body}>{text}</Text></View>)}</View> : <Text style={ui.muted}>{empty}</Text>;
}
const styles = StyleSheet.create({
  textarea: { minHeight: 100, lineHeight: 22 }, hint: { color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, choice: { borderWidth: 1, borderColor: c.line, paddingHorizontal: 13, minHeight: 42, paddingVertical: 10, borderRadius: 9 }, chosen: { borderColor: c.primary, backgroundColor: c.blueWash }, choiceText: { color: c.textSecondary, fontWeight: '500', fontSize: 13 },
  formSection: { paddingTop: 24, marginTop: 6, borderTopWidth: 1, borderColor: c.line }, formTitle: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 21 },
  bulletRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginTop: 8 }, body: { fontSize: 14, color: c.ink, lineHeight: 22, flex: 1 },
});
