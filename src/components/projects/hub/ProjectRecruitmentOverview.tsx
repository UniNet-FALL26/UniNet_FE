import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { projectHubService } from '@/services/project-hub.service';
import { HubAction, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { BulletList, messageOf } from './ProjectHubFields';
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
  return <HubModal title="Thông tin tuyển thành viên" icon="people" compact wide={false} subtitle={project.title}
    onClose={busy ? () => undefined : onClose} footer={<>
      <HubAction compact title="Đóng" onPress={onClose} disabled={busy} />
      {project.isOwner && onSaved && recruitment.status === 1 && <HubAction compact title="Đóng tuyển" onPress={() => void closeRecruitment()} busy={busy} />}
      {project.isOwner && onEdit && project.status !== 2 && project.status !== 3 && <HubAction compact title="Chỉnh sửa" icon="edit" variant="primary" onPress={onEdit} disabled={busy} />}
      {footerAction}
    </>}>
    <View style={{ gap: 16 }}>
      <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{status}</Text>
      <View style={{ gap: 6 }}><Text style={ui.label}>Hạn tuyển</Text><Text style={ui.muted}>{recruitment.deadline ? `${formatRecruitmentDeadline(recruitment.deadline)} (giờ Việt Nam)` : 'Chưa xác định hạn tuyển'}</Text></View>
      {!!recruitment.description && <View style={{ gap: 6 }}><Text style={ui.label}>Giới thiệu ngắn</Text><Text style={ui.muted}>{recruitment.description}</Text></View>}
      {recruitment.positions.map(item => <View key={item.id} style={{ gap: 12, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: '#F8FAFF' }}>
        <Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{item.name}</Text>
        <Text style={ui.muted}>Số lượng tuyển: {item.quantity}</Text>
        <View style={{ gap: 6 }}><Text style={ui.label}>Kỹ năng & công nghệ</Text><ProjectTechnologyChips values={[...new Set([...item.technologies, ...item.skills])]} catalog={catalog} /></View>
        {!!item.jobDescription && <Text style={ui.muted}>{item.jobDescription}</Text>}
        {item.requirements.length > 0 && <View style={{ gap: 6 }}><Text style={ui.label}>Yêu cầu bổ sung</Text><BulletList values={item.requirements} /></View>}
        {item.benefits.length > 0 && <View style={{ gap: 6 }}><Text style={ui.label}>Quyền lợi</Text><BulletList values={item.benefits} /></View>}
      </View>)}
      {!!error && <Text role="alert" style={ui.error}>{error}</Text>}
    </View>
  </HubModal>;
}
