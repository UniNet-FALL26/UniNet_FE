import { View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubPanel } from './ProjectHubUI';

export function ProjectSettingsPanel({ project, onManage }: { project: HubProject; onManage: (action: 'complete' | 'delete' | 'leave') => void }) {
  return <View role="tabpanel" aria-label="Cài đặt dự án" style={{ gap: 14 }}>
    <HubPanel compact title="Quản lý dự án" icon="settings">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {project.isOwner && project.status !== 2 && project.status !== 3 && <HubAction compact title="Hoàn thành dự án" icon="check" onPress={() => onManage('complete')} />}
        {project.isOwner ? <HubAction compact title="Xóa dự án" icon="trash" variant="danger" onPress={() => onManage('delete')} /> : <HubAction compact title="Rời dự án" variant="danger" onPress={() => onManage('leave')} />}
      </View>
    </HubPanel>
  </View>;
}
