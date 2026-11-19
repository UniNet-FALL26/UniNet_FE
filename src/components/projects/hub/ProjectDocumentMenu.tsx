import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HubIcon, hubColors as c, type HubIconName } from './ProjectHubUI';

export function ProjectDocumentMenu({ name, owner, disabled, onAction }: {
  name: string; owner: boolean; disabled: boolean; onAction: (action: 'preview' | 'download' | 'rename' | 'delete') => void;
}) {
  const trigger = useRef<View>(null), items = useRef<(View | null)[]>([]);
  const { width, height } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const actions: { action: 'preview' | 'download' | 'rename' | 'delete'; label: string; icon: HubIconName }[] = [
    { action: 'preview', label: 'Xem trước', icon: 'external' },
    { action: 'download', label: 'Tải xuống', icon: 'save' },
    ...(owner ? [{ action: 'rename' as const, label: 'Đổi tên', icon: 'edit' as const }, { action: 'delete' as const, label: 'Xóa tài liệu', icon: 'trash' as const }] : []),
  ];
  function close() {
    setAnchor(null);
    if (Platform.OS === 'web') requestAnimationFrame(() => trigger.current?.focus());
  }
  useEffect(() => {
    if (!anchor || Platform.OS !== 'web') return;
    let index = 0;
    const timer = requestAnimationFrame(() => items.current[0]?.focus());
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); close(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      index = event.key === 'Home' ? 0 : event.key === 'End' ? actions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % actions.length;
      items.current[index]?.focus();
    };
    document.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(timer); document.removeEventListener('keydown', key); };
  }, [anchor, owner]);
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Thao tác với ${name}`} accessibilityState={{ disabled }} disabled={disabled}
      aria-haspopup="menu" aria-expanded={!!anchor} onPress={() => trigger.current?.measureInWindow((x, y, w, h) => setAnchor({ x: x + w, y: y + h }))}
      style={({ pressed }) => [s.trigger, pressed && { backgroundColor: c.blueWash }]}><HubIcon name="more" size={20} color={c.textSecondary} /></Pressable>
    {anchor && <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }}><Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
        <View role="menu" accessibilityLabel={`Thao tác với ${name}`} style={[s.menu, { left: Math.max(8, Math.min(anchor.x - 180, width - 188)), top: Math.max(8, Math.min(anchor.y + 4, height - actions.length * 36 - 16)) }]}>
          {actions.map((item, index) => <Pressable key={item.action} ref={node => { items.current[index] = node; }} role="menuitem" accessibilityLabel={item.label}
            onPress={() => { close(); onAction(item.action); }} style={({ pressed }) => [s.item, item.action === 'delete' && { backgroundColor: '#FFF1F3' }, pressed && { opacity: 0.65 }]}>
            <HubIcon name={item.icon} size={15} color={item.action === 'delete' ? c.error : c.textSecondary} /><Text style={[s.label, item.action === 'delete' && { color: c.error }]}>{item.label}</Text>
          </Pressable>)}
        </View>
      </View>
    </Modal>}
  </>;
}
const s = StyleSheet.create({
  trigger: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  menu: { position: 'absolute', width: 180, padding: 4, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 9, boxShadow: '0 5px 18px rgba(24,49,91,0.15)' },
  item: { minHeight: 36, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 5 },
  label: { fontSize: 12, color: c.ink },
});
