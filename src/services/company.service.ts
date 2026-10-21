import { apiRequest } from '@/services/api';
import { skillService } from '@/services/skill.service';
export type { SkillCatalogItem } from '@/services/skill.service';

export type CompanyJobStatus = 0 | 1 | 2 | 3;
export type CompanyJobWorkType = 0 | 1 | 2;
export type CompanyJobApplicationStatus = 0 | 1 | 2 | 3 | 4;
export type JobSkillRequirementType = 0 | 1;
export type PartnerType = 0 | 1 | 2 | 3 | 4;
export type VerificationStatus = 0 | 1 | 2 | 3;
export type VerificationDocumentType = 0 | 1 | 2 | 3 | 4 | 5;

export type CompanyJobSkill = { skillId: string | null; name: string; category: number | null; requirementType: JobSkillRequirementType };
export type CompanyJobBenefit = { title: string; description: string; icon?: string };
export type CompanyJob = {
  id: string; title: string; workType: CompanyJobWorkType; minSalaryVnd: number | null; maxSalaryVnd: number | null;
  location: string | null; description: string | null; status: CompanyJobStatus; startAt: string | null; deadline: string | null;
  responsibilities: string[]; requiredQualifications: string[]; preferredQualifications: string[]; projectAreas: string[];
  skills: CompanyJobSkill[]; benefits: CompanyJobBenefit[]; applicantCount: number; createdAt: string; updatedAt: string;
};
export type CompanyApplicant = {
  id: string; jobId: string; studentUserId: string; fullName: string; nickname: string;
  universityName: string | null; major: string | null; avatarUrl: string | null; coverMessage: string | null;
  aiMatchScore: number | null; status: CompanyJobApplicationStatus; appliedAt: string; updatedAt: string;
};
export type CompanyJobInput = {
  title: string; workType: CompanyJobWorkType; minSalaryVnd: number | null; maxSalaryVnd: number | null;
  location: string; description: string; startAt: string | null; deadline: string; status: Exclude<CompanyJobStatus, 3>;
  requiredQualifications: string[]; preferredQualifications: string[]; projectAreas: string[];
  skills: { skillId?: string; name?: string; requirementType: JobSkillRequirementType }[]; benefits: CompanyJobBenefit[];
};
export type CompanyProfile = {
  id: string; companyName: string; partnerType: PartnerType; description: string | null; industry: string | null;
  website: string | null; phone: string | null; address: string | null; contactEmail: string | null;
  avatarUrl: string | null; coverUrl: string | null; isVerified: boolean; updatedAt: string; openJobs: CompanyJob[];
};
export type CompanyProfileInput = Pick<CompanyProfile,
  'companyName' | 'partnerType' | 'description' | 'industry' | 'website' | 'phone' | 'address' | 'contactEmail' | 'avatarUrl' | 'coverUrl'>;
export type CompanyDashboard = {
  companyName: string; totalJobs: number; publishedJobs: number; draftJobs: number; closedJobs: number;
  expiringJobs: number; totalApplications: number; pendingApplications: number; viewedApplications: number;
  interviewApplications: number; acceptedApplications: number; rejectedApplications: number; openJobs: CompanyJob[];
};
export type CompanyJobsPage = {
  page: number; pageSize: number; totalItems: number; totalPages: number; totalJobs: number;
  publishedJobs: number; draftJobs: number; closingSoonJobs: number; jobs: CompanyJob[];
};
export type PartnerVerificationStatus = { id: string | null; status: VerificationStatus | null; rejectReason: string | null; submittedAt: string | null };
export type PartnerVerificationDocument = { type: VerificationDocumentType; fileName: string; url: string };
export type PartnerVerificationInput = { taxCode?: string | null; representativeName?: string | null; documents: PartnerVerificationDocument[] };

type PartnerProfileResponse = {
  id: string; fullName: string; organizationName: string | null; avatarUrl: string | null; coverUrl: string | null;
  bio: string | null; partnerType: PartnerType | null; industry: string | null; website: string | null;
  contactEmail: string | null; phone: string | null; address: string | null; isVerified: boolean;
};
type AccountProfileResponse = { profile: PartnerProfileResponse | null };
type PartnerDashboardResponse = Omit<CompanyDashboard, 'companyName'> & { organizationName: string };

