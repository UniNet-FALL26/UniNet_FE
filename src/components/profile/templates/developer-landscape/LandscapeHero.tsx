import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DeveloperModernTemplateProps } from '../developer-modern/DeveloperModernTemplate';
import { PortfolioIcon } from '../developer-modern/PortfolioPrimitives';
import { ProfilePortrait, type PortraitMode } from './ProfilePortrait';
import type { LandscapeTheme } from './DeveloperLandscapeThemes';
import { landscapeMetrics } from './landscape-data';
import { EditField, EditPhoto, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { profileMedia, isSampleLink } from '@/components/profile/profile-media';

export type LandscapeProps = Omit<DeveloperModernTemplateProps, 'theme'> & { theme: LandscapeTheme; portraitMode?: PortraitMode; showTemplateFooter?: boolean };
export function LandscapeHero({ data, theme, width, portraitMode }: LandscapeProps) {
  const editing = useProfileEditing();
  const compact = width < 768;
  const wide = width >= 1000;
  const words = data.profile.fullName.trim().split(/\s+/);
  const nickname = data.profile.nickname?.trim();
  const title = <View style={s.titles}>
    <EditField field="fullName" label="Họ và tên" color={theme.heroText}><Text role="heading" aria-level={1} style={[s.name, { color: theme.heroText, fontSize: compact ? 36 : 42, lineHeight: compact ? 46 : 52 }]}>{words.slice(0, -1).join(' ')}{words.length > 1 ? ' ' : ''}<Text style={{ color: theme.accent }}>{words.at(-1)}</Text></Text></EditField>
    {(nickname || editing) && <EditField field="nickname" label="Biệt danh" color={theme.heroMuted}><Text testID="landscape-nickname" style={[s.nickname, { color: theme.heroMuted }]}>{nickname || 'Biệt danh'}</Text></EditField>}
    {(data.portfolio.headline || editing) && <EditField field="headline" label="Chức danh" color={theme.heroText}><Text style={[s.headline, { color: theme.heroText }]}>{data.portfolio.headline || 'Thêm chức danh'}</Text></EditField>}
  </View>;
  const details = <View style={s.details}>
    {(data.profile.bio || data.portfolio.careerObjective || editing) && <EditField field="bio" label="Giới thiệu" color={theme.heroMuted}><Text style={[s.bio, { color: theme.heroMuted }]}>{data.profile.bio || data.portfolio.careerObjective || 'Thêm giới thiệu về bạn'}</Text></EditField>}
  </View>;
  return <View testID="landscape-hero" style={[s.hero, { backgroundColor: theme.heroBackground, paddingHorizontal: compact ? 22 : 40 }]}>
    <Image source={(!isSampleLink(data.profile.coverUrl) && profileMedia(data.profile.coverUrl)) || theme.heroBackgroundImage} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" loading="eager" accessible={false} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.heroOverlay }]} />
    <View style={[s.composition, { flexDirection: compact ? 'column' : 'row' }]}>
      <View style={{ width: compact ? '100%' : wide ? '40%' : '55%', minWidth: 0 }}>{title}{!compact && details}</View>
      <View style={{ width: compact ? '100%' : wide ? '32%' : '41%', minWidth: 0 }}><ProfilePortrait profile={data.profile} theme={theme} compact={compact} mode={portraitMode} /></View>
      {compact && details}
      {wide && <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={s.decor}>
        <View style={[s.quote, { borderColor: theme.heroBorder, backgroundColor: theme.heroPanel }]}><Text style={[s.handwriting, { color: theme.heroText }]}>“Better Developers{'\n'}A Brighter Tomorrow”</Text></View>
        <View style={[s.code, { backgroundColor: theme.heroPanel, borderColor: theme.heroBorder }]}><View style={s.dots}>{[0, 1, 2].map(index => <View key={index} style={[s.dot, { backgroundColor: theme.accent, opacity: 1 - index * 0.2 }]} />)}</View><Text style={[s.codeText, { color: theme.heroMuted }]}><Text style={{ color: theme.accent }}>const</Text>{' mindset = {\n  learn: true,\n  build: true,\n  improve: true,\n  repeat: true\n}'}</Text></View>
      </View>}
    </View>
    <EditPhoto field="coverUrl" color={theme.accentStrong} />
  </View>;
}
export function LandscapeStatistics({ data, theme, width }: LandscapeProps) {
  const editing = useProfileEditing();
  const metrics = landscapeMetrics(data.portfolio, !!editing);
  if (!metrics.length || (!editing && data.portfolio.appearance.profile.hiddenSections.includes('stats'))) return null;
  const columns = width < 600 ? 2 : width < 900 ? Math.min(3, metrics.length) : metrics.length;
  return <View testID="landscape-stats" style={[s.stats, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: width < 768 ? 18 : 40, boxShadow: `0 8px 28px ${theme.glow}` }]}>{metrics.map((metric, index) => <View key={metric.label} style={[s.stat, { width: `${100 / columns}%` }]}>
    <View style={[s.statIcon, { backgroundColor: theme.accentSoft }]}><PortfolioIcon name={metric.icon} color={theme.accentStrong} size={22} /></View>
    <View style={s.statText}>{metric.field ? <EditField field={metric.field} label={metric.label} color={theme.accentStrong}><Text style={[s.value, { color: theme.text }]}>{metric.value}</Text></EditField> : <Text style={[s.value, { color: theme.text }]}>{metric.value}</Text>}<Text style={[s.label, { color: theme.muted }]}>{metric.label}</Text></View>
  </View>)}</View>;
}
const s = StyleSheet.create({
  hero: { paddingTop: 32, paddingBottom: 44 }, composition: { alignItems: 'center', justifyContent: 'space-between', gap: 16 }, titles: { gap: 8 }, nickname: { fontSize: 14, lineHeight: 22 }, name: { fontWeight: '800', letterSpacing: -0.8, paddingVertical: 2 }, headline: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  details: { width: '100%' }, bio: { fontSize: 15, lineHeight: 24, marginTop: 12 },
  decor: { width: '24%', minWidth: 0, gap: 20 }, quote: { borderWidth: 1, borderRadius: 10, padding: 16, transform: [{ rotate: '-3deg' }] }, handwriting: { fontSize: 21, lineHeight: 30, fontStyle: 'italic' }, code: { borderRadius: 10, borderWidth: 1, padding: 14 }, dots: { flexDirection: 'row', gap: 6, marginBottom: 12 }, dot: { width: 6, height: 6, borderRadius: 3 }, codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 22 },
  stats: { marginTop: -24, borderWidth: 1, borderRadius: 16, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 28 }, stat: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, statText: { flex: 1, minWidth: 0 }, value: { fontSize: 21, lineHeight: 28, fontWeight: '700' }, label: { fontSize: 12, lineHeight: 18 },
});
