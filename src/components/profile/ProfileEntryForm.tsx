import { ToastHost } from '@/components/ui/ToastHost';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { CalendarDateInput } from '@/components/ui/CalendarDateInput';
import { ProjectTimelineDateModal } from '@/components/projects/hub/ProjectTimelineDateModal';
import { ProfileTextInput } from './ProfileTextInput';
import { CertificateImageInput } from './CertificateImageInput';
import { colors } from '@/constants/colors';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import { addProfileEntry, updateProfileEntry, updateProfileSkills, profileSkillSelection, profileFormValues, profileSkillOptions, profileDateToIso, type ProfileEditorSection, type ProfileFormField, type ProfileSkillSort } from '@/utils/profile-editor';
import { profileMedia } from './profile-media';

type Props = { section: ProfileEditorSection; data: PortfolioResponse; entryIndex?: number; onAdd: (content: PortfolioContent) => void; onClose: () => void };
export function ProfileEntryForm({ section, data, entryIndex, onAdd, onClose }: Props) {
  const editableSection = section.id === 'education' || section.id === 'certificates' ? section.id : null;
  const editingEntry = editableSection !== null && entryIndex !== undefined;
  const [values, setValues] = useState(() => profileFormValues(data.portfolio, section.id, entryIndex));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(() => profileSkillSelection(data.portfolio, data.skillCatalog ?? []).map(item => item.id));
  const [sort, setSort] = useState<ProfileSkillSort>('name');
  const [editingDate, setEditingDate] = useState<ProfileFormField | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const close = () => { if (!imageBusy) onClose(); };
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
    if (imageBusy) return;
    try { onAdd(editingEntry ? updateProfileEntry(data.portfolio, editableSection, entryIndex, values) : section.id === 'skills' ? updateProfileSkills(data.portfolio, selectedSkills, catalog) : addProfileEntry(data.portfolio, section.id, values, catalog)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Vui lòng kiểm tra thông tin.'); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
      <ToastHost modal /><View accessibilityViewIsModal style={s.dialog}>
        <View style={s.header}><Text role="heading" aria-level={2} style={s.title}>{editingEntry || section.id === 'basic' ? 'Cập nhật' : 'Thêm'} {section.title.toLowerCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng biểu mẫu" disabled={imageBusy} onPress={close} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.fields}>
          {section.id === 'certificates' && <CertificateImageInput value={values.logoUrl ?? ''} onChange={url => update('logoUrl', url)} onBusy={setImageBusy} />}
          {section.fields.filter(field => section.id !== 'skills' || field.kind === 'skill').map((field, index) => field.kind === 'skill' ? <View key={field.key} style={s.skillField}>
            <ProfileTextInput label="Tìm kỹ năng" value={search} onChangeText={setSearch} placeholder="Tìm theo tên hoặc nhóm kỹ năng…" autoFocus multiline={false} />
            <View style={s.sortRow}><Text style={s.hint}>Sắp xếp:</Text>{([['name', 'Tên A–Z'], ['name-desc', 'Tên Z–A'], ['category', 'Theo nhóm']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} aria-pressed={sort === value} onPress={() => setSort(value)} style={[s.sortChoice, sort === value && s.selected]}><Text style={[s.sortText, sort === value && s.selectedText]}>{label}</Text></Pressable>)}</View>
            <View style={s.selectionHeader}><Text style={s.hint}>Đã chọn {selectedSkills.length} kỹ năng</Text>{!!selectedSkills.length && <Pressable accessibilityRole="button" onPress={() => { setSelectedSkills([]); setError(''); }} style={s.sortChoice}><Text style={s.sortText}>Bỏ chọn tất cả</Text></Pressable>}</View>
            {!catalog.length && <Text style={s.hint}>Danh mục kỹ năng hiện chưa có dữ liệu. Vui lòng thử lại sau.</Text>}
            {!!catalog.length && !options.length && <Text style={s.hint}>Không tìm thấy kỹ năng phù hợp.</Text>}
            <View style={s.choices}>{options.map(item => {
              const selected = selectedSkills.includes(item.id);
              return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: selected }} onPress={() => toggleSkill(item.id)} style={[s.choice, selected && s.selected]}><SkillChoiceIcon name={item.name} iconUrl={item.iconUrl} /><Text style={[s.choiceText, selected && s.selectedText]}>{item.name}</Text></Pressable>;
            })}</View>
          </View> : field.kind === 'boolean' ? <Pressable key={field.key} accessibilityRole="checkbox" accessibilityLabel={field.label} accessibilityState={{ checked: values[field.key] === 'true' }} onPress={() => update(field.key, values[field.key] === 'true' ? 'false' : 'true')} style={s.checkbox}><Text style={s.choiceText}>{values[field.key] === 'true' ? '☑' : '☐'} {field.label}</Text></Pressable>
            : field.kind === 'date' ? <CalendarDateInput key={field.key} label={field.label} value={values[field.key]} placeholder={field.placeholder} onChangeText={value => update(field.key, value)} onOpenCalendar={() => setEditingDate(field)} />
            : <ProfileTextInput key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={values[field.key]} placeholder={field.placeholder} onChangeText={value => update(field.key, value)} autoFocus={index === 0} multiline={field.kind !== 'number' && field.kind !== 'year'} minimumHeight={field.multiline ? 88 : 46} maxLength={field.kind === 'number' || field.kind === 'list' ? undefined : field.max ?? (field.kind === 'url' ? 2048 : 2000)} autoCapitalize={field.kind === 'url' || field.kind === 'email' ? 'none' : 'sentences'} keyboardType={field.kind === 'number' ? 'decimal-pad' : field.kind === 'year' ? 'number-pad' : field.kind === 'email' ? 'email-address' : field.kind === 'url' ? 'url' : 'default'} />)}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          <Text style={s.hint}>Thông tin sẽ xuất hiện trong bản xem trước. Bấm “Lưu hồ sơ” để lưu thay đổi.</Text>
        </ScrollView>
        <View style={s.actions}><Button title="Hủy" variant="outline" disabled={imageBusy} onPress={close} style={s.action} textStyle={s.actionText} /><Button title="Xác nhận" disabled={imageBusy} onPress={submit} style={s.action} textStyle={s.actionText} /></View>
      </View>
    </KeyboardAvoidingView>
    {editingDate && <ProjectTimelineDateModal title={`Chọn ${editingDate.label.toLowerCase()}`} value={profileDateToIso(values[editingDate.key] ?? '') ?? ''}
      min={editingDate.key === 'endDate' ? profileDateToIso(values.startDate ?? '') ?? undefined : undefined}
      max={editingDate.key === 'startDate' ? profileDateToIso(values.endDate ?? '') ?? undefined : undefined}
      busy={false} error="" onClose={() => setEditingDate(null)} onConfirm={date => {
        update(editingDate.key, date ? date.split('-').reverse().join('/') : '');
        setEditingDate(null);
      }} />}
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
  skillIcon: { width: 18, height: 18 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }, sortChoice: { minHeight: 32, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' }, sortText: { fontSize: 12, color: colors.primary }, selectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  checkbox: { minHeight: 44, justifyContent: 'center' },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, error: { color: colors.error, fontSize: 13, lineHeight: 20 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderColor: colors.border },
  action: { minHeight: 38, minWidth: 80, paddingHorizontal: 16, borderRadius: 8 }, actionText: { fontSize: 13, fontWeight: '600' },
});
