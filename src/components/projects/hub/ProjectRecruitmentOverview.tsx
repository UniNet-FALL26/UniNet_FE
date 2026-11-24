import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { projectHubService } from '@/services/project-hub.service';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { messageOf } from './ProjectHubFields';
import { formatRecruitmentDeadline } from './ProjectRecruitmentPickers';
import { ProjectTechnologyChips } from './ProjectTechnologyChips';

export function ProjectRecruitmentOverview({ project, onSaved, onClose, onEdit, footerAction }: {
  project: HubProject; onSaved?: (value: HubProject) => void; onClose: () => void; onEdit?: () => void; footerAction?: ReactNode;
}) {
  const recruitment = project.recruitment!;
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    skillService.getSkills(controller.signal).then(items => { if (!controller.signal.aborted) setCatalog(items); }).catch(() => {});
    return () => controller.abort();
  }, []);
  async function closeRecruitment() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const saved = await projectHubService.saveRecruitment(project.id, {
        description: recruitment.description, deadline: recruitment.deadline,
        positions: recruitment.positions, status: 2,
      });
      onSaved?.(saved);
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  const expired = recruitment.deadline && Date.parse(recruitment.deadline) <= Date.now();
  const status = recruitment.status === 2 ? 'Đã đóng tuyển' : recruitment.status === 0 ? 'Chưa đăng tuyển' : expired ? 'Đã hết hạn tuyển' : 'Đang tuyển thành viên';
  return <HubModal title="Thông tin tuyển thành viên" icon="people" compact wide={false} maxWidth={520} subtitle={project.title}
    onClose={busy ? () => undefined : onClose} footer={<>
      {project.isOwner && onSaved && recruitment.status === 1 && <HubAction compact title="Đóng tuyển" onPress={() => void closeRecruitment()} busy={busy} />}
      {project.isOwner && onEdit && project.status !== 2 && project.status !== 3 && <HubAction compact title="Chỉnh sửa" icon="edit" variant="primary" onPress={onEdit} disabled={busy} />}
      {footerAction}
    </>}>
    <View style={s.body}>
      <View style={s.status}><View style={[s.dot, { backgroundColor: recruitment.status === 1 && !expired ? '#14D791' : '#8996B0' }]} /><Text style={s.statusText}>{status}</Text></View>
      <View style={s.infoRow}><View style={s.infoIcon}><HubIcon name="calendar" size={19} /></View><View style={s.infoContent}><Text style={s.label}>Hạn tuyển</Text><Text style={s.muted}>{recruitment.deadline ? `${formatRecruitmentDeadline(recruitment.deadline)} (giờ Việt Nam)` : 'Chưa xác định hạn tuyển'}</Text></View></View>
      {!!recruitment.description && <View style={s.infoRow}><View style={s.infoIcon}><HubIcon name="document" size={19} /></View><View style={s.infoContent}><Text style={s.label}>Giới thiệu ngắn</Text><Text style={s.muted}>{recruitment.description}</Text></View></View>}
      {recruitment.positions.map((item, index) => <View key={item.id} style={[s.position, index % 2 === 1 && s.positionAlternate]}>
        <View pointerEvents="none" accessibilityElementsHidden aria-hidden style={[s.ribbon, index % 2 === 1 && s.ribbonAlternate]} />
        <View style={s.positionHead}><Text accessibilityRole="header" style={s.positionTitle}>{item.name}</Text><View style={s.quantity}><HubIcon name="people" size={15} /><Text style={s.muted}>Số lượng tuyển: {item.quantity}</Text></View></View>
        <View style={s.section}><View style={s.sectionHead}><HubIcon name="code" size={17} /><Text style={s.label}>Kỹ năng & công nghệ</Text></View><View style={s.indent}><ProjectTechnologyChips values={[...new Set([...item.technologies, ...item.skills])]} catalog={catalog} /></View></View>
        {!!item.jobDescription && <Text style={s.muted}>{item.jobDescription}</Text>}
        {item.requirements.length > 0 && <View style={s.section}><View style={s.sectionHead}><HubIcon name="document" size={17} /><Text style={s.label}>Yêu cầu bổ sung</Text></View><View style={s.indent}>{item.requirements.map((requirement, i) => <View key={i} style={s.bulletRow}><View style={s.bullet} /><Text style={s.bulletText}>{requirement}</Text></View>)}</View></View>}
        {item.benefits.length > 0 && <View style={s.section}><View style={s.sectionHead}><HubIcon name="trophy" size={17} /><Text style={s.label}>Quyền lợi</Text></View><View style={s.indent}>{item.benefits.map((benefit, i) => <View key={i} style={s.bulletRow}><View style={s.bullet} /><Text style={s.bulletText}>{benefit}</Text></View>)}</View></View>}
      </View>)}
      {!!error && <Text role="alert" style={ui.error}>{error}</Text>}
    </View>
  </HubModal>;
}

const s = StyleSheet.create({
  body: { gap: 14, paddingBottom: 22 },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: '#E0ECFF' },
  dot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 11, lineHeight: 16, fontWeight: '600', color: c.primary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1, minWidth: 0, gap: 3 }, label: { color: c.ink, fontSize: 12, lineHeight: 18, fontWeight: '600' }, muted: { color: c.textSecondary, fontSize: 11, lineHeight: 17, flexShrink: 1 },
  position: { overflow: 'hidden', borderWidth: 1, borderColor: '#DCE6FC', borderRadius: 12, padding: 13, gap: 10, backgroundColor: '#F7FAFF', experimental_backgroundImage: 'linear-gradient(130deg, #FFFFFF 0%, #F4F8FF 100%)' },
  positionAlternate: { experimental_backgroundImage: 'linear-gradient(130deg, #FFFFFF 0%, #F6F5FF 100%)' },
  positionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#E4EBFA' },
  positionTitle: { color: c.ink, fontSize: 14, lineHeight: 20, fontWeight: '700', flexShrink: 1 }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { gap: 5 }, sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, indent: { paddingLeft: 25, gap: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.primary, marginTop: 7 }, bulletText: { color: c.ink, fontSize: 12, lineHeight: 18, flex: 1 },
  ribbon: { position: 'absolute', bottom: -35, right: -30, width: 175, height: 65, backgroundColor: '#E6EEFF', opacity: 0.7, transform: [{ rotate: '-30deg' }] },
  ribbonAlternate: { backgroundColor: '#E9E4FF' },
});
