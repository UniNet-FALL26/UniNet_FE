import { Linking, Text } from 'react-native';
import { isSampleLink } from '@/components/profile/profile-media';
import { PortfolioControl, PortfolioIcon, ui } from '../developer-modern/PortfolioPrimitives';
import type { LandscapeProps } from './LandscapeHero';
import { EditField, useProfileEditing } from '@/components/profile/ProfileEditContext';

export function LandscapeContact({ data, theme, thumbnail }: Pick<LandscapeProps, 'data' | 'theme' | 'thumbnail'>) {
  const editing = useProfileEditing();
  const email = data.portfolio.contactEmail?.trim();
  if (editing) return <EditField field="contactEmail" label="Email liên hệ" color={theme.accent}><Text style={{ color: theme.heroText, fontSize: 14 }}>{email || 'Thêm email liên hệ'}</Text></EditField>;
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/@example\.(com|org|net)$/i.test(email);
  const social = data.portfolio.socialLinks.filter(link => !isSampleLink(link.url) && /^https?:\/\//i.test(link.url));
  const contact = social.find(link => /linkedin/i.test(link.label)) ?? social[0];
  const url = validEmail ? `mailto:${encodeURIComponent(email)}` : contact?.url;
  if (!url) return null;
  const label = validEmail ? 'Liên hệ ngay' : `Liên hệ qua ${contact.label}`;
  return <PortfolioControl thumbnail={thumbnail} accessibilityRole="link" accessibilityLabel={label} onPress={() => { void Linking.openURL(url).catch(() => {}); }} style={({ pressed }) => [{ minHeight: 48, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.accent }, pressed && ui.pressed]}><PortfolioIcon name={validEmail ? 'mail' : 'link'} color={theme.onAccent} size={18} /><Text style={{ fontSize: 13, lineHeight: 20, fontWeight: '700', color: theme.onAccent }}>{label}</Text></PortfolioControl>;
}
