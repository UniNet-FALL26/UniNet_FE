import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { PortfolioResponse, ProfileTheme } from '@/types/portfolio';
import type { ProfileEditField, ProfileImageTarget } from '@/utils/profile-fields';
import { profileEditorSections, type ProfileEditorSection, type ProfileSectionId } from '@/utils/profile-editor';

export const ProfileEditContext = createContext<{ data: PortfolioResponse; disabled: boolean; onField: (field: ProfileEditField) => void; onPhoto: (target: ProfileImageTarget) => void; onAdd: (section: ProfileEditorSection) => void } | null>(null);
export const useProfileEditing = () => useContext(ProfileEditContext);
export function EditField({ field, label, color, children }: { field: ProfileEditField; label: string; color: string; children: ReactNode }) {
  const editing = useProfileEditing();
  if (!editing) return <>{children}</>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa ${label.toLowerCase()}`} disabled={editing.disabled} onPress={() => editing.onField(field)} style={({ pressed }) => [s.field, pressed && s.pressed]}>
    <View style={s.value}>{children}</View><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} tintColor={color} />
  </Pressable>;
}
export function EditPhoto({ field = 'avatarUrl', color, right = 12, bottom = 12, entry, size = 36 }: { field?: 'avatarUrl' | 'coverUrl'; color: string; right?: number | `${number}%`; bottom?: number; size?: number; entry?: { section: ProfileImageTarget['section']; item: object; label: string } }) {
  const editing = useProfileEditing();
  if (!editing) return null;
  const press = () => {
    if (entry) {
      const index = (editing.data.portfolio[entry.section] as readonly object[]).indexOf(entry.item);
      if (index >= 0) editing.onPhoto({ section: entry.section, index });
    } else editing.onField(field);
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={entry ? `Đổi ảnh ${entry.label}` : field === 'avatarUrl' ? 'Đổi ảnh đại diện' : 'Đổi ảnh bìa'} disabled={editing.disabled} hitSlop={size < 36 ? 8 : 4} onPress={press} style={({ pressed }) => [s.camera, { right, bottom, width: size, height: size }, pressed && s.pressed]}><SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={size < 36 ? 14 : 20} tintColor={color} /></Pressable>;
}
export function SectionAdd({ title, theme }: { title: string; theme: ProfileTheme }) {
  const editing = useProfileEditing();
  if (!editing) return null;
  const ids: ProfileSectionId[] = /Hành trình/.test(title) ? ['education', 'experience'] : /Kỹ năng/.test(title) ? ['skills'] : /Dự án/.test(title) ? ['projects'] : /Chứng chỉ/.test(title) ? ['certificates'] : /Blog|Bài viết/.test(title) ? ['articles'] : /Hoạt động/.test(title) ? ['activities'] : /Ngôn ngữ/.test(title) ? ['languages'] : /Liên kết/.test(title) ? ['socialLinks'] : [];
  return <View style={s.controls}>{ids.map(id => {
    const original = profileEditorSections.find(item => item.id === id)!;
    const section = id === 'projects' && title !== 'Dự án nổi bật' ? { ...original, fields: original.fields.filter(field => field.key !== 'featured') } : original;
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Thêm ${section.title.toLowerCase()}`} disabled={editing.disabled} onPress={() => editing.onAdd(section)} style={({ pressed }) => [s.add, { backgroundColor: theme.accentSoft }, pressed && s.pressed]}><SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={theme.accentStrong} />{ids.length > 1 && <Text style={{ color: theme.accentStrong, fontSize: 11 }}>{section.title}</Text>}</Pressable>;
  })}</View>;
}
const s = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, maxWidth: '100%' }, value: { flexShrink: 1, minWidth: 0 }, pressed: { opacity: 0.65 },
  camera: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, add: { minWidth: 36, minHeight: 36, paddingHorizontal: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
