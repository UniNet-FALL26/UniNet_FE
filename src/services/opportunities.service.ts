import { apiRequest } from '@/services/api';
import type { PortfolioResponse } from '@/types/portfolio';

export type OpportunityView = 'all' | 'saved' | 'applied';
export type OpportunityWorkType = 0 | 1 | 2;
export type OpportunityPartnerType = 0 | 1 | 2 | 3 | 4;
export type OpportunitySkill = { skillId: string | null; name: string; category: number | null; requirementType: 0 | 1 };
export type OpportunityBenefit = { title: string; description: string; icon?: string | null };
export type OpportunityJob = {
  id: string;
  title: string;
  workType: OpportunityWorkType;
  minSalaryVnd: number | null;
  maxSalaryVnd: number | null;
  location: string | null;
  description: string | null;
  startAt: string | null;
  deadline: string | null;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  projectAreas: string[];
  skills: OpportunitySkill[];
  benefits: OpportunityBenefit[];
  companyName: string;
  companyAvatarUrl: string | null;
  companyIndustry: string | null;
  companyIsVerified: boolean;
  companyBio: string | null;
  companyAddress: string | null;
  companyWebsite: string | null;
  companyWebsites?: string[] | null;
  companyContactEmail: string | null;
  companyPhone: string | null;
  companyPartnerType?: OpportunityPartnerType | null;
  applicantCount: number;
  isSaved: boolean;
  isApplied: boolean;
  applicationStatus: number | null;
  appliedAt: string | null;
  createdAt: string;
};
export type OpportunityJobsPage = { page: number; pageSize: number; totalItems: number; totalPages: number; jobs: OpportunityJob[] };
export type SubmittedApplication = { id: string; applicationRound: number; appliedAt: string; status: number; submittedPortfolio: PortfolioResponse | null };
export type PublicPartnerJob = { id: string; title: string; workType: OpportunityWorkType; minSalaryVnd: number | null; maxSalaryVnd: number | null; location: string | null; deadline: string | null };
export type PublicPartnerProfile = { id: string; organizationName: string; partnerType: OpportunityPartnerType | null; avatarUrl: string | null; coverUrl: string | null; isVerified: boolean; industry: string | null; bio: string | null; address: string | null; contactEmail: string | null; phone: string | null; websites: string[]; openJobs: PublicPartnerJob[] };

export const opportunitiesService = {
  list: (params: { view?: OpportunityView; keyword?: string; workType?: OpportunityWorkType; page?: number; pageSize?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    query.set('view', params.view ?? 'all');
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.workType !== undefined) query.set('workType', String(params.workType));
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 20));
    return apiRequest<OpportunityJobsPage>(`/opportunities?${query.toString()}`, { signal });
  },
  get: (jobId: string, signal?: AbortSignal) => apiRequest<OpportunityJob>(`/opportunities/${encodeURIComponent(jobId)}`, { signal }),
  getPartnerProfile: (jobId: string, signal?: AbortSignal) => apiRequest<PublicPartnerProfile>(`/opportunities/${encodeURIComponent(jobId)}/partner-profile`, { signal }),
  getOwnApplications: (jobId: string, signal?: AbortSignal) => apiRequest<SubmittedApplication[]>(`/opportunities/${encodeURIComponent(jobId)}/applications`, { signal }),
  save: (jobId: string, signal?: AbortSignal) => apiRequest<void>(`/opportunities/${encodeURIComponent(jobId)}/saved`, { method: 'PUT', signal }),
  unsave: (jobId: string, signal?: AbortSignal) => apiRequest<void>(`/opportunities/${encodeURIComponent(jobId)}/saved`, { method: 'DELETE', signal }),
  apply: (jobId: string, coverMessage: string, signal?: AbortSignal) => apiRequest<void>(`/opportunities/${encodeURIComponent(jobId)}/applications`, { method: 'POST', body: JSON.stringify({ coverMessage: coverMessage.trim() || null }), signal }),
};
