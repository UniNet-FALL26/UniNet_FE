import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import type { SkillCatalogItem } from '@/services/skill.service';
import { findTechnology } from '@/utils/project-technologies';
import { PersonAvatar } from './PersonAvatar';
import { HubAction, HubIcon, ProjectCover, hubColors as c } from './ProjectHubUI';
import { formatRecruitmentDeadline } from './ProjectRecruitmentPickers';
import { TechnologyLogo } from './ProjectTechnologyChips';

export function RecruitmentPostCard({ project, catalog, width, edgeToEdge = false, onOpen }: { project: HubProject; catalog: SkillCatalogItem[]; width: number | '100%'; edgeToEdge?: boolean; onOpen: () => void }) {
  const recruitment = project.recruitment!;
  const compact = typeof width === 'number' && width < 620;
  const competencies = [...new Set([...project.technologies, ...recruitment.positions.flatMap(p => [...p.technologies, ...p.skills])])];
  const members = project.members.filter(member => member.status === 0 && member.userId !== project.creator.id);
  const recruitmentQuantity = recruitment.positions.reduce((total, position) => total + position.quantity, 0);
  const recruiting = recruitment.status === 1;
  return <View testID={`recruitment-post-${project.id}`} style={[s.card, { width }, edgeToEdge && s.edgeToEdge]}>
    <View style={[s.body, compact && s.bodyCompact]}>
      <View style={s.content}>
        <View pointerEvents="none" accessibilityElementsHidden aria-hidden style={[s.art, compact && { display: 'none' }]}><View style={s.artHalo} /><View style={s.laptop}><HubIcon name="code" size={36} color="#8B9EFF" /></View><View style={s.laptopBase} /></View>
        <View style={s.heading}>
          <View style={s.logo}>{project.logoUrl ? <ProjectCover url={project.logoUrl} title={project.title} height={56} hideTitle style={{ width: '100%' }} /> : <HubIcon name="folder" size={32} color="#FFFFFF" />}</View>
          <View style={s.identity}>
            <View style={s.titleRow}><Text accessibilityRole="header" aria-level={2} style={s.title} numberOfLines={2}>{project.title}</Text><View style={[s.badge, !recruiting && s.closedBadge]}><View style={[s.dot, !recruiting && { backgroundColor: '#D8E1EF' }]} /><Text style={s.badgeText}>{recruiting ? 'Đang tuyển' : recruitment.status === 2 ? 'Đã đóng tuyển' : 'Bản nháp'}</Text></View></View>
            <View style={s.metaRow}>
              <View style={s.creator}><PersonAvatar person={project.creator} size={20} /><Text style={s.meta} numberOfLines={1}>{project.creator.fullName}</Text></View>
              <View style={s.metaItem}><HubIcon name="person" size={13} color={c.ink} /><Text style={s.meta}>Chủ dự án</Text></View>
              <View style={s.metaItem}><HubIcon name="calendar" size={13} color={c.ink} /><Text style={s.meta}>{recruitment.deadline ? `Đóng: ${formatRecruitmentDeadline(recruitment.deadline)}` : 'Chưa xác định hạn tuyển'}</Text></View>
            </View>
          </View>
        </View>
        <Text style={s.description} numberOfLines={compact ? 3 : 2}>{recruitment.description || project.description}</Text>
        {competencies.length > 0 && <View style={s.competencies}>{competencies.slice(0, 5).map(name => <View key={name} style={s.competency}><TechnologyLogo name={name} iconUrl={findTechnology(catalog, name)?.iconUrl} size={16} /><Text style={s.competencyText}>{name}</Text></View>)}{competencies.length > 5 && <View accessibilityLabel={`${competencies.length - 5} kỹ năng và công nghệ khác`} style={s.competency}><Text style={s.more}>+{competencies.length - 5}</Text></View>}</View>}
      </View>
      <View style={[s.summary, compact && s.summaryCompact]}>
        <View style={s.summaryRow}><HubIcon name="invite" size={16} /><Text style={s.summaryText}>Tuyển: {recruitmentQuantity} thành viên</Text></View>
        <View style={s.summaryRow}><HubIcon name="people" size={16} /><Text style={s.summaryText}>Đã tham gia: {members.length} thành viên</Text></View>
      </View>
    </View>
    <View style={[s.bottom, compact && s.bottomCompact]}>
      <View style={s.participants}>{members.length > 0 && <View style={s.avatars}>{members.slice(0, 3).map((member, index) => <View key={member.id} style={[s.avatar, index > 0 && { marginLeft: -8 }]}><PersonAvatar person={member} size={24} /></View>)}</View>}<Text style={s.memberText}>{members.length ? `Đã có ${members.length} thành viên tham gia` : 'Trở thành đồng đội đầu tiên'}</Text></View>
      <HubAction compact title="Tham gia" variant="primary" onPress={onOpen} style={s.open} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  edgeToEdge: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, boxShadow: 'none' },
  card: { borderWidth: 1, borderColor: '#DEE7FA', borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden', boxShadow: '0 3px 12px rgba(45, 101, 230, 0.05)' },
  body: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 18 }, bodyCompact: { padding: 14, flexDirection: 'column', gap: 12, alignItems: 'stretch' },
  content: { flex: 1, minWidth: 0, gap: 10 }, heading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 56, height: 56, flexShrink: 0, overflow: 'hidden', borderRadius: 13, backgroundColor: '#7394FF', alignItems: 'center', justifyContent: 'center' },
  identity: { flex: 1, minWidth: 0, gap: 5 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  title: { color: c.ink, fontSize: 17, fontWeight: '700', lineHeight: 24, flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1382FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 }, closedBadge: { backgroundColor: '#6B7890' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27EDAA' }, badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 }, creator: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, meta: { color: '#52617E', fontSize: 11, lineHeight: 17, flexShrink: 1 },
  description: { color: c.ink, fontSize: 12, lineHeight: 20 }, competencies: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  competency: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E5EBF7', borderRadius: 7, backgroundColor: '#FBFCFF' },
  competencyText: { color: c.ink, fontSize: 11, lineHeight: 16 }, more: { color: c.primary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  summary: { width: 190, flexShrink: 0, justifyContent: 'center', padding: 12, gap: 12, borderWidth: 1, borderColor: '#E7EDFA', backgroundColor: '#F6F8FE', borderRadius: 10 },
  summaryCompact: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 12, padding: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, summaryText: { color: c.ink, fontSize: 11, lineHeight: 17, fontWeight: '500', flexShrink: 1 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 8, borderTopWidth: 1, borderColor: '#E9EEF9', backgroundColor: '#FAFBFF' },
  bottomCompact: { paddingHorizontal: 14 }, participants: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }, avatars: { flexDirection: 'row' },
  avatar: { borderWidth: 2, borderColor: '#FAFBFF', borderRadius: 16 }, memberText: { color: '#52617E', fontSize: 11, lineHeight: 18, flexShrink: 1 }, open: { minHeight: 30, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 4 },
  art: { position: 'absolute', right: 0, top: -10, width: 145, height: 85, opacity: 0.12, transform: [{ scale: 0.85 }] }, artHalo: { position: 'absolute', inset: 0, borderRadius: 20, backgroundColor: '#AFC6FF', transform: [{ skewX: '-18deg' }] },
  laptop: { position: 'absolute', right: 20, top: 18, width: 68, height: 47, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#6885ED', borderRadius: 5, backgroundColor: '#DDE5FF', transform: [{ skewX: '-14deg' }, { rotate: '-7deg' }] },
  laptopBase: { position: 'absolute', right: 12, top: 67, width: 95, height: 5, backgroundColor: '#6885ED', borderRadius: 4 },
});
