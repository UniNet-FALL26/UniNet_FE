import { SymbolView } from 'expo-symbols';
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { FullProjectImage } from './FullProjectImage';
const modalStack: object[] = [];
const ModalAppearance = createContext(false);

export const hubColors = { ...colors, ink: '#111A36', canvas: '#F8FAFE', line: '#E2E8F3', blueWash: '#EAF1FF' };
type SymbolName = ComponentProps<typeof SymbolView>['name'];
const names = {
  folder: ['folder', 'folder'], settings: ['gearshape', 'settings'], camera: ['camera', 'photo_camera'], plus: ['plus', 'add'], close: ['xmark', 'close'], edit: ['pencil', 'edit'],
  back: ['chevron.left', 'chevron_left'], next: ['chevron.right', 'chevron_right'], search: ['magnifyingglass', 'search'],
  person: ['person', 'person_outline'], people: ['person.2', 'groups'], calendar: ['calendar', 'calendar_today'],
  check: ['checkmark.circle', 'check_circle'], clock: ['clock', 'schedule'], document: ['doc.text', 'description'],
  image: ['photo', 'image'], link: ['link', 'link'], external: ['arrow.up.right.square', 'open_in_new'],
  upload: ['arrow.up.doc', 'upload'], book: ['book', 'menu_book'], target: ['scope', 'track_changes'],
  layers: ['square.3.layers.3d', 'layers'], trophy: ['trophy', 'emoji_events'], bulb: ['lightbulb', 'lightbulb_outline'],
  flag: ['flag', 'flag'], info: ['info.circle', 'info'], trash: ['trash', 'delete_outline'],
  share: ['square.and.arrow.up', 'share'], more: ['ellipsis', 'more_horiz'], play: ['play.circle', 'play_circle_outline'],
  invite: ['person.badge.plus', 'person_add'], chevron: ['chevron.down', 'expand_more'], warning: ['exclamationmark.triangle', 'warning_amber'],
  tag: ['tag', 'sell'], save: ['square.and.arrow.down', 'save'],
  globe: ['globe', 'language'], code: ['chevron.left.forwardslash.chevron.right', 'code'],
} as const;
export type HubIconName = keyof typeof names;
export function HubIcon({ name, size = 20, color = colors.primary }: { name: HubIconName; size?: number; color?: string }) {
  const [ios, web] = names[name];
  return <SymbolView name={{ ios, android: web, web } as SymbolName} size={size} tintColor={color} accessible={false} />;
}
export function HubAction({ title, onPress, icon, variant = 'secondary', busy, disabled, testID, compact = false, style }: {
  title: string; onPress: () => void; icon?: HubIconName; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; busy?: boolean; disabled?: boolean; testID?: string; compact?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const inModal = useContext(ModalAppearance);
  const primary = variant === 'primary';
  const tint = primary ? '#FFFFFF' : variant === 'danger' ? colors.error : colors.primary;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    hitSlop={compact ? 4 : undefined} style={({ pressed }) => [ui.action, compact && { minHeight: 36, paddingHorizontal: 13, paddingVertical: 7, gap: 6, borderRadius: 8 }, inModal && modalStyles.action, primary && ui.actionPrimary, inModal && primary && modalStyles.primary, variant === 'quiet' && ui.actionQuiet, variant === 'danger' && { borderColor: '#F0C6CC' }, style, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.72 }]}>
    {busy ? <ActivityIndicator size="small" color={tint} /> : icon && <HubIcon name={icon} color={tint} size={compact ? 16 : 18} />}
    <Text style={[ui.actionText, compact && { fontSize: 13 }, { color: inModal && variant === 'secondary' ? hubColors.ink : tint }]}>{title}</Text>
  </Pressable>;
}
export function HubTags({ values, compact = false }: { values: string[]; compact?: boolean }) {
  return <View style={ui.tags}>{values.map((value, i) => <View key={`${value}-${i}`} style={[ui.tag, compact && { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }]}><Text style={[ui.tagText, compact && { fontSize: 12 }]}>{value}</Text></View>)}</View>;
}
export function HubStatus({ status, compact = false }: { status: number; compact?: boolean }) {
  const label = ['Chờ duyệt', 'Đang thực hiện', 'Hoàn thành', 'Bị từ chối'][status] ?? 'Chưa xác định';
  const done = status === 1 || status === 2;
  return <View style={[ui.status, compact && { paddingHorizontal: 8, paddingVertical: 4 }, { backgroundColor: done ? '#E6F7EC' : '#F0F3F8' }]}><HubIcon name={status === 2 ? 'check' : status === 1 ? 'play' : 'clock'} size={compact ? 14 : 16} color={done ? '#198046' : colors.textSecondary} /><Text style={{ fontSize: compact ? 11 : 12, fontWeight: '600', color: done ? '#198046' : colors.textSecondary }}>{label}</Text></View>;
}
export function ProjectCover({ url, title, height = 160, style, hideTitle = false }: { url: string | null; title: string; height?: number; style?: StyleProp<ViewStyle>; hideTitle?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <View style={[ui.cover, { height }, style]}>{url && !failed ? <FullProjectImage source={{ uri: url }} label={title ? `Ảnh dự án ${title}` : 'Ảnh dự án'} onError={() => setFailed(true)} /> : <View style={ui.coverEmpty}><View style={ui.coverIcon}><HubIcon name="folder" size={38} /></View>{!hideTitle && <Text numberOfLines={1} style={ui.coverInitial}>{title || 'Dự án của bạn'}</Text>}</View>}</View>;
}
export function HubPanel({ title, icon, children, style, compact = false, action }: { title?: string; icon?: HubIconName; children: ReactNode; style?: StyleProp<ViewStyle>; compact?: boolean; action?: ReactNode }) {
  return <View style={[ui.panel, compact && { padding: 16, gap: 10, borderRadius: 11 }, style]}>{title && <View style={[ui.sectionTitle, compact && { gap: 8 }, !!action && { alignItems: 'center' }]}>{icon && <HubIcon name={icon} size={compact ? 18 : 20} />}<Text accessibilityRole="header" aria-level={2} style={[ui.heading, compact && { fontSize: 15 }, !!action && { flex: 1, minWidth: 0 }]}>{title}</Text>{action}</View>}{children}</View>;
}
export function HubModal({ title, subtitle, onClose, children, footer, wide = true, compact = false, icon = 'folder' }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; compact?: boolean; icon?: HubIconName }) {
  const { width, height } = useWindowDimensions();
  const frame = useRef<View>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.activeElement as HTMLElement | null;
    const node = frame.current as unknown as HTMLElement | null;
    const marker = {}; modalStack.push(marker);
    const topmost = () => modalStack[modalStack.length - 1] === marker;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>('button, [role="button"], input, textarea, select, [tabindex="0"]') ?? []).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true' && el.offsetParent !== null);
    const timer = requestAnimationFrame(() => { if (topmost()) focusables()[0]?.focus(); });
    const handle = (event: KeyboardEvent) => {
      if (!topmost()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.key !== 'Tab') return;
      const elements = focusables(); const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (topmost() && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
    };
    document.addEventListener('keydown', handle, true);
    document.addEventListener('keyup', handleKeyUp, true);
    return () => { cancelAnimationFrame(timer); document.removeEventListener('keydown', handle, true); document.removeEventListener('keyup', handleKeyUp, true); const index = modalStack.indexOf(marker); if (index !== -1) modalStack.splice(index, 1); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <ModalAppearance.Provider value={true}><Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={[ui.scrim, { padding: width < 600 ? 10 : 28 }]}>
    <View ref={frame} role="dialog" aria-modal={true} accessibilityViewIsModal accessibilityLabel={title} style={[ui.modal, modalStyles.frame, { maxWidth: wide ? compact ? 1000 : 1160 : 700, maxHeight: height - (width < 600 ? 20 : 56) }]}>
      <View style={[ui.modalHead, modalStyles.head, width < 600 && { padding: 16, gap: 12 }]}>
        <View pointerEvents="none" aria-hidden style={modalStyles.wave} /><View pointerEvents="none" aria-hidden style={modalStyles.waveFront} />
        <View style={modalStyles.emblem}><HubIcon name={icon} size={23} color="#FFFFFF" /></View><View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text accessibilityRole="header" aria-level={2} style={[ui.modalTitle, modalStyles.title, compact && { fontSize: 21 }, width < 600 && { fontSize: 18 }]}>{title}</Text>{subtitle && <Text style={modalStyles.subtitle}>{subtitle}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={[ui.iconButton, modalStyles.close]}><HubIcon name="close" color={colors.textSecondary} size={18} /></Pressable>
      </View>
      <ScrollView style={{ flexShrink: 1, backgroundColor: '#FCFDFF' }} contentContainerStyle={[ui.modalBody, { padding: 24 }, width < 600 && { padding: 16 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={[ui.modalFoot, modalStyles.foot, width < 600 && { paddingHorizontal: 16 }]}>{footer}</View>}
    </View>
  </View></Modal></ModalAppearance.Provider>;
}
const modalStyles = StyleSheet.create({
  frame: { borderRadius: 22, borderColor: '#E4E9F7', backgroundColor: '#FCFDFF', boxShadow: '0 24px 80px rgba(23, 42, 88, 0.22)' },
  head: { paddingVertical: 18, paddingHorizontal: 24, gap: 16, backgroundColor: '#F5F8FF', experimental_backgroundImage: 'linear-gradient(115deg, #FFFFFF, #F0F5FF)', borderColor: '#E5ECFC', overflow: 'hidden' },
  wave: { position: 'absolute', width: 250, height: 100, borderRadius: 125, bottom: -75, right: -20, backgroundColor: '#E3ECFF', transform: [{ rotate: '-20deg' }] },
  waveFront: { position: 'absolute', width: 180, height: 90, borderRadius: 90, bottom: -73, right: -50, backgroundColor: '#D2E1FF', transform: [{ rotate: '-24deg' }] },
  emblem: { width: 44, height: 44, borderRadius: 13, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2471FF', experimental_backgroundImage: 'linear-gradient(145deg, #4990FF, #1050F6)', boxShadow: '0 6px 14px rgba(30, 92, 235, 0.24)' },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#52617E', fontSize: 12, lineHeight: 18 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAF0FC', alignSelf: 'flex-start' },
  foot: { paddingHorizontal: 24, paddingVertical: 14, gap: 12, borderColor: '#E6ECF8', backgroundColor: '#F7F9FE', experimental_backgroundImage: 'linear-gradient(100deg, #FBFCFF, #F2F6FF)' },
  action: { borderRadius: 10, borderColor: '#CFD9EF', minHeight: 38 },
  primary: { backgroundColor: '#1252FF', borderColor: '#286BFF', experimental_backgroundImage: 'linear-gradient(180deg, #287BFF, #043DFF)', boxShadow: '0 3px 7px rgba(26, 83, 235, 0.16)' },
});
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
