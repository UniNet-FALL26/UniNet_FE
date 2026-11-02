import { apiRequest } from '@/services/api';
import type { AuthAccount } from '@/types/auth';
import { assessorProfileSections, type AssessorProfileSection, type AssessorProfileSectionValues } from '@/constants/assessor-profile-sections';

export type AssessorDetails = {
  jobTitle: string | null; companyName: string | null; yearsOfExperience: number; expertise: string[];
  education: string | null; university: string | null; linkedInUrl: string | null; gitHubUrl: string | null; portfolioUrl: string | null;
};
export type AssessorProfile = NonNullable<AuthAccount['profile']> & {
  bio: string | null; contactEmail: string | null; phone: string | null; address: string | null;
  universityName?: string | null; major?: string | null; assessorJson?: AssessorDetails | null;
};
export type AssessorProfileInput = {
  fullName: string; nickname: string; avatarUrl: string | null; coverUrl: string | null;
  bio: string | null; contactEmail: string | null; phone: string | null; address: string | null; assessorJson: AssessorDetails | null;
};
export type AssessorAccount = AuthAccount & { profile: AssessorProfile };
const emptyDetails = (): AssessorDetails => ({ jobTitle: null, companyName: null, yearsOfExperience: 0, expertise: [], education: null, university: null, linkedInUrl: null, gitHubUrl: null, portfolioUrl: null });
export function profileSectionInput(profile: AssessorProfile, section: AssessorProfileSection, values: AssessorProfileSectionValues): AssessorProfileInput {
  const input: AssessorProfileInput = {
    fullName: profile.fullName, nickname: profile.nickname, avatarUrl: profile.avatarUrl ?? null, coverUrl: profile.coverUrl ?? null,
    bio: profile.bio, contactEmail: profile.contactEmail, phone: profile.phone, address: profile.address, assessorJson: profile.assessorJson ?? null,
  };
  if (section === 'bio') input.bio = values.bio.trim() || null;
  else if (section === 'contact') {
    input.contactEmail = values.contactEmail.trim() || null; input.phone = values.phone.trim() || null; input.address = values.address.trim() || null;
  } else {
    const details = { ...(profile.assessorJson ?? emptyDetails()) };
    for (const [key] of assessorProfileSections[section].fields) {
      if (key === 'yearsOfExperience') {
        if (!/^\d+$/.test(values[key]) || Number(values[key]) > 80) throw new Error('Số năm kinh nghiệm phải là số nguyên từ 0 đến 80.');
        details.yearsOfExperience = Number(values[key]);
      } else if (key === 'expertise') details.expertise = values[key].split(/[,\n]/).map(value => value.trim()).filter(Boolean);
      else details[key] = values[key].trim() || null;
    }
    input.assessorJson = Object.values(details).some(value => Array.isArray(value) ? value.length > 0 : !!value) ? details : null;
  }
  const details = input.assessorJson;
  if (details) {
    details.expertise = [...new Map(details.expertise.map(value => [value.toLocaleLowerCase(), value])).values()];
    if (details.expertise.length > 30 || details.expertise.some(value => value.length > 100)) throw new Error('Tối đa 30 lĩnh vực, mỗi lĩnh vực tối đa 100 ký tự.');
    for (const key of ['linkedInUrl', 'gitHubUrl', 'portfolioUrl'] as const) {
      if (!details[key]) continue;
      try { const url = new URL(details[key]); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || details[key].length > 2048) throw new Error(); }
      catch { throw new Error('Liên kết phải là URL http/https hợp lệ, không chứa thông tin đăng nhập.'); }
    }
  }
  return input;
}
export const assessorProfileService = {
  get: (signal?: AbortSignal) => apiRequest<AssessorAccount>('/profile/me', { signal }),
  save: (input: AssessorProfileInput, signal?: AbortSignal) => apiRequest<AssessorAccount>('/profile/assessor', { method: 'PUT', body: JSON.stringify(input), signal, feedback: false }),
  clear: () => apiRequest<AssessorAccount>('/profile/assessor', { method: 'DELETE', feedback: false }),
  saveSection: async (section: AssessorProfileSection, values: AssessorProfileSectionValues, signal?: AbortSignal) => {
    const { profile } = await apiRequest<AssessorAccount>('/profile/me', { signal });
    return apiRequest<AssessorAccount>('/profile/assessor', { method: 'PUT', body: JSON.stringify(profileSectionInput(profile, section, values)), signal, feedback: false });
  },
  saveName: async (fullName: string, signal?: AbortSignal) => {
    const { profile } = await apiRequest<AssessorAccount>('/profile/me', { signal });
    const input: AssessorProfileInput = {
      fullName, nickname: profile.nickname, avatarUrl: profile.avatarUrl ?? null, coverUrl: profile.coverUrl ?? null,
      bio: profile.bio, contactEmail: profile.contactEmail, phone: profile.phone, address: profile.address, assessorJson: profile.assessorJson ?? null,
    };
    return apiRequest<AssessorAccount>('/profile/assessor', { method: 'PUT', body: JSON.stringify(input), signal, feedback: false });
  },
};
