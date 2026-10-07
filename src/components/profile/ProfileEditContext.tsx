import { cloneElement, createContext, isValidElement, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { PortfolioResponse, ProfileTheme } from '@/types/portfolio';
import type { ProfileEditField, ProfileImageTarget } from '@/utils/profile-fields';
import { profileEditorSections, type ProfileEditorSection, type ProfileSectionId } from '@/utils/profile-editor';

export const ProfileEditContext = createContext<{ data: PortfolioResponse; disabled: boolean; onField: (field: ProfileEditField) => void; onPhoto: (target: ProfileImageTarget) => void; onAdd: (section: ProfileEditorSection) => void } | null>(null);
export const useProfileEditing = () => useContext(ProfileEditContext);
export function EditField({ field, label, color, children, overlay = false }: { field: ProfileEditField; label: string; color: string; children: ReactNode; overlay?: boolean }) {
  const editing = useProfileEditing();
  const textRef = useRef<Text | null>(null);
  const textOrigin = useRef({ x: 0, y: 0 });
  const nativeLine = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pencil, setPencil] = useState<{ left: number; top: number } | null>(null);
  const updatePencil = useCallback((next: { left: number; top: number }) => {
    if (!Number.isFinite(next.left) || !Number.isFinite(next.top)) return;
    setPencil(previous => previous?.left === next.left && previous.top === next.top ? previous : next);
  }, []);
  const onLayout = useCallback<NonNullable<TextProps['onLayout']>>(event => {
      textOrigin.current = event.nativeEvent.layout;
      // Web text ranges locate the last rendered line without reserving text width.
      const node = textRef.current as unknown;
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof Element !== 'undefined' && node instanceof Element && node.parentElement) {
        const range = document.createRange(); range.selectNodeContents(node);
        const last = Array.from(range.getClientRects()).at(-1);
        const parent = node.parentElement.getBoundingClientRect();
        if (last) updatePencil({ left: last.right - parent.left + 4, top: last.top - parent.top + last.height / 2 - 8 });
      } else if (nativeLine.current) {
        const last = nativeLine.current;
        updatePencil({ left: textOrigin.current.x + last.x + last.width + 4, top: textOrigin.current.y + last.y + last.height / 2 - 8 });
      }
  }, [updatePencil]);
  const onTextLayout = useCallback<NonNullable<TextProps['onTextLayout']>>(event => {
      const last = event.nativeEvent.lines.at(-1);
      nativeLine.current = last ?? null;
      if (last) updatePencil({ left: textOrigin.current.x + last.x + last.width + 4, top: textOrigin.current.y + last.y + last.height / 2 - 8 });
  }, [updatePencil]);
  if (!editing) return <>{children}</>;
  const content = overlay && isValidElement<TextProps>(children) && children.type === Text ? cloneElement(children, {
    ref: textRef,
    onLayout,
    onTextLayout,
  } as TextProps & { ref: typeof textRef }) : children;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa ${label.toLowerCase()}`} disabled={editing.disabled} hitSlop={overlay ? { right: 24, left: 0, top: 4, bottom: 4 } : undefined} onPress={() => editing.onField(field)} style={({ pressed }) => [overlay ? s.fieldOverlay : s.field, pressed && s.pressed]}>
    {overlay ? content : <View style={s.value}>{children}</View>}
    <View style={overlay ? [s.pencilOverlay, pencil && { right: undefined, bottom: undefined, ...pencil }] : undefined}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} tintColor={color} /></View>
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
  fieldOverlay: { position: 'relative', alignSelf: 'flex-start', maxWidth: '100%' },
  pencilOverlay: { position: 'absolute', right: -20, top: 0, bottom: 0, width: 16, justifyContent: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, maxWidth: '100%' }, value: { flexShrink: 1, minWidth: 0 }, pressed: { opacity: 0.65 },
  camera: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, add: { minWidth: 36, minHeight: 36, paddingHorizontal: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
