import type { HubMember, HubProject } from '@/types/project-hub';

export function projectDisplayMembers(project: Pick<HubProject, 'id' | 'creator' | 'createdAt' | 'isOwner' | 'members'>, viewerProfileId?: string): HubMember[] {
  const members = [...project.members];
  if (!members.some(item => item.userId === project.creator.id)) {
    members.unshift({
      id: `owner-${project.id}`, userId: project.creator.id,
      fullName: project.creator.fullName, avatarUrl: project.creator.avatarUrl,
      role: 'Chủ dự án', positionId: null, status: 0, joinedAt: project.createdAt,
    });
  }
  const selfId = viewerProfileId || (project.isOwner ? project.creator.id : undefined);
  return [...members.filter(item => item.userId === selfId), ...members.filter(item => item.userId !== selfId)];
}
