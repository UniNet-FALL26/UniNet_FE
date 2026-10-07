import { Image } from 'expo-image';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import type { DeveloperModernTemplateProps } from '../developer-modern/DeveloperModernTemplate';
import { PortfolioControl, PortfolioIcon, ui } from '../developer-modern/PortfolioPrimitives';
import { ProfilePortrait } from './ProfilePortrait';
import { EditField, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { portfolioMetrics, type ProfileEditField } from '@/utils/profile-fields';

export function ShowcaseContact({ data, theme, thumbnail }: Pick<DeveloperModernTemplateProps, 'data' | 'theme' | 'thumbnail'>) {
  const editing = useProfileEditing();
  const email = data.portfolio.contactEmail;
  const hasContact = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/@example\.(com|org|net)$/i.test(email);
  if (editing) return hasContact
    ? <EditField overlay field="contactEmail" label="Email liên hệ" color={theme.accent}><View style={[s.button, { backgroundColor: theme.accent }]}><Text style={[s.buttonText, { color: theme.onAccent }]}>Liên hệ ngay</Text><PortfolioIcon name="mail" color={theme.onAccent} size={18} /></View></EditField>
    : <View style={s.contactPlaceholder}><EditField overlay field="contactEmail" label="Email liên hệ" color={theme.accent}><Text style={[s.buttonText, { color: theme.heroMuted }]}>{email || 'Thêm email liên hệ'}</Text></EditField></View>;
  if (!hasContact) return null;
  return <PortfolioControl thumbnail={thumbnail} accessibilityRole="link" accessibilityLabel="Liên hệ qua email" onPress={() => { void Linking.openURL(`mailto:${encodeURIComponent(email)}`).catch(() => {}); }} style={({ pressed }) => [s.button, { backgroundColor: theme.accent }, pressed && ui.pressed]}><Text style={[s.buttonText, { color: theme.onAccent }]}>Liên hệ ngay</Text><PortfolioIcon name="mail" color={theme.onAccent} size={18} /></PortfolioControl>;
}

export function ShowcaseHero({ data, theme, width, thumbnail }: DeveloperModernTemplateProps) {
  const editing = useProfileEditing();
  const { profile, portfolio } = data;
  const compact = width < 768;
  const desktop = thumbnail || width >= 1024;
  const name = profile.fullName.trim().split(/\s+/);
  const title = <View style={s.titles}>
    <EditField overlay field="fullName" label="Họ và tên" color={theme.heroText}><Text role="heading" aria-level={1} style={[s.name, { color: theme.heroText, fontSize: compact ? 36 : desktop ? 46 : 40, lineHeight: compact ? 46 : 56 }]}>{name.slice(0, -1).join(' ')}{name.length > 1 ? ' ' : ''}<Text style={{ color: theme.accent }}>{name.at(-1)}</Text></Text></EditField>
    {(profile.nickname || editing) && <EditField overlay field="nickname" label="Biệt danh" color={theme.heroMuted}><Text style={[s.nickname, { color: theme.heroMuted }]}>@{profile.nickname || 'Biệt danh'}</Text></EditField>}
    <EditField overlay field="headline" label="Chức danh" color={theme.heroText}><Text style={[s.headline, { color: theme.heroText }]}>{portfolio.headline || (editing ? 'Thêm chức danh' : '')}</Text></EditField>
  </View>;
  const details = <View style={s.details}>
    {(profile.bio || portfolio.careerObjective || editing) && <EditField overlay field="bio" label="Giới thiệu" color={theme.heroMuted}><Text style={[s.bio, { color: theme.heroMuted }]}>{profile.bio || portfolio.careerObjective || 'Thêm giới thiệu về bạn'}</Text></EditField>}
    <View style={[s.actions, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
      <ShowcaseContact data={data} theme={theme} thumbnail={thumbnail} />
    </View>
  </View>;
  const metrics = portfolioMetrics(portfolio);
  const stats: { value: string; label: string; field?: ProfileEditField }[] = [
    { value: `${metrics.years}+`, label: 'Năm kinh nghiệm', field: 'yearsOfExperience' },
    { value: `${metrics.projects}+`, label: 'Dự án đã xây dựng' },
    { value: metrics.gpa || (editing ? 'Nhập GPA' : `${metrics.technologies}`), label: metrics.gpa || editing ? 'GPA tại trường' : 'Kỹ năng', field: metrics.gpa || editing ? 'gpa' : undefined },
  ];
  return <View testID="showcase-hero" style={[s.hero, { backgroundColor: thumbnail ? theme.page : theme.heroBackground, paddingHorizontal: compact ? 22 : 40 }]}>
    {/* Keep the scaled thumbnail edge light so the dark background cannot bleed below the curve. */}
    {thumbnail && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { bottom: 4, backgroundColor: theme.heroBackground }]} />}
    <View style={[s.composition, { flexDirection: compact ? 'column' : 'row' }]}>
      <View style={{ width: compact ? '100%' : desktop ? '39%' : '55%', minWidth: 0 }}>{title}{!compact && details}</View>
      <View style={{ width: compact ? '100%' : desktop ? '31%' : '41%', minWidth: 0 }}><ProfilePortrait profile={profile} theme={theme} compact={compact} /></View>
      {compact && details}
      {desktop && <View style={{ width: '26%', minWidth: 0, gap: 16 }}>
        <View style={[s.code, { backgroundColor: theme.heroPanel, borderColor: theme.heroBorder }]}>
          <View style={s.windowDots}>{[0, 1, 2].map(item => <View key={item} style={[s.dot, { backgroundColor: theme.accent, opacity: 1 - item * 0.2 }]} />)}</View>
          <Text style={[s.codeText, { color: theme.heroMuted }]}><Text style={{ color: theme.accent }}>const</Text>{' developer = {\n  name: '}{JSON.stringify(profile.fullName)}{',\n  focus: "Build useful products",\n  passion: "Technology & People",\n  goal: "Create real value"\n}'}</Text>
        </View>
        <Text accessible={false} style={[s.handwriting, { color: theme.accent }]}>Build · Learn{'\n'}Grow · Together ↗</Text>
      </View>}
    </View>
    <View testID="showcase-stats" style={[s.stats, { borderColor: theme.heroBorder }]}>
      {!compact && <Image testID="showcase-stats-arch" accessible={false} pointerEvents="none" contentFit="fill" source={{ uri: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 136" preserveAspectRatio="none"><path fill="${theme.page}" d="M0 136 C18 136 28 130 38 114 L94 22 C104 6 114 0 132 0 H600 V136 Z"/></svg>`)}` }} style={s.statsArch} />}
      <View style={[s.statsItems, { width: compact ? '100%' : '48%' }]}>{stats.map(item => <View key={item.label} style={s.stat}>{item.field ? <EditField field={item.field} label={item.label} color={theme.accent}><Text style={[s.statValue, { color: theme.accent }]}>{item.value}</Text></EditField> : <Text style={[s.statValue, { color: theme.accent }]}>{item.value}</Text>}<Text style={[s.statLabel, { color: theme.heroMuted }]}>{item.label}</Text></View>)}</View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  contactPlaceholder: { position: 'absolute', left: 0, right: 0, top: -16 },
  hero: { paddingTop: 24, paddingBottom: 22, overflow: 'hidden' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  composition: { justifyContent: 'space-between', alignItems: 'center', gap: 16 }, titles: { gap: 5 },
  name: { fontWeight: '800', letterSpacing: -1, paddingVertical: 4 }, headline: { fontSize: 22, lineHeight: 30, fontWeight: '600' }, nickname: { fontSize: 13, lineHeight: 21 },
  details: { width: '100%' }, bio: { fontSize: 15, lineHeight: 24, marginTop: 12 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  button: { minHeight: 48, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, buttonText: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  code: { padding: 14, borderWidth: 1, borderRadius: 8 }, windowDots: { flexDirection: 'row', gap: 5, marginBottom: 14 }, codeText: { fontFamily: Platform.OS === 'web' ? 'monospace' : Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, lineHeight: 20 },
  handwriting: { fontSize: 22, lineHeight: 32, fontStyle: 'italic', textAlign: 'right', padding: 8 },
  stats: { borderTopWidth: 1, marginTop: 20, paddingTop: 18 },
  statsItems: { flexDirection: 'row', gap: 12 },
  statsArch: { position: 'absolute', left: '50%', right: -40, top: 0, bottom: -22 },
  stat: { flex: 1, minWidth: 0, paddingHorizontal: 4 }, statValue: { fontSize: 24, lineHeight: 32, fontWeight: '700' }, statLabel: { fontSize: 12, lineHeight: 19 },
});