async function getProfile(signal?: AbortSignal): Promise<CompanyProfile> {
  const [account, dashboard] = await Promise.all([
    apiRequest<AccountProfileResponse>('/profile/me', { signal }),
    apiRequest<PartnerDashboardResponse>('/partner/dashboard', { signal }),
  ]);
  const profile = account.profile;
  if (!profile) throw new Error('Không tìm thấy hồ sơ đối tác.');
  return {
    id: profile.id, companyName: profile.organizationName || profile.fullName, partnerType: profile.partnerType ?? 4,
    description: profile.bio, industry: profile.industry, website: profile.website, phone: profile.phone,
    address: profile.address, contactEmail: profile.contactEmail, avatarUrl: profile.avatarUrl, coverUrl: profile.coverUrl,
    isVerified: profile.isVerified, updatedAt: '', openJobs: dashboard.openJobs,
  };
}

export const companyService = {
  getProfile,
  updateProfile: async (input: CompanyProfileInput, signal?: AbortSignal) => {
    await apiRequest('/profile/partner', {
      method: 'PUT', body: JSON.stringify({
        organizationName: input.companyName, partnerType: input.partnerType, avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl, bio: input.description, industry: input.industry, website: input.website,
        contactEmail: input.contactEmail, phone: input.phone, address: input.address,
      }), signal,
    });
    return getProfile(signal);
  },
  getDashboard: async (signal?: AbortSignal): Promise<CompanyDashboard> => {
    const data = await apiRequest<PartnerDashboardResponse>('/partner/dashboard', { signal });
    const { organizationName, ...rest } = data;
    return { ...rest, companyName: organizationName };
  },
  listJobs: (params: { status?: CompanyJobStatus; keyword?: string; page?: number; pageSize?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.status !== undefined) query.set('status', String(params.status));
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    query.set('page', String(params.page ?? 1)); query.set('pageSize', String(params.pageSize ?? 100));
    return apiRequest<CompanyJobsPage>(`/partner/jobs?${query.toString()}`, { signal });
  },
  getJob: (jobId: string, signal?: AbortSignal) => apiRequest<CompanyJob>(`/partner/jobs/${encodeURIComponent(jobId)}`, { signal }),
  createJob: (input: CompanyJobInput, signal?: AbortSignal) => apiRequest<CompanyJob>('/partner/jobs', { method: 'POST', body: JSON.stringify(input), signal }),
  updateJob: (jobId: string, input: CompanyJobInput, signal?: AbortSignal) => apiRequest<CompanyJob>(`/partner/jobs/${encodeURIComponent(jobId)}`, { method: 'PUT', body: JSON.stringify(input), signal }),
  updateJobStatus: (jobId: string, status: Exclude<CompanyJobStatus, 3>, signal?: AbortSignal) => apiRequest<CompanyJob>(`/partner/jobs/${encodeURIComponent(jobId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }), signal }),
  deleteJob: (jobId: string, signal?: AbortSignal) => apiRequest<void>(`/partner/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', signal }),
  listApplicants: (jobId: string, signal?: AbortSignal) => apiRequest<CompanyApplicant[]>(`/partner/jobs/${encodeURIComponent(jobId)}/applications`, { signal }),
  updateApplicantStatus: (jobId: string, applicationId: string, status: CompanyJobApplicationStatus, signal?: AbortSignal) => apiRequest<CompanyApplicant>(`/partner/jobs/${encodeURIComponent(jobId)}/applications/${encodeURIComponent(applicationId)}`, { method: 'PATCH', body: JSON.stringify({ status }), signal }),
  getSkills: skillService.getSkills,
  getVerificationStatus: (signal?: AbortSignal) => apiRequest<PartnerVerificationStatus>('/partner/verification/me', { signal }),
  submitVerification: (input: PartnerVerificationInput, signal?: AbortSignal) => apiRequest<PartnerVerificationStatus>('/partner/verification', { method: 'POST', body: JSON.stringify(input), signal }),
};

export const companyJobStatusLabel: Record<CompanyJobStatus, string> = { 0: 'Bản nháp', 1: 'Đã đăng', 2: 'Đã đóng', 3: 'Hết hạn' };
export const companyJobApplicationStatusLabel: Record<CompanyJobApplicationStatus, string> = { 0: 'Chờ xem', 1: 'Đã xem', 2: 'Phỏng vấn', 3: 'Đã nhận', 4: 'Từ chối' };
export const companyJobWorkTypeLabel: Record<CompanyJobWorkType, string> = { 0: 'Tại văn phòng', 1: 'Kết hợp', 2: 'Từ xa' };
export function formatCompanyDate(value: string | null): string {
  if (!value) return 'Chưa đặt'; const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa đặt' : new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(date);
}
export function formatCompanySalary(min: number | null, max: number | null): string {
  const format = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
  if (min == null && max == null) return 'Thỏa thuận';
  if (min != null && max != null) return `${format(min)}–${format(max)} đ/tháng`;
  return `${format(min ?? max!)} đ/tháng`;
}
