import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioContent, PortfolioProject, ProfileTheme } from '@/types/portfolio';
import { profileMedia } from '@/components/profile/profile-media';
import { skillLogo } from '@/components/profile/skill-logo';
import { Chip, PortfolioIcon, PortfolioLink, SectionTitle, ui } from './PortfolioPrimitives';
import { EditField, EditPhoto, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { portfolioMetrics, type ProfileEditField } from '@/utils/profile-fields';

export type SectionProps = { portfolio: PortfolioContent; theme: ProfileTheme; compact: boolean; thumbnail?: boolean };
export function ProjectSection({ projects, title, theme, compact, thumbnail }: Omit<SectionProps, 'portfolio'> & { projects: PortfolioProject[]; title: string }) {
  const editing = useProfileEditing();
  if (!projects.length && !editing) return null;
  const columns = compact ? 1 : title === 'Dự án nổi bật' ? 3 : 4;
  return <View style={ui.section}><SectionTitle title={title} name="project" theme={theme} /><View style={ui.row}>{projects.map((project, index) => <View key={`${project.title}-${index}`} style={[ui.card, { width: compact ? '100%' : `${(100 - (columns - 1) * 2) / columns}%`, borderColor: theme.border, backgroundColor: theme.surface }]}>
    <View style={s.cover}><Image source={profileMedia(project.coverUrl)} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`Ảnh dự án ${project.title}`} /><EditPhoto color={theme.accentStrong} right={8} bottom={8} size={28} entry={{ section: 'projects', item: project, label: `dự án ${project.title}` }} /></View>
    <View style={s.projectBody}><Text style={[s.cardTitle, { color: theme.text }]}>{project.title}</Text><Text style={[ui.body, { color: theme.muted, marginTop: 6 }]}>{project.description}</Text>
      {!!project.technologies.length && <View style={[ui.chips, { marginTop: 10 }]}>{project.technologies.map((technology, technologyIndex) => <Chip key={`${technology}-${technologyIndex}`} theme={theme}>{technology}</Chip>)}</View>}
      {!!project.url && <PortfolioLink label="Xem chi tiết" url={project.url} theme={theme} thumbnail={thumbnail} subtle />}
      {!!project.githubUrl && <PortfolioLink label="Mã nguồn" url={project.githubUrl} theme={theme} thumbnail={thumbnail} subtle />}
    </View>
  </View>)}</View></View>;
}
export function Statistics({ portfolio, theme, compact }: SectionProps) {
  const editing = useProfileEditing();
  const metrics = portfolioMetrics(portfolio);
  const values: { value: string; label: string; icon: 'project' | 'journey' | 'code' | 'certificate'; field?: ProfileEditField }[] = [{ value: `${metrics.projects}+`, label: 'Dự án cá nhân & thực tế', icon: 'project' }, { value: `${metrics.years}+`, label: 'Năm kinh nghiệm', icon: 'journey', field: 'yearsOfExperience' }, { value: `${metrics.technologies}+`, label: 'Công nghệ sử dụng', icon: 'code' }, { value: metrics.gpa || (editing ? 'Nhập GPA' : `${portfolio.certificates.length}`), label: metrics.gpa || editing ? 'GPA tại trường' : 'Chứng chỉ', icon: 'certificate', field: metrics.gpa || editing ? 'gpa' : undefined }];
  return <View style={[ui.row, ui.section]}>{values.map(item => <View key={item.label} style={[s.stat, { width: compact ? '47%' : '23%', backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[s.statIcon, { backgroundColor: theme.accentSoft }]}><PortfolioIcon name={item.icon} color={theme.accent} /></View><View style={{ flex: 1 }}>{item.field ? <EditField field={item.field} label={item.label} color={theme.accentStrong}><Text style={[s.statValue, { color: theme.text }]}>{item.value}</Text></EditField> : <Text style={[s.statValue, { color: theme.text }]}>{item.value}</Text>}<Text style={[ui.small, { color: theme.muted }]}>{item.label}</Text></View></View>)}</View>;
}
const groupColors = ['#2563EB', '#087C65', '#087787', '#7A31C7'];
export function SkillSection({ portfolio, theme, compact }: SectionProps) {
  const groups = [...new Set(portfolio.skills.map(skill => skill.category || 'Kỹ năng'))];
  return <View style={ui.section}><SectionTitle title="Kỹ năng" name="skill" theme={theme} /><View style={ui.row}>{groups.map((group, index) => <View key={group} style={[ui.card, { width: compact ? '100%' : '23%', borderColor: theme.border, backgroundColor: theme.surface }]}>
    <View style={[s.skillHeading, { backgroundColor: theme.accentSoft }]}><PortfolioIcon name="code" color={groupColors[index % 4]} size={18} /><Text style={[s.groupTitle, { color: groupColors[index % 4] }]}>{group}</Text></View>
    <View style={s.skillGrid}>{portfolio.skills.filter(skill => (skill.category || 'Kỹ năng') === group).map(skill => <View key={skill.name} style={s.skillItem}>{skillLogo(skill.name, skill.iconUrl) !== undefined ? <Image source={skillLogo(skill.name, skill.iconUrl)} style={s.skillBadge} contentFit="contain" accessibilityLabel={skill.name} /> : <View style={[s.skillBadge, { backgroundColor: `${groupColors[index % 4]}12` }]}><Text style={[s.skillInitial, { color: groupColors[index % 4] }]}>{skill.name === 'TypeScript' ? 'TS' : skill.name === 'React' ? 'Re' : skill.name.slice(0, 2)}</Text></View>}<Text style={[s.skillName, { color: theme.muted }]}>{skill.name}</Text></View>)}</View>
  </View>)}</View></View>;
}
export function JourneySection({ portfolio, theme, compact }: SectionProps) {
  const milestones = [...portfolio.education, ...portfolio.experience].sort((a, b) => (a.startDate ?? a.period ?? '').localeCompare(b.startDate ?? b.period ?? ''));
  return <View style={ui.section}><SectionTitle title="Hành trình phát triển" name="journey" theme={theme} /><View style={[ui.row, { gap: 0 }]}>{milestones.map((item, index) => <View key={`${item.title}-${index}`} style={[s.milestone, { width: compact ? '100%' : `${100 / milestones.length}%`, borderColor: theme.border }, compact && s.verticalMilestone]}>
    <View style={[s.milestoneIcon, { backgroundColor: theme.accentSoft }]}><PortfolioIcon name="journey" color={theme.accent} size={19} /></View>
    <View style={{ flex: 1 }}><Text style={[ui.small, { color: theme.accentStrong, fontWeight: '600' }]}>{item.period || item.startDate}</Text><Text style={[s.cardTitle, { fontSize: 14, marginTop: 6, color: theme.text }]}>{item.title}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 5 }]}>{item.organization}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 5 }]}>{item.description}</Text></View>
  </View>)}</View></View>;
}
export function CertificateSection({ portfolio, theme, compact, thumbnail }: SectionProps) {
  return <View style={ui.section}><SectionTitle title="Chứng chỉ" name="certificate" theme={theme} /><View style={ui.row}>{portfolio.certificates.map((item, index) => <View key={`${item.title}-${index}`} style={[ui.card, s.certificate, { width: compact ? '100%' : '23%', borderColor: theme.border, backgroundColor: theme.surface }]}><View>{item.logoUrl ? <Image source={profileMedia(item.logoUrl)} style={s.skillBadge} contentFit="contain" accessibilityLabel={item.issuer} /> : <PortfolioIcon name="certificate" color={groupColors[index % 4]} size={30} />}<EditPhoto color={theme.accentStrong} right={-6} bottom={-6} size={24} entry={{ section: 'certificates', item, label: item.title }} /></View><View style={{ flex: 1 }}><Text style={[s.cardTitle, { fontSize: 13, color: theme.text }]}>{item.title}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 4 }]}>{item.issuer}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 12 }]}>{item.year}</Text>{!!item.url && <PortfolioLink label="Xem chứng chỉ" url={item.url} theme={theme} thumbnail={thumbnail} subtle />}</View></View>)}</View></View>;
}
export function ArticleSection({ portfolio, theme, compact, thumbnail }: SectionProps) {
  return <View style={ui.section}><SectionTitle title="Blog & Chia sẻ" name="article" theme={theme} /><View style={ui.row}>{portfolio.articles.map((item, index) => <View key={`${item.title}-${index}`} style={[ui.card, s.article, { width: compact ? '100%' : '31.8%', borderColor: theme.border, backgroundColor: theme.surface }]}><View style={s.articleCover}><Image source={profileMedia(item.coverUrl)} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`Ảnh bài viết ${item.title}`} /><EditPhoto color={theme.accentStrong} right={2} bottom={2} size={24} entry={{ section: 'articles', item, label: item.title }} /></View><View style={{ flex: 1 }}><Text style={[s.cardTitle, { fontSize: 13, color: theme.text }]}>{item.title}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 7 }]}>{item.date}</Text><PortfolioLink label="Đọc bài viết" url={item.url} theme={theme} thumbnail={thumbnail} subtle /></View></View>)}</View></View>;
}
export function ExtraSection({ portfolio, theme, compact, section }: SectionProps & { section: 'activities' | 'languages' }) {
  const editing = useProfileEditing();
  const items = portfolio[section] ?? [];
  if (!items.length && !editing) return null;
  return <View style={ui.section}><SectionTitle title={section === 'activities' ? 'Hoạt động' : 'Ngôn ngữ'} name="person" theme={theme} /><View style={ui.row}>{section === 'activities' ? portfolio.activities?.map((item, index) => <View key={index} style={[ui.card, { padding: 16, width: compact ? '100%' : '48%', backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text><Text style={[ui.small, { color: theme.muted, marginTop: 6 }]}>{item.organization} · {item.date}</Text><Text style={[ui.body, { color: theme.muted, marginTop: 6 }]}>{item.description}</Text></View>) : portfolio.languages?.map(item => <Chip key={item.name} theme={theme}>{item.name} · {item.level}</Chip>)}</View></View>;
}
const s = StyleSheet.create({
  cover: { aspectRatio: 2.05 },
  projectBody: { padding: 12 }, cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stat: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10 }, statIcon: { width: 36, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, statValue: { fontSize: 21, fontWeight: '700', marginBottom: 3 },
  skillHeading: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }, groupTitle: { fontSize: 13, fontWeight: '700' },
  skillGrid: { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, skillItem: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: 5 },
  skillBadge: { width: 27, height: 27, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, skillInitial: { fontSize: 12, fontWeight: '800' }, skillName: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  milestone: { borderTopWidth: 1, borderLeftWidth: 1, padding: 14, paddingTop: 0, marginTop: 13 }, milestoneIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: -18, marginBottom: 10 },
  verticalMilestone: { flexDirection: 'row', gap: 12, borderTopWidth: 0, paddingTop: 10, marginTop: 0 },
  certificate: { flexDirection: 'row', gap: 10, padding: 14 }, article: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9 }, articleCover: { width: 74, height: 74, borderRadius: 6 },
});
