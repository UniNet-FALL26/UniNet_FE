import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioResponse, ProfileTheme } from '@/types/portfolio';
import { DeveloperHero } from './DeveloperHero';
import { ArticleSection, CertificateSection, ExtraSection, JourneySection, ProjectSection, SkillSection, Statistics } from './PortfolioSections';
import { PortfolioLink, ui } from './PortfolioPrimitives';
import { EditField, SectionAdd, useProfileEditing } from '@/components/profile/ProfileEditContext';

export type DeveloperModernTemplateProps = { data: PortfolioResponse; theme: ProfileTheme; width: number; thumbnail?: boolean; onNavigate?: (id: string) => void; onSectionLayout?: (id: string, y: number) => void };
const defaultOrder = ['stats', 'skills', 'journey', 'other-projects', 'certificates', 'activities', 'articles'];
export function DeveloperModernTemplate({ data, theme, width, thumbnail, onNavigate, onSectionLayout }: DeveloperModernTemplateProps) {
  const editing = useProfileEditing();
  const compact = width < 720;
  const props = { portfolio: data.portfolio, theme, compact, thumbnail };
  const appearance = data.portfolio.appearance?.profile;
  const sections: Record<string, React.ReactNode> = {
    stats: <Statistics {...props} />, skills: <SkillSection {...props} />, journey: <JourneySection {...props} />,
    'other-projects': <ProjectSection projects={data.portfolio.projects.filter(project => !project.featured)} title="Dự án bản thân" {...props} />,
    certificates: <CertificateSection {...props} />, articles: <ArticleSection {...props} />,
    activities: <ExtraSection section="activities" {...props} />,
  };
  const requestedOrder = !editing && appearance?.sectionOrder?.length ? appearance.sectionOrder : defaultOrder;
  const order = [...new Set([...requestedOrder, ...defaultOrder])].filter(id => sections[id] && (editing || !appearance?.hiddenSections?.includes(id)));
  return <View style={{ width, backgroundColor: theme.page }}>
    <View onLayout={event => onSectionLayout?.('hero', event.nativeEvent.layout.height)}><DeveloperHero data={data} theme={theme} compact={compact} thumbnail={thumbnail} onNavigate={onNavigate} /></View>
    <View style={[s.content, { paddingHorizontal: compact ? 18 : 42 }]}>{order.map(id => <View key={id} onLayout={event => onSectionLayout?.(id, event.nativeEvent.layout.y)}>{sections[id]}</View>)}</View>
    <View style={[s.footer, { marginHorizontal: compact ? 18 : 32, backgroundColor: theme.heroBackground, borderColor: theme.heroBorder }]}>
      <View>
        <Text style={[s.footerName, { color: theme.heroText }]}>{data.profile.fullName}</Text>
        <Text style={[ui.small, { color: theme.heroMuted, marginTop: 4 }]}>{data.profile.nickname} · {data.portfolio.headline}</Text>
      </View>
      <View style={ui.chips}>{data.portfolio.socialLinks.map(link => <PortfolioLink key={link.label} label={link.label} url={link.url} theme={{ ...theme, accentStrong: theme.heroText }} thumbnail={thumbnail} />)}<SectionAdd title="Liên kết cá nhân" theme={theme} /><EditField field="contactEmail" label="Email liên hệ" color={theme.heroText}><Text style={{ color: theme.heroMuted }}>{data.portfolio.contactEmail || (editing ? 'Email liên hệ' : '')}</Text></EditField></View>
    </View>
    <View style={s.copyright}><Text style={[ui.small, { color: theme.muted }]}>© {new Date().getFullYear()} {data.profile.fullName}</Text><Text style={[ui.small, { color: theme.muted }]}>Build · Learn · Grow · Together</Text></View>
  </View>;
}
const s = StyleSheet.create({
  content: { paddingTop: 22 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 24, borderRadius: 12, borderWidth: 1, marginBottom: 20 }, footerName: { fontSize: 15, fontWeight: '700' },
  copyright: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, padding: 20 },
});
