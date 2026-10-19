import { apiRequest } from '@/services/api';

export type SkillCatalogItem = { id: string; name: string; iconUrl: string | null; category: string };

export const skillService = {
  getSkills: (signal?: AbortSignal) => apiRequest<SkillCatalogItem[]>('/profile/skills', { signal }),
};
