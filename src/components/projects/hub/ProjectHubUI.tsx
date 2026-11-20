import { SymbolView } from 'expo-symbols';
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { FullProjectImage } from './FullProjectImage';
const modalStack: object[] = [];
const ModalAppearance = createContext(false);
const ChatAppearance = createContext(false);
export const HubPagePresentation = createContext(false);

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
  message: ['bubble.left', 'chat_bubble_outline'],
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
  const inChat = useContext(ChatAppearance);
  const primary = variant === 'primary';
  const tint = primary ? '#FFFFFF' : variant === 'danger' ? colors.error : colors.primary;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    hitSlop={compact ? 4 : undefined} style={({ pressed }) => [ui.action, compact && { minHeight: 36, paddingHorizontal: 13, paddingVertical: 7, gap: 6, borderRadius: 8 }, inModal && modalStyles.action, primary && ui.actionPrimary, inModal && primary && modalStyles.primary, inChat && chatModalStyles.action, inChat && primary && chatModalStyles.primary, variant === 'quiet' && ui.actionQuiet, variant === 'danger' && { borderColor: '#F0C6CC' }, style, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.72 }]}>
    {busy ? <ActivityIndicator size="small" color={tint} /> : icon && <HubIcon name={icon} color={tint} size={compact ? 16 : 18} />}
    <Text style={[ui.actionText, (compact || inModal) && { fontSize: 13 }, { color: inModal && variant === 'secondary' ? hubColors.ink : tint }]}>{title}</Text>
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
export function HubModal({ title, subtitle, onClose, children, footer, wide = true, compact = false, icon = 'folder', maxWidth, appearance = 'default', dismissControl = 'close', contentContainerStyle }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; compact?: boolean; icon?: HubIconName; maxWidth?: number; appearance?: 'default' | 'chat'; dismissControl?: 'close' | 'back'; contentContainerStyle?: StyleProp<ViewStyle> }) {
  const page = useContext(HubPagePresentation);
  const chat = appearance === 'chat';
  const { width, height } = useWindowDimensions();
  const frame = useRef<View>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (page || Platform.OS !== 'web') return;
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
  }, [page]);
  if (page) return <ModalAppearance.Provider value={true}><ChatAppearance.Provider value={chat}>
    <View testID="hub-settings-page" style={pageStyles.page}>
      <View style={pageStyles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onClose} style={pageStyles.back}><HubIcon name="back" size={22} /></Pressable>
        <View style={pageStyles.heading}><Text accessibilityRole="header" style={pageStyles.title}>{title}</Text>{subtitle && <Text style={modalStyles.subtitle}>{subtitle}</Text>}</View>
      </View>
      <ScrollView style={pageStyles.body} contentContainerStyle={[pageStyles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={pageStyles.footer}>{footer}</View>}
    </View>
  </ChatAppearance.Provider></ModalAppearance.Provider>;
  return <ModalAppearance.Provider value={true}><ChatAppearance.Provider value={chat}><Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={[ui.scrim, chat && chatModalStyles.scrim, { padding: width < 600 ? 10 : 28 }]}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
    <View ref={frame} role="dialog" aria-modal={true} accessibilityViewIsModal accessibilityLabel={title} style={[ui.modal, modalStyles.frame, chat && chatModalStyles.frame, { maxWidth: maxWidth ?? (wide ? compact ? 880 : 960 : 600), maxHeight: height - (width < 600 ? 20 : 56) }]}>
      <View style={[ui.modalHead, modalStyles.head, chat && chatModalStyles.head, width < 600 && { paddingHorizontal: 16 }]}>
        {dismissControl === 'back' || (chat && icon === 'back') ? <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onClose} style={[modalStyles.emblem, chat && chatModalStyles.emblem]}><HubIcon name="back" size={18} /></Pressable> : <View style={[modalStyles.emblem, chat && chatModalStyles.emblem]}><HubIcon name={icon} size={chat ? 19 : 18} /></View>}<View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text accessibilityRole="header" aria-level={2} style={[ui.modalTitle, modalStyles.title, chat && chatModalStyles.title, width < 600 && { fontSize: 16, lineHeight: 22 }]}>{title}</Text>{subtitle && <Text style={modalStyles.subtitle}>{subtitle}</Text>}</View>{dismissControl !== 'back' && <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} hitSlop={6} style={[ui.iconButton, modalStyles.close, chat && chatModalStyles.close]}><HubIcon name="close" color={colors.textSecondary} size={17} /></Pressable>}
      </View>
      <ScrollView style={{ flexShrink: 1, backgroundColor: chat ? '#FFFFFF' : '#FCFDFF' }} contentContainerStyle={[ui.modalBody, { padding: chat ? 20 : 18 }, width < 600 && { padding: 16 }, contentContainerStyle]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={[ui.modalFoot, modalStyles.foot, chat && chatModalStyles.foot, width < 600 && { paddingHorizontal: 16 }]}>{footer}</View>}
    </View>
  </View></Modal></ChatAppearance.Provider></ModalAppearance.Provider>;
}
const pageStyles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F2', backgroundColor: '#FFFFFF' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  heading: { flex: 1, minWidth: 0, gap: 3, paddingRight: 16 },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '600', color: '#172B49' },
  body: { flex: 1 }, content: { padding: 16 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F2' },
});
const chatModalStyles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(23,35,58,0.42)' },
  frame: { borderRadius: 20, borderColor: '#E2E8F2', backgroundColor: '#FFFFFF', boxShadow: '0 20px 64px rgba(15,35,70,0.2)' },
  head: { paddingHorizontal: 20, paddingVertical: 15, gap: 12, backgroundColor: '#FBFCFF', borderColor: '#EDF1F7' },
  emblem: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EAF2FF' },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: '#172B49' },
  close: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F3F8' },
  foot: { paddingHorizontal: 20, paddingVertical: 14, flexWrap: 'wrap', backgroundColor: '#FBFCFF', borderColor: '#EDF1F7', gap: 9 },
  action: { minHeight: 38, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 8, borderColor: '#DCE5F2' },
  primary: { backgroundColor: '#1769FF', borderColor: '#1769FF', experimental_backgroundImage: undefined, boxShadow: '0 3px 8px rgba(23,105,255,0.14)' },
});
const modalStyles = StyleSheet.create({
  frame: { borderRadius: 16, borderColor: '#E4E9F7', backgroundColor: '#FCFDFF', boxShadow: '0 18px 60px rgba(23, 42, 88, 0.18)' },
  head: { paddingVertical: 14, paddingHorizontal: 18, gap: 10, backgroundColor: '#FBFCFF', borderColor: '#E9EDF5' },
  emblem: { width: 32, height: 32, borderRadius: 9, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1FF' },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.25 },
  subtitle: { color: '#52617E', fontSize: 12, lineHeight: 17 },
  close: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F0F3FA' },
  foot: { paddingHorizontal: 18, paddingVertical: 12, gap: 8, borderColor: '#E9EDF5', backgroundColor: '#F8FAFE' },
  action: { borderRadius: 8, borderColor: '#CFD9EF', minHeight: 36, paddingHorizontal: 13, paddingVertical: 7 },
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
