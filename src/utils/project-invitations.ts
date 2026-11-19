import type { HubProject } from '@/types/project-hub';

export function canInviteProjectFriends(project: Pick<HubProject, 'status'>): boolean {
  return project.status === 0 || project.status === 1 || project.status === 2;
}
