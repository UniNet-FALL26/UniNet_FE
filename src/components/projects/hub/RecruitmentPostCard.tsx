import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { PersonAvatar } from './PersonAvatar';
import { HubAction, HubIcon, ProjectCover, hubColors as c } from './ProjectHubUI';
import { formatRecruitmentDeadline } from './ProjectRecruitmentPickers';

export function RecruitmentPostCard({ project, width, onOpen }: { project: HubProject; width: number | '100%'; onOpen: () => void }) {
  const recruitment = project.recruitment!;
  const competencies = [...new Set(recruitment.positions.flatMap(p => [...p.technologies, ...p.skills]))];
  return <View testID={`recruitment-post-${project.id}`} style={[s.card, { width }]}>
    <View style={s.heading}>
      <View style={s.logo}><ProjectCover url={project.logoUrl} title={project.title} height={56} hideTitle style={{ borderRadius: 10 }} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text accessibilityRole="header" aria-level={2} style={s.title} numberOfLines={2}>{project.title}</Text>
        <View style={s.creator}><PersonAvatar person={project.creator} size={22} /><Text style={s.meta} numberOfLines={1}>{project.creator.fullName}</Text></View>
      </View>
    </View>
    <Text style={s.description} numberOfLines={3}>{recruitment.description || project.description}</Text>
    <View style={s.positions}>{recruitment.positions.slice(0, 3).map(position => <View key={position.id} style={s.position}>
      <HubIcon name="person" size={14} /><Text style={s.positionText} numberOfLines={1}>{position.name} · {position.quantity}</Text>
    </View>)}{recruitment.positions.length > 3 && <Text style={s.meta}>+{recruitment.positions.length - 3} vị trí khác</Text>}</View>
    {competencies.length > 0 && <View style={s.competencies}>{competencies.slice(0, 5).map(name => <Text key={name} style={s.competency}>{name}</Text>)}{competencies.length > 5 && <Text style={s.meta}>+{competencies.length - 5}</Text>}</View>}
    <View style={s.bottom}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><HubIcon name="clock" size={15} color={c.textSecondary} /><Text style={s.meta}>{recruitment.deadline ? formatRecruitmentDeadline(recruitment.deadline) : 'Chưa xác định hạn tuyển'}</Text></View>
      <HubAction compact title="Xem bài tuyển" onPress={onOpen} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  card: { padding: 20, gap: 16, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: '#FFFFFF' },
  heading: { flexDirection: 'row', gap: 12, alignItems: 'center' }, logo: { width: 56, height: 56, flexShrink: 0, overflow: 'hidden', borderRadius: 10 },
  title: { color: c.ink, fontSize: 17, fontWeight: '600', lineHeight: 24 }, creator: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  meta: { color: c.textSecondary, fontSize: 12, lineHeight: 18, flexShrink: 1 }, description: { color: c.ink, fontSize: 13, lineHeight: 21 },
  positions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, position: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: c.blueWash, borderRadius: 6, maxWidth: '100%' },
  positionText: { color: c.primary, fontSize: 12, flexShrink: 1 }, competencies: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  competency: { color: c.textSecondary, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: c.line, borderRadius: 6 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: c.line },
});
