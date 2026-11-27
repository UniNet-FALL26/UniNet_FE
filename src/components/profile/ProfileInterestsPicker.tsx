import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { profileInterestOptions } from '@/data/profile-interests';
import type { ProfileTheme } from '@/types/portfolio';
import { ProfileInterestIcon } from './ProfileInterests';
import { ProfileTextInput } from './ProfileTextInput';

const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export function ProfileInterestsPicker({ interests, theme, onApply, onClose }: {
  interests?: string[] | null; theme: ProfileTheme; onApply: (interests: string[]) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(() => new Set((interests ?? []).filter(name => profileInterestOptions.includes(name))));
  const [search, setSearch] = useState('');
  const options = profileInterestOptions.filter(name => normalize(name).includes(normalize(search)));
  const toggle = (name: string) => setSelected(previous => {
    const next = new Set(previous);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View role="dialog" aria-label="Chọn sở thích cá nhân" accessibilityViewIsModal style={[s.dialog, { backgroundColor: theme.surface }]}>
        <View style={[s.header, { borderColor: theme.border }]}>
          <Text role="heading" aria-level={2} style={[s.title, { color: theme.text }]}>Chọn sở thích cá nhân</Text>
          <Text style={[s.hint, { color: theme.muted }]}>Chọn những điều bạn yêu thích từ {profileInterestOptions.length} gợi ý.</Text>
          <ProfileTextInput label="Tìm sở thích" placeholder="Ví dụ: âm nhạc, bơi lội…" value={search} onChangeText={setSearch} />
          <View style={s.summary}>
            <Text accessibilityLiveRegion="polite" style={[s.count, { color: theme.accentStrong }]}>Đã chọn {selected.size} sở thích</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Bỏ chọn tất cả sở thích" disabled={!selected.size} onPress={() => setSelected(new Set())} style={[s.clear, !selected.size && { opacity: 0.45 }]}>
              <Text style={[s.hint, { color: theme.accentStrong }]}>Bỏ chọn tất cả</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.options} keyboardShouldPersistTaps="handled">
          {options.map(name => <Pressable key={name} accessibilityRole="checkbox" accessibilityLabel={name} accessibilityState={{ checked: selected.has(name) }} aria-checked={selected.has(name)} onPress={() => toggle(name)} style={({ pressed }) => [s.option, { borderColor: selected.has(name) ? theme.accentStrong : theme.border, backgroundColor: selected.has(name) ? theme.accentSoft : theme.surface }, pressed && { opacity: 0.75 }]}>
            <ProfileInterestIcon name={name} theme={theme} />
            <Text style={[s.label, { color: selected.has(name) ? theme.accentStrong : theme.text }]}>{name}</Text>
          </Pressable>)}
          {!options.length && <Text style={[s.hint, { color: theme.muted }]}>Không tìm thấy sở thích phù hợp.</Text>}
        </ScrollView>
        <View style={[s.actions, { borderColor: theme.border }]}>
          <Button title="Hủy" variant="outline" onPress={onClose} style={s.action} />
          <Button title="Áp dụng" onPress={() => onApply(profileInterestOptions.filter(name => selected.has(name)))} style={{ ...s.action, backgroundColor: theme.accentStrong }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '90%', borderRadius: 14, overflow: 'hidden' },
  header: { padding: 18, gap: 10, borderBottomWidth: 1 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 20 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  count: { fontSize: 13, fontWeight: '600' },
  clear: { minHeight: 36, justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', padding: 18, gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '500', flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1 },
  action: { minWidth: 92, minHeight: 42 },
});
