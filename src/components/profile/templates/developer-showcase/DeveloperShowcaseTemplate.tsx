import { StyleSheet, Text, View } from 'react-native';
import type { DeveloperModernTemplateProps } from '../developer-modern/DeveloperModernTemplate';
import { PortfolioLink, ui } from '../developer-modern/PortfolioPrimitives';
import { isSampleLink } from '@/components/profile/profile-media';
import { ShowcaseContact, ShowcaseHero } from './ShowcaseHero';
import { ShowcaseArticles, ShowcaseCertificates, ShowcaseJourney, ShowcaseProjects, ShowcaseSkills } from './ShowcaseSections';
import { SectionAdd, useProfileEditing } from '@/components/profile/ProfileEditContext';

const defaultOrder = ['skills', 'journey', 'certificates', 'articles', 'other-projects'];
export function DeveloperShowcaseTemplate(props: DeveloperModernTemplateProps) {
  const editing = useProfileEditing();
  const { data, theme, width, thumbnail, onSectionLayout } = props;
  const padding = width < 768 ? 18 : 40;
  const contentWidth = Math.max(0, width - padding * 2);
  const shared = { portfolio: data.portfolio, theme, width: contentWidth, thumbnail };
  const appearance = data.portfolio.appearance?.profile;
  const visible = (id: string) => !!editing || !appearance?.hiddenSections?.includes(id);
  const sections: Record<string, React.ReactNode> = {
    skills: editing || data.portfolio.skills.length > 0 ? <ShowcaseSkills {...shared} /> : null,
    journey: editing || data.portfolio.education.length + data.portfolio.experience.length > 0 ? <ShowcaseJourney {...shared} /> : null,
    certificates: editing || data.portfolio.certificates.length > 0 ? <ShowcaseCertificates {...shared} /> : null,
    articles: editing || data.portfolio.articles.length > 0 ? <ShowcaseArticles {...shared} /> : null,
    'other-projects': visible('projects') && (editing || data.portfolio.projects.length > 0) ? <ShowcaseProjects projects={data.portfolio.projects} {...shared} /> : null,
  };
  const order = [...new Set([...(editing ? defaultOrder : appearance?.sectionOrder ?? []), ...defaultOrder])].filter(id => sections[id] && visible(id));
  return <View testID="developer-showcase" style={{ width, backgroundColor: theme.page }}>
    <View onLayout={event => onSectionLayout?.('hero', event.nativeEvent.layout.height)}><ShowcaseHero {...props} /></View>
    <View style={{ paddingHorizontal: padding, paddingTop: 24 }}>
      {order.map(id => <View key={id} onLayout={event => onSectionLayout?.(id === 'other-projects' ? 'projects' : id, event.nativeEvent.layout.y)}>{sections[id]}</View>)}
      {visible('contact') && <View testID="showcase-contact" style={[s.contact, { backgroundColor: theme.heroBackground, borderColor: theme.heroBorder, flexDirection: width >= 900 ? 'row' : 'column' }]}>
        <View style={s.copy}><Text style={[s.eyebrow, { color: theme.accent }]}>LET’S WORK TOGETHER</Text><Text role="heading" aria-level={2} style={[s.title, { color: theme.heroText }]}>Biến ý tưởng thành sản phẩm thực tế!</Text><Text style={[s.body, { color: theme.heroMuted }]}>Mình luôn sẵn sàng cho những cơ hội hợp tác và những dự án thú vị. Hãy cùng xây dựng điều có ý nghĩa.</Text></View>
        <View style={s.actions}><ShowcaseContact data={data} theme={theme} thumbnail={thumbnail} /><View style={ui.chips}>{data.portfolio.socialLinks.filter(link => !isSampleLink(link.url)).map(link => <PortfolioLink key={link.label} label={link.label} url={link.url} theme={{ ...theme, accentStrong: theme.heroText }} thumbnail={thumbnail} />)}<SectionAdd title="Liên kết cá nhân" theme={theme} /></View><Text accessible={false} style={[s.handwriting, { color: theme.accent }]}>Build Something{'\n'}Amazing Together! ↗</Text></View>
      </View>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  contact: { borderRadius: 14, borderWidth: 1, padding: 24, marginBottom: 24, gap: 24 }, copy: { flex: 1, minWidth: 0 }, eyebrow: { fontSize: 11, lineHeight: 18, letterSpacing: 1, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 33, fontWeight: '700', marginTop: 8 }, body: { fontSize: 14, lineHeight: 23, marginTop: 10 }, actions: { gap: 12, alignItems: 'flex-start', minWidth: 0 }, handwriting: { fontSize: 19, lineHeight: 28, fontStyle: 'italic' },
});
