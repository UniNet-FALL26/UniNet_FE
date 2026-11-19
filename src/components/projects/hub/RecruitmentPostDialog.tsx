import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { HubAction, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { ProjectRecruitmentOverview } from './ProjectRecruitmentOverview';
import { ApplyProjectModal } from './ProjectCommunityModals';
import { messageOf } from './ProjectHubFields';

export function RecruitmentPostDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [project, setProject] = useState<HubProject | null>(null);
  const [pending, setPending] = useState(false), [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    Promise.all([projectHubService.get(projectId, controller.signal), projectHubService.mineRequests(projectId, controller.signal)])
      .then(([value, requests]) => {
        if (controller.signal.aborted) return;
        setProject(value); setPending(requests.items.some(item => item.requestType === 0 && item.status === 0));
      }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, attempt]);
  const deadline = project?.recruitment?.deadline;
  useEffect(() => {
    if (!deadline) return;
    const remaining = Date.parse(deadline) - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [deadline, now]);
  if (loading || error || !project?.recruitment) return <HubModal compact wide={false} title="Thông tin tuyển thành viên" icon="people" onClose={onClose}
    footer={<HubAction compact title="Đóng" onPress={onClose} />}>
    {loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bài tuyển" /> : error ? <View style={{ gap: 12 }}><Text role="alert" style={ui.error}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(n => n + 1)} /></View> : <Text style={ui.muted}>Bài tuyển này hiện không còn khả dụng.</Text>}
  </HubModal>;
  const canApply = !project.isOwner && !project.isMember && !pending && (project.status === 0 || project.status === 1) && project.recruitment.status === 1 && (!deadline || Date.parse(deadline) > Math.max(now, Date.now()));
  if (applying) return <ApplyProjectModal project={project} onClose={() => setApplying(false)} onApplied={() => { setPending(true); setApplying(false); }} />;
  return <ProjectRecruitmentOverview project={project} onClose={onClose} footerAction={<>
    <HubAction compact title="Xem dự án" onPress={() => { onClose(); router.push({ pathname: '/group/[id]', params: { id: project.id } }); }} />
    {pending && <Text role="status" style={{ color: c.primary, fontSize: 12, lineHeight: 18, maxWidth: 300 }}>Bạn đã gửi yêu cầu tham gia, đang chờ phản hồi.</Text>}
    {project.isOwner && <Text style={ui.muted}>Đây là dự án của bạn.</Text>}
    {!project.isOwner && project.isMember && <Text style={ui.muted}>Bạn đang là thành viên dự án.</Text>}
    {canApply && <HubAction compact title="Xin tham gia" icon="people" variant="primary" onPress={() => { setNow(Date.now()); if (!deadline || Date.parse(deadline) > Date.now()) setApplying(true); }} />}
  </>} />;
}
