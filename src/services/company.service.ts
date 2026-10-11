import { apiRequest } from '@/services/api';

export type CompanyJobStatus = 0 | 1 | 2 | 3;
export type CompanyJobWorkType = 0 | 1 | 2;
export type JobSkillRequirementType = 0 | 1;

export type CompanyJobSkill = {
  skillId: string;
  name: string;
  category: number;
  requirementType: JobSkillRequirementType;
};

export type CompanyJobBenefit = { title: string; description: string };

export type CompanyJob = {
  id: string;
  title: string;
  workType: CompanyJobWorkType;
  minSalaryVnd: number | null;
  maxSalaryVnd: number | null;
  location: string | null;
  description: string | null;
  status: CompanyJobStatus;
  startAt: string | null;
  deadline: string | null;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  projectAreas: string[];
  skills: CompanyJobSkill[];
  benefits: CompanyJobBenefit[];
  applicantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyJobInput = {
  title: string;
  workType: CompanyJobWorkType;
  minSalaryVnd: number | null;
  maxSalaryVnd: number | null;
  location: string;
  description: string;
  startAt: string | null;
  deadline: string;
  status: Exclude<CompanyJobStatus, 3>;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  projectAreas: string[];
  skills: { skillId: string; requirementType: JobSkillRequirementType }[];
  benefits: CompanyJobBenefit[];
};

export type CompanyProfile = {
  id: string;
  companyName: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  contactEmail: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  updatedAt: string;
  openJobs: CompanyJob[];
};

export type CompanyProfileInput = Pick<CompanyProfile,
  'companyName' | 'description' | 'industry' | 'website' | 'phone' | 'address' | 'contactEmail' | 'avatarUrl' | 'coverUrl'>;

export type CompanyDashboard = {
  companyName: string;
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  closedJobs: number;
  expiringJobs: number;
  totalApplications: number;
  pendingApplications: number;
  viewedApplications: number;
  interviewApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  openJobs: CompanyJob[];
};

export type CompanyJobsPage = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  closingSoonJobs: number;
  jobs: CompanyJob[];
};

export type SkillCatalogItem = { id: string; name: string; iconUrl: string | null; category: string };

// API_URL already includes the /api prefix (see .env.example).
export const companyService = {
  getProfile: (signal?: AbortSignal) => apiRequest<CompanyProfile>('/company/profile/me', { signal }),
  updateProfile: (input: CompanyProfileInput, signal?: AbortSignal) => apiRequest<CompanyProfile>('/company/profile/me', {
    method: 'PUT', body: JSON.stringify(input), signal,
  }),
  getDashboard: (signal?: AbortSignal) => apiRequest<CompanyDashboard>('/company/dashboard', { signal }),
  listJobs: (params: { status?: CompanyJobStatus; keyword?: string; page?: number; pageSize?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.status !== undefined) query.set('status', String(params.status));
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 100));
    return apiRequest<CompanyJobsPage>(`/company/jobs?${query.toString()}`, { signal });
  },
  getJob: (jobId: string, signal?: AbortSignal) => apiRequest<CompanyJob>(`/company/jobs/${encodeURIComponent(jobId)}`, { signal }),
  createJob: (input: CompanyJobInput, signal?: AbortSignal) => apiRequest<CompanyJob>('/company/jobs', {
    method: 'POST', body: JSON.stringify(input), signal,
  }),
  updateJob: (jobId: string, input: CompanyJobInput, signal?: AbortSignal) => apiRequest<CompanyJob>(`/company/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PUT', body: JSON.stringify(input), signal,
  }),
  updateJobStatus: (jobId: string, status: Exclude<CompanyJobStatus, 3>, signal?: AbortSignal) => apiRequest<CompanyJob>(`/company/jobs/${encodeURIComponent(jobId)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }), signal,
  }),
  deleteJob: (jobId: string, signal?: AbortSignal) => apiRequest<void>(`/company/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE', signal,
  }),
  getSkills: (signal?: AbortSignal) => apiRequest<SkillCatalogItem[]>('/profile/skills', { signal }),
};

export const companyJobStatusLabel: Record<CompanyJobStatus, string> = {
  0: 'Bản nháp', 1: 'Đã đăng', 2: 'Đã đóng', 3: 'Hết hạn',
};

export const companyJobWorkTypeLabel: Record<CompanyJobWorkType, string> = {
  0: 'Tại văn phòng', 1: 'Kết hợp', 2: 'Từ xa',
};

export function formatCompanyDate(value: string | null): string {
  if (!value) return 'Chưa đặt';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa đặt' : new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(date);
}

export function formatCompanySalary(min: number | null, max: number | null): string {
  const format = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
  if (min == null && max == null) return 'Thỏa thuận';
  if (min != null && max != null) return `${format(min)}–${format(max)} đ/tháng`;
  return `${format(min ?? max!)} đ/tháng`;
}
