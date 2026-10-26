import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import { addProfileEntry, updateProfileSkills, profileSkillSelection, profileFormValues, profileSkillOptions, type ProfileEditorSection, type ProfileSkillSort } from '@/utils/profile-editor';
import { profileMedia } from './profile-media';

type Props = { section: ProfileEditorSection; data: PortfolioResponse; onAdd: (content: PortfolioContent) => void; onClose: () => void };
export function ProfileEntryForm({ section, data, onAdd, onClose }: Props) {
  const [values, setValues] = useState(() => profileFormValues(data.portfolio, section.id));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(() => profileSkillSelection(data.portfolio, data.skillCatalog ?? []).map(item => item.id));
  const [sort, setSort] = useState<ProfileSkillSort>('name');
  const update = (key: string, value: string) => { setValues(current => ({ ...current, [key]: value })); setError(''); };
  const available = data.skillCatalog ?? [];
  const saved = profileSkillSelection(data.portfolio, available);
  const catalog = [...available, ...saved.filter(item => !available.some(skill => skill.id === item.id))];
  const options = profileSkillOptions(catalog, search, sort);
  const toggleSkill = (id: string) => {
    setError('');
    if (!selectedSkills.includes(id) && selectedSkills.length >= 100) { setError('Hồ sơ chỉ có thể chứa tối đa 100 kỹ năng.'); return; }
    setSelectedSkills(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  };
  const submit = () => {
    try { onAdd(section.id === 'skills' ? updateProfileSkills(data.portfolio, selectedSkills, catalog) : addProfileEntry(data.portfolio, section.id, values, catalog)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Vui lòng kiểm tra thông tin.'); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View accessibilityViewIsModal style={s.dialog}>
        <View style={s.header}><Text role="heading" aria-level={2} style={s.title}>{section.id === 'basic' ? 'Cập nhật' : 'Thêm'} {section.title.toLowerCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng biểu mẫu" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.fields}>
          {section.fields.filter(field => section.id !== 'skills' || field.kind === 'skill').map((field, index) => field.kind === 'skill' ? <View key={field.key} style={s.skillField}>
            <Text style={s.choiceText}>Tìm kỹ năng</Text><TextInput accessibilityLabel="Tìm kỹ năng" value={search} onChangeText={setSearch} placeholder="Tìm theo tên hoặc nhóm kỹ năng…" placeholderTextColor={colors.textSecondary} autoFocus style={s.skillSearch} />
            <View style={s.sortRow}><Text style={s.hint}>Sắp xếp:</Text>{([['name', 'Tên A–Z'], ['name-desc', 'Tên Z–A'], ['category', 'Theo nhóm']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} aria-pressed={sort === value} onPress={() => setSort(value)} style={[s.sortChoice, sort === value && s.selected]}><Text style={[s.sortText, sort === value && s.selectedText]}>{label}</Text></Pressable>)}</View>
            <View style={s.selectionHeader}><Text style={s.hint}>Đã chọn {selectedSkills.length} kỹ năng</Text>{!!selectedSkills.length && <Pressable accessibilityRole="button" onPress={() => { setSelectedSkills([]); setError(''); }} style={s.sortChoice}><Text style={s.sortText}>Bỏ chọn tất cả</Text></Pressable>}</View>
            {!catalog.length && <Text style={s.hint}>Danh mục kỹ năng hiện chưa có dữ liệu. Vui lòng thử lại sau.</Text>}
            {!!catalog.length && !options.length && <Text style={s.hint}>Không tìm thấy kỹ năng phù hợp.</Text>}
            <View style={s.choices}>{options.map(item => {
              const selected = selectedSkills.includes(item.id);
              return <View key={item.id} style={s.choiceWrap}><Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: selected }} onPress={() => toggleSkill(item.id)} style={[s.choice, selected && s.selected, selected && s.removableChoice]}><SkillChoiceIcon name={item.name} iconUrl={item.iconUrl} /><Text style={[s.choiceText, selected && s.selectedText]}>{item.name}</Text></Pressable>{selected && <Pressable accessibilityRole="button" accessibilityLabel={'Bỏ chọn ' + item.name} onPress={() => toggleSkill(item.id)} style={s.removeChoice}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={11} tintColor={colors.primary} /></Pressable>}</View>;
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
function SkillChoiceIcon({ name, iconUrl }: { name: string; iconUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const source = failed ? undefined : profileMedia(iconUrl?.trim());
  return source ? <Image source={source} accessibilityLabel={'Icon ' + name} contentFit="contain" onError={() => setFailed(true)} style={s.skillIcon} /> : <View accessibilityLabel={'Icon mặc định ' + name} style={s.skillIcon}><SymbolView name={{ ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' }} size={18} tintColor={colors.primary} /></View>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderColor: colors.border },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }, close: { minWidth: 44, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.textSecondary, fontSize: 28 },
  fields: { padding: 20, gap: 16 }, skillField: { gap: 12 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6, paddingRight: 5 },
  choice: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, choiceText: { color: colors.textPrimary, fontSize: 12 }, selected: { backgroundColor: colors.primaryLight, borderColor: colors.primary }, selectedText: { color: colors.primary, fontWeight: '700' }, disabled: { opacity: 0.5 },
  skillSearch: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.textPrimary, fontSize: 13 }, skillIcon: { width: 18, height: 18 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }, sortChoice: { minHeight: 32, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' }, sortText: { fontSize: 12, color: colors.primary }, selectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  choiceWrap: { position: 'relative' }, removableChoice: { paddingRight: 18 }, removeChoice: { position: 'absolute', right: -5, top: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkbox: { minHeight: 44, justifyContent: 'center' }, multiline: { minHeight: 96, paddingVertical: 12, textAlignVertical: 'top' },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, error: { color: colors.error, fontSize: 13, lineHeight: 20 }, actions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderColor: colors.border },
});
