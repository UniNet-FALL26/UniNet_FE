import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HubIcon, hubColors as c } from '@/components/projects/hub/ProjectHubUI';

export function FriendOverflowMenu({ name, disabled, onRemove }: { name: string; disabled: boolean; onRemove: () => void }) {
  const trigger = useRef<View>(null), item = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  function close() {
    setAnchor(null);
    if (Platform.OS === 'web') requestAnimationFrame(() => trigger.current?.focus());
  }
  useEffect(() => {
    if (!anchor || Platform.OS !== 'web') return;
    const timer = requestAnimationFrame(() => item.current?.focus());
    const handle = (event: KeyboardEvent) => {
      if (['Escape', 'Tab'].includes(event.key)) { event.preventDefault(); close(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); item.current?.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { cancelAnimationFrame(timer); document.removeEventListener('keydown', handle); };
  }, [anchor]);
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Tùy chọn bạn bè với ${name}`} aria-haspopup="menu" aria-expanded={!!anchor} disabled={disabled}
      onPress={() => trigger.current?.measureInWindow((x, y, w, h) => setAnchor({ x: x + w, y: y + h }))} style={({ pressed }) => [s.trigger, pressed && { backgroundColor: c.blueWash }]}>
      <HubIcon name="more" size={22} color={c.textSecondary} />
    </Pressable>
    {!!anchor && <Modal transparent visible animationType="none" onRequestClose={close}>
      <View style={s.overlay}>
        <Pressable accessible={false} onPress={close} style={StyleSheet.absoluteFill} />
        <View role="menu" accessibilityLabel={`Tùy chọn bạn bè với ${name}`} style={[s.menu, { left: Math.max(8, Math.min(anchor.x - 184, width - 192)), top: Math.max(8, Math.min(anchor.y + 4, height - 64)) }]}>
          <Pressable ref={item} role="menuitem" accessibilityLabel="Hủy kết bạn" onPress={() => { close(); onRemove(); }} style={({ pressed }) => [s.item, pressed && { backgroundColor: '#FFF0F1' }]}>
            <HubIcon name="people" size={18} color={c.error} /><Text style={s.label}>Hủy kết bạn</Text>
          </Pressable>
        </View>
      </View>
    </Modal>}
  </>;
}
const s = StyleSheet.create({
  trigger: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1 },
  menu: { position: 'absolute', width: 184, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFFFFF', boxShadow: '0 8px 28px rgba(24, 49, 91, 0.14)' },
  item: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: c.error },
});
