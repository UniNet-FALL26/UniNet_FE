import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubPanel, hubColors as c } from './ProjectHubUI';
import { ProjectPencilButton } from './ProjectPencilButton';
import { ProjectTechnologyChips } from './ProjectTechnologyChips';
import { ProjectTechnologiesModal } from './ProjectTechnologiesModal';

export function ProjectTechnologiesCard({ project, canEdit, onSaved }: { project: HubProject; canEdit: boolean; onSaved: (project: HubProject) => void }) {
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]), [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setFailed(false);
    skillService.getSkills(controller.signal).then(items => { if (!controller.signal.aborted) setCatalog(items); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);
  return <HubPanel compact title="Công nghệ sử dụng" icon="layers" style={{ paddingRight: canEdit ? 42 : 16 }}>
    {canEdit && <ProjectPencilButton corner label="Chỉnh sửa công nghệ sử dụng" onPress={() => setEditing(true)} />}
    {project.technologies.length ? <ProjectTechnologyChips values={project.technologies} catalog={catalog} /> : <Text style={{ fontSize: 12, lineHeight: 19, color: c.textSecondary }}>Hãy thêm công nghệ để giới thiệu nền tảng và công cụ của dự án.</Text>}
    {failed && <><Text style={{ fontSize: 11, color: c.textSecondary }}>Chưa tải được ảnh và danh mục công nghệ.</Text><HubAction compact title="Thử tải lại công nghệ" onPress={() => setAttempt(value => value + 1)} /></>}
    {editing && canEdit && <ProjectTechnologiesModal project={project} catalog={catalog} onSaved={onSaved} onClose={() => setEditing(false)} />}
  </HubPanel>;
}
