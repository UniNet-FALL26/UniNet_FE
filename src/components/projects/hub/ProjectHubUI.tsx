import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

export const hubColors = { ...colors, ink: '#111A36', canvas: '#F8FAFE', line: '#E2E8F3', blueWash: '#EAF1FF' };
type SymbolName = ComponentProps<typeof SymbolView>['name'];
const names = {
  folder: ['folder', 'folder'], plus: ['plus', 'add'], close: ['xmark', 'close'], edit: ['pencil', 'edit'],
  back: ['chevron.left', 'chevron_left'], next: ['chevron.right', 'chevron_right'], search: ['magnifyingglass', 'search'],
  person: ['person', 'person_outline'], people: ['person.2', 'groups'], calendar: ['calendar', 'calendar_today'],
  check: ['checkmark.circle', 'check_circle'], clock: ['clock', 'schedule'], document: ['doc.text', 'description'],
  image: ['photo', 'image'], link: ['link', 'link'], external: ['arrow.up.right.square', 'open_in_new'],
  upload: ['arrow.up.doc', 'upload'], book: ['book', 'menu_book'], target: ['scope', 'track_changes'],
  layers: ['square.3.layers.3d', 'layers'], trophy: ['trophy', 'emoji_events'], bulb: ['lightbulb', 'lightbulb_outline'],
  flag: ['flag', 'flag'], info: ['info.circle', 'info'], trash: ['trash', 'delete_outline'],
  share: ['square.and.arrow.up', 'share'], more: ['ellipsis', 'more_horiz'], play: ['play.circle', 'play_circle_outline'],
  invite: ['person.badge.plus', 'person_add'], chevron: ['chevron.down', 'expand_more'], warning: ['exclamationmark.triangle', 'warning_amber'],
} as const;
export type HubIconName = keyof typeof names;
export function HubIcon({ name, size = 20, color = colors.primary }: { name: HubIconName; size?: number; color?: string }) {
  const [ios, web] = names[name];
  return <SymbolView name={{ ios, android: web, web } as SymbolName} size={size} tintColor={color} accessible={false} />;
}
export function HubAction({ title, onPress, icon, variant = 'secondary', busy, disabled, testID }: {
  title: string; onPress: () => void; icon?: HubIconName; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; busy?: boolean; disabled?: boolean; testID?: string;
}) {
  const primary = variant === 'primary';
  const tint = primary ? '#FFFFFF' : variant === 'danger' ? colors.error : colors.primary;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [ui.action, primary && ui.actionPrimary, variant === 'quiet' && ui.actionQuiet, variant === 'danger' && { borderColor: '#F0C6CC' }, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.72 }]}>
    {busy ? <ActivityIndicator size="small" color={tint} /> : icon && <HubIcon name={icon} color={tint} size={18} />}
    <Text style={[ui.actionText, { color: tint }]}>{title}</Text>
  </Pressable>;
}
export function HubTags({ values }: { values: string[] }) {
  return <View style={ui.tags}>{values.map((value, i) => <View key={`${value}-${i}`} style={ui.tag}><Text style={ui.tagText}>{value}</Text></View>)}</View>;
}
export function HubStatus({ status }: { status: number }) {
  const label = ['Chờ duyệt', 'Đang thực hiện', 'Hoàn thành', 'Bị từ chối'][status] ?? 'Chưa xác định';
  const done = status === 1 || status === 2;
  return <View style={[ui.status, { backgroundColor: done ? '#E6F7EC' : '#F0F3F8' }]}><HubIcon name={status === 2 ? 'check' : status === 1 ? 'play' : 'clock'} size={16} color={done ? '#198046' : colors.textSecondary} /><Text style={{ fontSize: 12, fontWeight: '600', color: done ? '#198046' : colors.textSecondary }}>{label}</Text></View>;
}
export function ProjectCover({ url, title, height = 160, style }: { url: string | null; title: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <View style={[ui.cover, { height }, style]}>{url && !failed ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Ảnh dự án ${title}`} onError={() => setFailed(true)} /> : <View style={ui.coverEmpty}><View style={ui.coverIcon}><HubIcon name="folder" size={38} /></View><Text numberOfLines={1} style={ui.coverInitial}>{title || 'Dự án của bạn'}</Text></View>}</View>;
}
export function HubPanel({ title, icon, children, style }: { title?: string; icon?: HubIconName; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[ui.panel, style]}>{title && <View style={ui.sectionTitle}>{icon && <HubIcon name={icon} />}<Text accessibilityRole="header" aria-level={2} style={ui.heading}>{title}</Text></View>}{children}</View>;
}
export function HubModal({ title, subtitle, onClose, children, footer, wide = true }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { width, height } = useWindowDimensions();
  const frame = useRef<View>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.activeElement as HTMLElement | null;
    const node = frame.current as unknown as HTMLElement | null;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>('button, [role="button"], input, textarea, select, [tabindex="0"]') ?? []).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true' && el.offsetParent !== null);
    const timer = requestAnimationFrame(() => focusables()[0]?.focus());
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = focusables(); const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { cancelAnimationFrame(timer); document.removeEventListener('keydown', handle); previous?.focus(); };
  }, []);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={[ui.scrim, { padding: width < 600 ? 10 : 28 }]}>
    <View ref={frame} accessibilityViewIsModal accessibilityLabel={title} style={[ui.modal, { maxWidth: wide ? 1160 : 700, maxHeight: height - (width < 600 ? 20 : 56) }]}>
      <View style={ui.modalHead}><View style={ui.modalEmblem}><HubIcon name="folder" size={27} /></View><View style={{ flex: 1, gap: 5 }}><Text accessibilityRole="header" aria-level={2} style={ui.modalTitle}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={ui.iconButton}><HubIcon name="close" color={colors.textSecondary} size={24} /></Pressable></View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={[ui.modalBody, width < 600 && { padding: 18 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={ui.modalFoot}>{footer}</View>}
    </View>
  </View></Modal>;
}
export const ui = StyleSheet.create({
  action: { minHeight: 44, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#CCD9ED', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary }, actionQuiet: { borderColor: 'transparent', backgroundColor: 'transparent' }, actionText: { fontSize: 14, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tag: { backgroundColor: '#EAF1FF', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6 }, tagText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, alignSelf: 'flex-start' },
  cover: { backgroundColor: '#EDF3FD', overflow: 'hidden', borderRadius: 12 }, coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }, coverIcon: { padding: 17, borderRadius: 18, backgroundColor: '#DFEAFE' }, coverInitial: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  panel: { padding: 22, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F3', backgroundColor: '#FFFFFF', gap: 14 }, sectionTitle: { flexDirection: 'row', gap: 10, alignItems: 'center' }, heading: { color: '#111A36', fontSize: 17, fontWeight: '700' }, muted: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  scrim: { flex: 1, backgroundColor: 'rgba(17,26,54,0.45)', justifyContent: 'center', alignItems: 'center' }, modal: { width: '100%', borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: '#EDF0F7' }, modalHead: { padding: 24, borderBottomWidth: 1, borderColor: '#E9EDF5', flexDirection: 'row', gap: 16, alignItems: 'center' }, modalEmblem: { width: 55, height: 55, borderRadius: 13, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, modalTitle: { fontSize: 24, fontWeight: '700', color: '#111A36' }, modalBody: { padding: 30 }, modalFoot: { paddingHorizontal: 24, paddingVertical: 18, borderTopWidth: 1, borderColor: '#E9EDF5', flexDirection: 'row', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#CCD6E8', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 11, color: '#14233B', backgroundColor: '#FFFFFF', fontSize: 14 }, label: { color: '#111A36', fontWeight: '600', fontSize: 14, marginBottom: 8 }, field: { marginBottom: 22 }, error: { color: colors.error, fontSize: 13, lineHeight: 20 },
});
