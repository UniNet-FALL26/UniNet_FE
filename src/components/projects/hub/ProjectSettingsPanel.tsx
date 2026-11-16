import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubPanel, hubColors as c, ui } from './ProjectHubUI';

export function ProjectSettingsPanel({ project, onSaved, onManage }: { project: HubProject; onSaved: (project: HubProject) => void; onManage: (action: 'complete' | 'delete' | 'leave') => void }) {
  const [visibility, setVisibility] = useState(project.visibility);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const recruiting = project.recruitment?.status === 1;
  useEffect(() => { setVisibility(project.visibility); setError(''); }, [project.id, project.visibility]);
  async function save() {
    if (!project.isOwner || locked.current || visibility === project.visibility) return;
    locked.current = true; setBusy(true); setError('');
    try { onSaved(await projectHubService.update(project.id, { visibility })); }
    catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View role="tabpanel" aria-label="Cài đặt dự án" style={{ gap: 14 }}>
    {project.isOwner && <HubPanel compact title="Quyền hiển thị" icon="person">
      <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 19 }}>Chọn ai có thể xem thông tin dự án của bạn.</Text>
      <View role="radiogroup" aria-label="Quyền hiển thị dự án" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {([{ value: 0, label: 'Riêng tư' }, { value: 1, label: 'Công khai' }] as const).map(option => <Pressable key={option.value} role="radio" aria-label={option.label} aria-checked={visibility === option.value} disabled={busy || option.value === 0 && recruiting} onPress={() => setVisibility(option.value)} style={{ minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: visibility === option.value ? c.primary : c.line, backgroundColor: visibility === option.value ? c.blueWash : '#FFFFFF', opacity: option.value === 0 && recruiting ? 0.5 : 1 }}><Text style={{ fontSize: 13, color: visibility === option.value ? c.primary : c.ink }}>{option.label}</Text></Pressable>)}
      </View>
      {recruiting && <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 19 }}>Cần đóng tuyển thành viên trước khi chuyển dự án sang riêng tư.</Text>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      <View style={{ alignSelf: 'flex-start' }}><HubAction compact title="Lưu cài đặt" variant="primary" busy={busy} disabled={visibility === project.visibility} onPress={() => void save()} /></View>
    </HubPanel>}
    <HubPanel compact title="Quản lý dự án" icon="settings">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {project.isOwner && project.status !== 2 && project.status !== 3 && <HubAction compact title="Hoàn thành dự án" icon="check" disabled={busy} onPress={() => onManage('complete')} />}
        {project.isOwner ? <HubAction compact title="Xóa dự án" icon="trash" variant="danger" disabled={busy} onPress={() => onManage('delete')} /> : <HubAction compact title="Rời dự án" variant="danger" disabled={busy} onPress={() => onManage('leave')} />}
      </View>
    </HubPanel>
  </View>;
}
