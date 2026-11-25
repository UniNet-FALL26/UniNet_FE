import { apiRequest } from '@/services/api';

export type PublicProfileRole = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type PublicRoleProfile = {
  id: string; role: PublicProfileRole; fullName: string; nickname: string; organizationName: string | null;
  avatarUrl: string | null; coverUrl: string | null; bio: string | null; universityName: string | null;
  major: string | null; partnerType: 0 | 1 | 2 | 3 | 4 | null; industry: string | null;
  isVerified: boolean; createdAt: string; websites: string[]; contactEmail: string | null; phone: string | null;
  address: string | null; introduction: import('@/types/partner-introduction').PartnerIntroduction | null;
};

export const publicProfileService = {
  getById: (profileId: string, signal?: AbortSignal) => apiRequest<PublicRoleProfile>(`/profile/public/${encodeURIComponent(profileId)}`, { signal, feedback: false }),
};
