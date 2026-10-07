import { Image } from 'expo-image';
import { EditPhoto, SectionAdd, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioContent, PortfolioProject, ProfileTheme } from '@/types/portfolio';
import { profileMedia, isSampleLink } from '@/components/profile/profile-media';
import { skillLogo } from '@/components/profile/skill-logo';
import { Chip, PortfolioIcon, PortfolioLink, ui } from '../developer-modern/PortfolioPrimitives';

export type ShowcaseSectionProps = { portfolio: PortfolioContent; theme: ProfileTheme; width: number; thumbnail?: boolean };
const cardWidth = (width: number, columns: number) => Math.floor((width - (columns - 1) * 12) / columns);
export function ShowcaseHeading({ eyebrow, title, theme }: { eyebrow: string; title: string; theme: ProfileTheme }) {
  const sectionTitle = eyebrow === 'KỸ NĂNG' ? 'Kỹ năng' : eyebrow === 'CHỨNG CHỈ' ? 'Chứng chỉ' : eyebrow.startsWith('BLOG') ? 'Bài viết' : title;
  return <View style={s.heading}><Text style={[s.eyebrow, { color: theme.accentStrong }]}>{eyebrow}</Text><View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><Text role="heading" aria-level={2} style={[s.title, { color: theme.text }]}>{title}</Text><SectionAdd title={sectionTitle} theme={theme} /></View></View>;
}
export function ShowcaseProjects({ projects, theme, width, thumbnail }: Omit<ShowcaseSectionProps, 'portfolio'> & { projects: PortfolioProject[] }) {
  const editing = useProfileEditing();
  if (!projects.length && !editing) return null;
  const columns = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  return <View style={s.section}><ShowcaseHeading eyebrow="DỰ ÁN" title="Dự án của tôi" theme={theme} />
    <View style={s.grid}>{projects.map((project, index) => <View testID="showcase-project-card" key={`${project.title}-${index}`} style={[s.card, { width: cardWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[s.projectCover, { backgroundColor: theme.accentSoft }]}>{profileMedia(project.coverUrl) ? <Image source={profileMedia(project.coverUrl)} contentFit="cover" priority="low" loading={thumbnail ? 'eager' : 'lazy'} style={StyleSheet.absoluteFill} accessibilityLabel={`Ảnh dự án ${project.title}`} /> : <View style={s.coverFallback}><PortfolioIcon name="project" size={40} color={theme.accentStrong} /></View>}
        <EditPhoto color={theme.accentStrong} right={8} bottom={8} size={28} entry={{ section: 'projects', item: project, label: `dự án ${project.title}` }} />
      </View>
      <View style={s.projectBody}><Text role="heading" aria-level={3} style={[s.cardTitle, { color: theme.text }]}>{project.title}</Text>{!!project.description && <Text numberOfLines={3} style={[s.body, { color: theme.muted }]}>{project.description}</Text>}
        <View style={ui.chips}>{project.technologies.map(technology => <Chip key={technology} theme={theme}>{technology}</Chip>)}</View>
        <View style={s.links}>{!isSampleLink(project.url) && <PortfolioLink label="Xem chi tiết →" url={project.url} theme={theme} thumbnail={thumbnail} subtle />}{!isSampleLink(project.githubUrl) && <PortfolioLink label="GitHub" url={project.githubUrl} theme={theme} thumbnail={thumbnail} subtle />}</View>
      </View>
    </View>)}</View>
  </View>;
}
export function ShowcaseSkills({ portfolio, theme, width, thumbnail }: ShowcaseSectionProps) {
  const editing = useProfileEditing();
  if (!portfolio.skills.length && !editing) return null;
  const groups = [...new Set(portfolio.skills.map(skill => skill.category || 'Kỹ năng'))];
  const columns = width >= 900 ? 4 : width >= 350 ? 2 : 1;
  return <View style={s.section}><ShowcaseHeading eyebrow="KỸ NĂNG" title="Công nghệ mình sử dụng" theme={theme} /><View style={s.grid}>{groups.map(group => <View key={group} style={[s.card, { width: cardWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={[s.groupHeading, { backgroundColor: theme.accentSoft }]}><PortfolioIcon name="code" size={18} color={theme.accentStrong} /><Text role="heading" aria-level={3} style={[s.groupName, { color: theme.accentStrong }]}>{group}</Text></View>
    <View style={s.skillGrid}>{portfolio.skills.filter(skill => (skill.category || 'Kỹ năng') === group).map(skill => <View key={skill.name} style={[s.skillItem, { width: columns === 2 && width < 600 ? '46%' : '30%' }]}>
      {skillLogo(skill.name, skill.iconUrl) !== undefined ? <Image source={skillLogo(skill.name, skill.iconUrl)} contentFit="contain" priority="low" loading={thumbnail ? 'eager' : 'lazy'} style={s.logo} accessible={false} /> : <View style={[s.logo, s.coverFallback, { backgroundColor: theme.accentSoft }]}><Text style={[s.caption, { color: theme.accentStrong }]}>{skill.name.slice(0, 2)}</Text></View>}
      <Text style={[s.skillName, { color: theme.muted }]}>{skill.name}</Text>
    </View>)}</View>
  </View>)}</View></View>;
}
export function ShowcaseJourney({ portfolio, theme, width }: ShowcaseSectionProps) {
  const milestones = [...portfolio.education, ...portfolio.experience].sort((a, b) => (a.startDate ?? a.period ?? '').localeCompare(b.startDate ?? b.period ?? ''));
  const editing = useProfileEditing();
  if (!milestones.length && !editing) return null;
  const vertical = width < 900 || milestones.length > 6;
  return <View style={s.section}><ShowcaseHeading eyebrow="KINH NGHIỆM LÀM VIỆC & HỌC TẬP" title="Hành trình phát triển" theme={theme} /><View style={{ flexDirection: vertical ? 'column' : 'row', marginTop: 12 }}>{milestones.map((item, index) => <View key={`${item.title}-${index}`} style={[s.milestone, { width: vertical ? '100%' : `${100 / milestones.length}%`, marginLeft: vertical ? 18 : 0, flexDirection: vertical ? 'row' : 'column', borderColor: theme.accentStrong, borderLeftWidth: vertical ? 1 : 0, borderTopWidth: vertical ? 0 : 1 }]}>
    <View style={[s.journeyIcon, { backgroundColor: theme.accentSoft }, vertical ? { marginLeft: -31 } : { marginTop: -35 }]}><PortfolioIcon name="journey" color={theme.accentStrong} size={20} /></View>
    <View style={s.shrink}><Text style={[s.caption, { color: theme.accentStrong }]}>{item.period || item.startDate}</Text><Text role="heading" aria-level={3} style={[s.groupName, { color: theme.text, marginTop: 5 }]}>{item.title}</Text><Text style={[s.caption, { color: theme.muted, marginTop: 5 }]}>{item.organization}</Text>{!!item.description && <Text style={[s.caption, { color: theme.muted, marginTop: 5 }]}>{item.description}</Text>}</View>
  </View>)}</View></View>;
}
export function ShowcaseCertificates({ portfolio, theme, width, thumbnail }: ShowcaseSectionProps) {
  const editing = useProfileEditing();
  if (!portfolio.certificates.length && !editing) return null;
  const columns = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  return <View style={s.section}><ShowcaseHeading eyebrow="CHỨNG CHỈ" title="Ghi dấu những điều đã học" theme={theme} /><View style={s.grid}>{portfolio.certificates.map((item, index) => <View key={`${item.title}-${index}`} style={[s.card, s.certificate, { width: cardWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View>{profileMedia(item.logoUrl) ? <Image source={profileMedia(item.logoUrl)} style={s.logo} contentFit="contain" priority="low" loading={thumbnail ? 'eager' : 'lazy'} accessibilityLabel={item.issuer} /> : <PortfolioIcon name="certificate" color={theme.accentStrong} size={28} />}<EditPhoto color={theme.accentStrong} right={-6} bottom={-6} size={24} entry={{ section: 'certificates', item, label: item.title }} /></View>
    <View style={s.shrink}><Text role="heading" aria-level={3} style={[s.groupName, { color: theme.text }]}>{item.title}</Text><Text style={[s.caption, { color: theme.muted, marginTop: 4 }]}>{item.issuer}{item.year ? ` · ${item.year}` : ''}</Text>{!isSampleLink(item.url) && <PortfolioLink label="Xem chứng chỉ" url={item.url} theme={theme} thumbnail={thumbnail} subtle />}</View>
  </View>)}</View></View>;
}
export function ShowcaseArticles({ portfolio, theme, width, thumbnail }: ShowcaseSectionProps) {
  const editing = useProfileEditing();
  if (!portfolio.articles.length && !editing) return null;
  const columns = width >= 900 ? 3 : 1;
  return <View style={s.section}><ShowcaseHeading eyebrow="BLOG & CHIA SẺ KIẾN THỨC" title="Góc chia sẻ của mình" theme={theme} /><View style={s.grid}>{portfolio.articles.map((item, index) => <View key={`${item.title}-${index}`} style={[s.card, s.certificate, { width: cardWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
    {(editing || profileMedia(item.coverUrl)) && <View style={s.articleImage}><Image source={profileMedia(item.coverUrl)} style={StyleSheet.absoluteFill} priority="low" loading={thumbnail ? 'eager' : 'lazy'} contentFit="cover" accessibilityLabel={`Ảnh bài viết ${item.title}`} /><EditPhoto color={theme.accentStrong} right={2} bottom={2} size={24} entry={{ section: 'articles', item, label: `bài viết ${item.title}` }} /></View>}
    <View style={s.shrink}><Text role="heading" aria-level={3} style={[s.groupName, { color: theme.text }]}>{item.title}</Text><Text style={[s.caption, { color: theme.muted, marginTop: 6 }]}>{item.date}</Text>{!isSampleLink(item.url) && <PortfolioLink label="Đọc bài viết" url={item.url} theme={theme} thumbnail={thumbnail} subtle />}</View>
  </View>)}</View></View>;
}
const s = StyleSheet.create({
  section: { marginBottom: 32 }, heading: { gap: 6, marginBottom: 16 }, eyebrow: { fontSize: 11, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2 }, title: { fontSize: 23, lineHeight: 31, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' }, shrink: { flex: 1, minWidth: 0 },
  caption: { fontSize: 12, lineHeight: 19 }, body: { fontSize: 14, lineHeight: 22 }, cardTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  projectCover: { aspectRatio: 1.9 }, coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' }, projectBody: { padding: 12, gap: 8 }, links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  groupHeading: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, groupName: { fontSize: 13, lineHeight: 20, fontWeight: '600', flexShrink: 1 },
  skillGrid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, skillItem: { alignItems: 'center', paddingVertical: 6, gap: 8 }, logo: { width: 30, height: 30 }, skillName: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  milestone: { padding: 16, gap: 12, marginLeft: 12 }, journeyIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  certificate: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }, articleImage: { width: 68, height: 76, borderRadius: 5 },
});
