import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { ProjectCard } from './ProjectCard';
import { HubIcon, hubColors as c } from './ProjectHubUI';

export function ProjectListCard({ project, width }: { project: HubProject; width: number | `${number}%` }) {
  const members = new Set([project.creator.id, ...project.members.filter(member => member.status === 0).map(member => member.userId)]).size;
  const updated = new Date(project.updatedAt).getTime() > new Date(project.createdAt).getTime();
  const timestamp = new Date(updated ? project.updatedAt : project.createdAt);
  const date = Number.isNaN(timestamp.getTime()) ? 'Chưa cập nhật' : timestamp.toLocaleDateString('vi-VN');
  const open = () => { router.push({ pathname: '/group/[id]', params: { id: project.id } }); };
  return <ProjectCard title={project.title} description={project.description} coverUrl={project.logoUrl} technologies={project.technologies} width={width} onOpen={open}
    footer={<View style={styles.footer}><View style={styles.meta}><HubIcon name="people" size={15} color={c.ink} /><Text style={styles.metaText}>{members} thành viên</Text></View><View style={styles.meta}><HubIcon name="calendar" size={15} color={c.ink} /><Text numberOfLines={1} style={styles.metaText}>{updated ? 'Cập nhật' : 'Tạo'}: {date}</Text></View></View>}
  />;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 }, metaText: { color: c.ink, fontSize: 11, lineHeight: 18 },
});
