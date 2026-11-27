import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import type { PortfolioProject, ProfileTheme } from '@/types/portfolio';
import { ProjectCard } from '@/components/projects/hub/ProjectCard';
import { FullProjectImage } from '@/components/projects/hub/FullProjectImage';
import { HubIcon, hubColors as c } from '@/components/projects/hub/ProjectHubUI';
import { EditPhoto, useProfileEditing } from './ProfileEditContext';
import { isSampleLink, profileMedia } from './profile-media';
import { PortfolioLink } from './templates/developer-modern/PortfolioPrimitives';

export function PortfolioProjectCard({ project, width, theme, thumbnail, testID, onNavigate }: { project: PortfolioProject; width: DimensionValue; theme: ProfileTheme; thumbnail?: boolean; testID?: string; onNavigate?: () => void }) {
  const editing = useProfileEditing();
  const source = profileMedia(project.coverUrl);
  const role = typeof project.role === 'string' ? project.role.trim() : '';
  const completed = project.completedAt ? new Date(project.completedAt) : null;
  const date = completed && !Number.isNaN(completed.getTime()) ? completed.toLocaleDateString('vi-VN') : null;
  return <ProjectCard title={project.title} description={project.description} technologies={project.technologies} width={width} headingLevel={3} testID={testID}
    onOpen={project.projectId && !thumbnail && !editing ? () => { onNavigate?.(); router.push({ pathname: '/group/[id]', params: { id: project.projectId! } }); } : undefined}
    cover={source ? <FullProjectImage source={source} label={`Ảnh dự án ${project.title}`} /> : undefined}
    accessory={<EditPhoto color={c.primary} right={8} bottom={8} size={28} entry={{ section: 'projects', item: project, label: `dự án ${project.title}` }} />}
    footer={<>
      {(!!role || date) && <View style={styles.meta}>
        {!!role && <View style={styles.item}><HubIcon name="person" size={15} color={c.ink} /><Text style={styles.text}>{role}</Text></View>}
        {date && <View style={styles.item}><HubIcon name="calendar" size={15} color={c.ink} /><Text style={styles.text}>{date}</Text></View>}
      </View>}
      {!!project.personalContribution && <Text numberOfLines={2} style={styles.text}>{project.personalContribution}</Text>}
      <View style={styles.meta}>{!isSampleLink(project.url) && <PortfolioLink label="Xem chi tiết" url={project.url} theme={theme} thumbnail={thumbnail} subtle />}{!isSampleLink(project.githubUrl) && <PortfolioLink label="GitHub" url={project.githubUrl} theme={theme} thumbnail={thumbnail} subtle />}</View>
    </>} />;
}
const styles = StyleSheet.create({ meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, item: { flexDirection: 'row', alignItems: 'center', gap: 6 }, text: { color: c.ink, fontSize: 11, lineHeight: 18 } });
