import { SymbolView } from 'expo-symbols';
import { SectionAdd } from '@/components/profile/ProfileEditContext';
import { Linking, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import type { PropsWithChildren } from 'react';
import type { ProfileTheme } from '@/types/portfolio';
import { isSampleLink } from '@/components/profile/profile-media';

const symbols = {
  code: { ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  project: { ios: 'square.stack.3d.up', android: 'layers', web: 'layers' },
  skill: { ios: 'cpu', android: 'memory', web: 'memory' },
  journey: { ios: 'point.topleft.down.curvedto.point.bottomright.up', android: 'route', web: 'route' },
  certificate: { ios: 'checkmark.seal', android: 'workspace_premium', web: 'workspace_premium' },
  article: { ios: 'text.book.closed', android: 'article', web: 'article' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  link: { ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' },
  person: { ios: 'person.2', android: 'groups', web: 'groups' },
} as const;
export function PortfolioIcon({ name, color, size = 20 }: { name: keyof typeof symbols; color: string; size?: number }) {
  return <SymbolView name={symbols[name]} size={size} tintColor={color} style={{ width: size, height: size }} />;
}
export function PortfolioControl({ thumbnail, children, style, ...props }: PressableProps & { thumbnail?: boolean }) {
  if (thumbnail) return <View style={typeof style === 'function' ? style({ pressed: false, hovered: false }) : style}>{typeof children === 'function' ? children({ pressed: false, hovered: false }) : children}</View>;
  return <Pressable style={style} {...props}>{children}</Pressable>;
}
export function Chip({ children, theme }: PropsWithChildren<{ theme: ProfileTheme }>) {
  return <View style={[ui.chip, { backgroundColor: theme.accentSoft }]}><Text style={[ui.chipText, { color: theme.accentStrong }]}>{children}</Text></View>;
}
export function PortfolioLink({ label, url, theme, thumbnail, subtle = false }: { label: string; url?: string | null; theme: ProfileTheme; thumbnail?: boolean; subtle?: boolean }) {
  if (thumbnail || isSampleLink(url)) return <Text style={[ui.linkText, { color: theme.accentStrong }]}>{label}</Text>;
  if (!/^https?:\/\//i.test(url!)) return null;
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => { void Linking.openURL(url!).catch(() => {}); }} style={({ pressed }) => [ui.link, subtle && { paddingHorizontal: 0 }, pressed && ui.pressed]}>
    <Text style={[ui.linkText, { color: theme.accentStrong }]}>{label}</Text><PortfolioIcon name="link" size={16} color={theme.accentStrong} />
  </Pressable>;
}
export function SectionTitle({ title, name, theme }: { title: string; name: keyof typeof symbols; theme: ProfileTheme }) {
  return <View style={ui.sectionHeading}><PortfolioIcon name={name} color={theme.accent} /><Text role="heading" aria-level={2} style={[ui.sectionTitle, { color: theme.text }]}>{title}</Text><SectionAdd title={title} theme={theme} /></View>;
}
export const ui = StyleSheet.create({
  body: { fontSize: 13, lineHeight: 20 },
  small: { fontSize: 12, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  chip: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7 },
  chipText: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 8 },
  linkText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
