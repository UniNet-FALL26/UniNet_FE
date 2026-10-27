import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { notificationTheme as theme } from '@/constants/notification-presentation';
import { notificationCategories } from '@/utils/notifications';

type Props = { value: string; counts: Partial<Record<string, number>>; onChange: (value: string) => void };
type Anchor = { x: number; y: number; width: number; height: number };

export function NotificationCategoryFilter({ value, counts, onChange }: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const trigger = useRef<View>(null), menu = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const compact = width < 640;
  const selected = notificationCategories.find(item => item.value === value) ?? notificationCategories[0];
  const close = useCallback(() => {
    setAnchor(null);
    if (Platform.OS === 'web') requestAnimationFrame(() => (trigger.current as unknown as HTMLElement | null)?.focus());
  }, []);
  useEffect(() => {
    if (!anchor) return;
    const resize = Dimensions.addEventListener('change', close);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const options = Array.from((menu.current as unknown as HTMLElement | null)?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
      if (!options.length) return;
      event.preventDefault();
      const current = options.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[next].focus();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', keyboard);
    return () => { resize.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', keyboard); };
  }, [anchor, close]);
  const menuWidth = Math.min(244, width - 32);
  const top = anchor ? Math.min(anchor.y + anchor.height + 8, Math.max(16, height - 160)) : 16;
  const left = anchor ? Math.max(16, Math.min(anchor.x + anchor.width - menuWidth, width - menuWidth - 16)) : 16;
  return <>
    <Pressable ref={trigger} testID="notification-category-trigger" accessibilityRole="button" accessibilityLabel={'Lọc loại thông báo: ' + selected.label} accessibilityHint="Mở danh sách loại thông báo" accessibilityState={{ expanded: !!anchor }} onPress={() => trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => setAnchor({ x, y, width: measuredWidth, height: measuredHeight }))} style={({ hovered, pressed }) => [s.trigger, (hovered || pressed) && s.hovered]}>
      {!compact && <SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }} size={17} tintColor={theme.blue} />}
      <Text style={s.triggerText}>{selected.label}</Text>
      {!compact && counts[value] !== undefined && <View testID={'notification-count-' + (value || 'all')} style={s.count}><Text style={s.countText}>{counts[value]}</Text></View>}
      <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={16} tintColor={theme.blue} />
    </Pressable>
    <Modal visible={!!anchor} transparent animationType="none" onRequestClose={close} onShow={() => {
      if (Platform.OS === 'web') requestAnimationFrame(() => (menu.current as unknown as HTMLElement | null)?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
    }}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng bộ lọc" onPress={close} style={StyleSheet.absoluteFill} />
        <View ref={menu} accessibilityViewIsModal style={[s.menu, { top, left, width: menuWidth, maxHeight: Math.min(340, height - top - 16) }]}>
          <Text style={s.menuTitle}>Loại thông báo</Text>
          <ScrollView accessibilityRole="radiogroup" accessibilityLabel="Loại thông báo" keyboardShouldPersistTaps="handled" style={s.list}>
            {notificationCategories.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: item.value === value }} onPress={() => { onChange(item.value); close(); }} style={({ hovered, pressed }) => [s.option, item.value === value && s.selectedOption, (hovered || pressed) && s.hovered]}>
              <Text style={[s.optionText, item.value === value && s.selectedText]}>{item.label}</Text>
              <View style={s.check}>{item.value === value && <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor={theme.blue} />}</View>
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  trigger: { minHeight: Platform.OS === 'android' ? 48 : 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: theme.border, borderRadius: 9, backgroundColor: theme.surface }, triggerText: { fontSize: 13, color: theme.blue, fontWeight: '600' }, hovered: { backgroundColor: theme.hovered },
  count: { minWidth: 23, height: 20, paddingHorizontal: 5, borderRadius: 6, backgroundColor: theme.badge, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 12, fontWeight: '700', color: theme.blue }, overlay: { flex: 1 },
  menu: { position: 'absolute', backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 6, boxShadow: '0 8px 28px rgba(16,40,75,0.14)' }, menuTitle: { fontSize: 12, color: theme.secondary, fontWeight: '600', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }, list: { flexShrink: 1 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 8 }, optionText: { flex: 1, fontSize: 14, color: theme.title }, selectedOption: { backgroundColor: theme.badge }, selectedText: { color: theme.blue, fontWeight: '700' }, check: { width: 18, alignItems: 'center' },
});
