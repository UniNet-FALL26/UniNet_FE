import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { LandscapeContact } from './LandscapeContact';
import { PortfolioLink, ui } from '../developer-modern/PortfolioPrimitives';
import { isSampleLink } from '@/components/profile/profile-media';
import type { LandscapeProps } from './LandscapeHero';
import { SectionAdd, useProfileEditing } from '@/components/profile/ProfileEditContext';

export function LandscapeFooter({ data, theme, width, thumbnail, showTemplateFooter = true }: LandscapeProps) {
  const editing = useProfileEditing();
  const compact = width < 768;
  const contactVisible = !!editing || !data.portfolio.appearance.profile.hiddenSections.includes('contact');
  const social = contactVisible ? data.portfolio.socialLinks.filter(link => !isSampleLink(link.url)) : [];
  return <View>
    {contactVisible && <View testID="landscape-contact" style={[s.cta, { backgroundColor: theme.ctaBackground, flexDirection: compact ? 'column' : 'row', paddingHorizontal: compact ? 22 : 40 }]}>
      <Image source={theme.ctaBackgroundImage} contentFit="cover" accessible={false} loading="lazy" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.heroOverlay }]} />
      {!compact && <Text aria-hidden accessible={false} style={[s.handwriting, { color: theme.accent }]}>Let’s build{'\n'}something amazing!</Text>}
      <View style={s.copy}><Text role="heading" aria-level={2} style={[s.title, { color: theme.heroText }]}>Biến ý tưởng thành sản phẩm thực tế</Text><Text style={[s.body, { color: theme.heroMuted }]}>Cùng trao đổi về công nghệ, những ý tưởng mới và cơ hội hợp tác.</Text></View>
      <View style={s.contactActions}><LandscapeContact data={data} theme={theme} thumbnail={thumbnail} /></View>
    </View>}
    {showTemplateFooter && <View testID="landscape-footer" style={[s.footer, { backgroundColor: theme.footerBackground, paddingHorizontal: compact ? 22 : 40 }]}>
      <View style={[s.footerRow, compact && { flexDirection: 'column', alignItems: 'flex-start' }]}><View style={s.identity}><Text style={[s.monogram, { color: theme.accent }]}>{data.profile.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()}</Text><View style={{ flex: 1, minWidth: 0 }}><Text style={[s.identityName, { color: theme.heroText }]}>{data.profile.fullName}</Text>{!!data.portfolio.headline && <Text style={[s.small, { color: theme.heroMuted }]}>{data.portfolio.headline}</Text>}</View></View>
        <View style={ui.chips}>{social.map((link, index) => <PortfolioLink key={`${link.label}-${index}`} label={link.label} url={link.url} theme={{ ...theme, accentStrong: theme.heroText }} thumbnail={thumbnail} />)}<SectionAdd title="Liên kết cá nhân" theme={theme} /></View>
      </View><Text style={[s.small, { color: theme.heroMuted, textAlign: compact ? 'left' : 'right', marginTop: 16 }]}>© {new Date().getFullYear()} {data.profile.fullName}. All rights reserved.</Text>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  cta: { paddingVertical: 32, gap: 24, alignItems: 'center' }, handwriting: { width: '22%', fontSize: 21, lineHeight: 30, fontStyle: 'italic' }, copy: { flex: 1, minWidth: 0 }, title: { fontSize: 22, lineHeight: 30, fontWeight: '700' }, body: { fontSize: 14, lineHeight: 23, marginTop: 8 }, contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  footer: { paddingVertical: 24 }, footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '100%', flexShrink: 1 }, monogram: { fontSize: 30, lineHeight: 38, fontWeight: '800' }, identityName: { fontSize: 14, lineHeight: 22, fontWeight: '700' }, small: { fontSize: 12, lineHeight: 19 },
});
