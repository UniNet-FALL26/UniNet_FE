import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import { addProfileEntry, profileFormValues, type ProfileEditorSection } from '@/utils/profile-editor';

type Props = { section: ProfileEditorSection; data: PortfolioResponse; onAdd: (content: PortfolioContent) => void; onClose: () => void };
export function ProfileEntryForm({ section, data, onAdd, onClose }: Props) {
  const [values, setValues] = useState(() => profileFormValues(data.portfolio, section.id));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const update = (key: string, value: string) => { setValues(current => ({ ...current, [key]: value })); setError(''); };
  const catalog = data.skillCatalog ?? [];
  const submit = () => {
    try { onAdd(addProfileEntry(data.portfolio, section.id, values, catalog)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Vui lòng kiểm tra thông tin.'); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View accessibilityViewIsModal style={s.dialog}>
        <View style={s.header}><Text role="heading" aria-level={2} style={s.title}>{section.id === 'basic' ? 'Cập nhật' : 'Thêm'} {section.title.toLowerCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng biểu mẫu" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.fields}>
          {section.fields.map((field, index) => field.kind === 'skill' ? <View key={field.key} style={s.skillField}>
            <Input label="Tìm kỹ năng" value={search} onChangeText={setSearch} autoFocus />
            {!catalog.length && <Text style={s.hint}>Danh mục kỹ năng hiện chưa có dữ liệu. Vui lòng thử lại sau.</Text>}
            <View style={s.choices}>{catalog.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map(item => {
              const selected = values.skillId === item.id;
              const exists = data.portfolio.skills.some(skill => skill.skillId === item.id || skill.name.toLowerCase() === item.name.toLowerCase());
              return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected, disabled: exists }} aria-pressed={selected} disabled={exists} onPress={() => update('skillId', item.id)} style={[s.choice, selected && s.selected, exists && s.disabled]}><Text style={[s.choiceText, selected && s.selectedText]}>{item.name}{exists ? ' · Đã có' : selected ? ' ✓' : ''}</Text></Pressable>;
            })}</View>
          </View> : field.kind === 'boolean' ? <Pressable key={field.key} accessibilityRole="checkbox" accessibilityLabel={field.label} accessibilityState={{ checked: values[field.key] === 'true' }} onPress={() => update(field.key, values[field.key] === 'true' ? 'false' : 'true')} style={s.checkbox}><Text style={s.choiceText}>{values[field.key] === 'true' ? '☑' : '☐'} {field.label}</Text></Pressable>
            : <Input key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={values[field.key]} onChangeText={value => update(field.key, value)} autoFocus={index === 0} multiline={field.multiline} style={field.multiline ? s.multiline : undefined} maxLength={field.kind === 'number' || field.kind === 'list' ? undefined : field.max ?? (field.kind === 'url' ? 2048 : 2000)} autoCapitalize={field.kind === 'url' || field.kind === 'email' ? 'none' : 'sentences'} keyboardType={field.kind === 'number' ? 'decimal-pad' : field.kind === 'email' ? 'email-address' : field.kind === 'url' ? 'url' : 'default'} />)}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          <Text style={s.hint}>Thông tin sẽ xuất hiện trong bản xem trước. Bấm “Lưu hồ sơ” để lưu thay đổi.</Text>
        </ScrollView>
        <View style={s.actions}><Button title="Hủy" variant="outline" onPress={onClose} style={{ flex: 1 }} /><Button title="Xác nhận" onPress={submit} style={{ flex: 1 }} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderColor: colors.border },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }, close: { minWidth: 44, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.textSecondary, fontSize: 28 },
  fields: { padding: 20, gap: 16 }, skillField: { gap: 12 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, choiceText: { color: colors.textPrimary, fontSize: 14 }, selected: { backgroundColor: colors.primaryLight, borderColor: colors.primary }, selectedText: { color: colors.primary, fontWeight: '700' }, disabled: { opacity: 0.5 },
  checkbox: { minHeight: 44, justifyContent: 'center' }, multiline: { minHeight: 96, paddingVertical: 12, textAlignVertical: 'top' },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, error: { color: colors.error, fontSize: 13, lineHeight: 20 }, actions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderColor: colors.border },
});
