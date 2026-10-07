import { useState } from 'react';
import { EditPhoto, SectionAdd, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioContent, PortfolioProject } from '@/types/portfolio';
import { profileMedia, isSampleLink } from '@/components/profile/profile-media';
import { skillLogo } from '@/components/profile/skill-logo';
import { PortfolioControl, PortfolioIcon, PortfolioLink, ui } from '../developer-modern/PortfolioPrimitives';
import type { LandscapeTheme } from './DeveloperLandscapeThemes';
import { landscapeJourney } from './landscape-data';

export type SectionProps = { portfolio: PortfolioContent; theme: LandscapeTheme; width: number; thumbnail?: boolean };
export const tileWidth = (width: number, columns: number) => Math.max(0, (width - (columns - 1) * 12) / columns);
export function LandscapeHeading({ title, subtitle, eyebrow, icon, theme }: { title: string; subtitle: string; eyebrow: string; icon: 'project' | 'skill' | 'journey' | 'certificate' | 'article'; theme: LandscapeTheme }) {
  return <View style={s.heading}><PortfolioIcon name={icon} color={theme.accentStrong} size={26} /><View style={s.shrink}><Text style={[s.eyebrow, { color: theme.accentStrong }]}>{eyebrow}</Text><View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><Text role="heading" aria-level={2} style={[s.title, { color: theme.text }]}>{title}</Text><SectionAdd title={title} theme={theme} /></View><Text style={[s.caption, { color: theme.muted }]}>{subtitle}</Text></View></View>;
}
export function LandscapeProjects({ projects, title, theme, width, thumbnail }: Omit<SectionProps, 'portfolio'> & { projects: PortfolioProject[]; title: string }) {
  const editing = useProfileEditing();
  if (!projects.length && !editing) return null;
  const columns = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  return <View style={s.section}><LandscapeHeading title={title} eyebrow="PROJECTS" subtitle="Những sản phẩm mình đã xây dựng, từ ý tưởng đến sản phẩm thực tế." icon="project" theme={theme} />
    <View style={s.grid}>{projects.map((project, index) => <View testID="landscape-project" key={`${project.title}-${index}`} style={[s.card, { width: tileWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[s.cover, { backgroundColor: theme.accentSoft }]}>{profileMedia(project.coverUrl) ? <Image source={profileMedia(project.coverUrl)} contentFit="cover" loading={thumbnail ? 'eager' : 'lazy'} priority="low" style={StyleSheet.absoluteFill} accessibilityLabel={`Ảnh dự án ${project.title}`} /> : <View style={s.fallback}><PortfolioIcon name="project" color={theme.accentStrong} size={36} /></View>}
        <EditPhoto color={theme.accentStrong} right={8} bottom={8} size={28} entry={{ section: 'projects', item: project, label: `dự án ${project.title}` }} />
      </View>
      <View style={s.projectBody}><Text role="heading" aria-level={3} style={[s.cardTitle, { color: theme.text }]}>{project.title}</Text>{!!project.description && <Text numberOfLines={3} style={[s.body, { color: theme.muted }]}>{project.description}</Text>}
        {!!project.technologies.length && <View role="group" accessibilityLabel="Công nghệ sử dụng" style={s.technologies}>{project.technologies.map((technology, technologyIndex) => <Text key={`${technology}-${technologyIndex}`} style={[s.technology, { color: theme.accentStrong, backgroundColor: theme.accentSoft }]}>{technology}</Text>)}</View>}
        <View style={s.links}>{!isSampleLink(project.githubUrl) && <PortfolioLink label="GitHub" url={project.githubUrl} theme={theme} thumbnail={thumbnail} />}{!isSampleLink(project.url) && <PortfolioLink label={`Xem dự án ${project.title}`} url={project.url} theme={theme} thumbnail={thumbnail} />}</View>
      </View>
    </View>)}</View>
  </View>;
}
export function LandscapeSkills({ portfolio, theme, width, thumbnail, mobile = false }: SectionProps & { mobile?: boolean }) {
  const editing = useProfileEditing();
  const [filter, setFilter] = useState<string | null>(null);
  const groups = [...new Set(portfolio.skills.map(skill => skill.category.trim() || 'Khác'))];
  const activeFilter = filter && groups.includes(filter) ? filter : null;
  const skills = portfolio.skills.filter(skill => !activeFilter || (skill.category.trim() || 'Khác') === activeFilter);
  const columns = mobile ? 3 : width >= 480 ? 6 : width >= 440 ? 4 : 2;
  if (!portfolio.skills.length && !editing) return null;
  return <View testID="landscape-skills" style={s.section}><LandscapeHeading title="Kỹ năng" subtitle="Những công nghệ và công cụ mình sử dụng." eyebrow="MY SKILLS" icon="skill" theme={theme} />
    <View role="group" accessibilityLabel="Lọc kỹ năng theo danh mục" style={s.filters}>{[null, ...groups].map(group => <PortfolioControl key={group ?? 'all'} thumbnail={thumbnail} hitSlop={mobile ? 4 : undefined} accessibilityRole="button" accessibilityState={{ selected: activeFilter === group }} aria-pressed={activeFilter === group} onPress={() => setFilter(group)} style={({ pressed }) => [s.filter, mobile && s.filterMobile, { backgroundColor: activeFilter === group ? theme.skillActive : theme.surfaceSoft, borderColor: activeFilter === group ? theme.skillActive : theme.border }, pressed && ui.pressed]}><Text style={[s.filterText, mobile && s.filterTextMobile, { color: activeFilter === group ? theme.heroText : theme.muted }]}>{group ?? 'Tất cả'}</Text></PortfolioControl>)}</View>
    <View style={s.grid}>{skills.map((skill, index) => <View testID="landscape-skill" key={`${skill.name}-${index}`} style={[s.card, s.skillTile, { width: tileWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
      {skillLogo(skill.name, skill.iconUrl) ? <Image source={skillLogo(skill.name, skill.iconUrl)} contentFit="contain" accessible={false} loading={thumbnail ? 'eager' : 'lazy'} style={s.logo} /> : <View style={[s.logo, s.fallback, { backgroundColor: theme.accentSoft }]}><Text style={{ color: theme.accentStrong, fontWeight: '700' }}>{skill.name.slice(0, 2)}</Text></View>}
      <Text style={[s.skillName, { color: theme.muted }]}>{skill.name}</Text>
    </View>)}</View>
  </View>;
}
export function LandscapeJourney({ portfolio, theme }: SectionProps) {
  const editing = useProfileEditing();
  const milestones = landscapeJourney(portfolio);
  if (!milestones.length && !editing) return null;
  return <View testID="landscape-journey" style={s.section}><LandscapeHeading title="Hành trình phát triển" eyebrow="JOURNEY" subtitle="Những cột mốc quan trọng trong hành trình của mình." icon="journey" theme={theme} />
    <View style={s.timeline}>{milestones.map((item, index) => <View testID="landscape-milestone" key={`${item.title}-${index}`} style={[s.milestone, { borderLeftColor: theme.timeline }]}>
      <View style={[s.node, { backgroundColor: theme.timeline }]} />
      <View style={[s.journeyIcon, { backgroundColor: theme.timelineSoft }]}><PortfolioIcon name={item.kind === 'education' ? 'certificate' : 'project'} color={theme.accentStrong} size={20} /></View>
      <View style={[s.milestoneBody, { backgroundColor: theme.surfaceSoft }]}><Text style={[s.caption, { color: theme.accentStrong }]}>{item.period || [item.startDate, item.endDate].filter(Boolean).join(' – ')}</Text><Text role="heading" aria-level={3} style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>{!!item.organization && <Text style={[s.caption, { color: theme.muted }]}>{item.organization}</Text>}{!!item.description && <Text style={[s.caption, { color: theme.muted }]}>{item.description}</Text>}</View>
    </View>)}</View>
  </View>;
}

const s = StyleSheet.create({
  section: { marginBottom: 28 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }, shrink: { flex: 1, minWidth: 0 }, eyebrow: { fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1.4 }, title: { fontSize: 23, lineHeight: 31, fontWeight: '700' }, caption: { fontSize: 12, lineHeight: 19 }, body: { fontSize: 14, lineHeight: 22 }, cardTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { borderWidth: 1, borderRadius: 9, overflow: 'hidden' }, cover: { aspectRatio: 1.95 }, fallback: { flex: 1, justifyContent: 'center', alignItems: 'center' }, projectBody: { padding: 14, gap: 8 }, links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  technologies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, technology: { fontSize: 11, lineHeight: 16, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, maxWidth: '100%' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, filter: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' }, filterText: { fontSize: 12, lineHeight: 20, fontWeight: '600' }, skillTile: { paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 8 }, logo: { width: 32, height: 32 }, skillName: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: '100%' },
  filterMobile: { minHeight: 36, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 }, filterTextMobile: { fontSize: 11, lineHeight: 18 },
  timeline: { paddingLeft: 8 }, milestone: { borderLeftWidth: 1, marginLeft: 4, paddingLeft: 24, paddingBottom: 12, flexDirection: 'row', gap: 12 }, node: { position: 'absolute', left: -5, top: 18, width: 9, height: 9, borderRadius: 5 }, journeyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, milestoneBody: { flex: 1, minWidth: 0, padding: 12, borderRadius: 8, gap: 3 },
});

export const sectionStyles = s;
