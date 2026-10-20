import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { EvidenceModeration, VerificationDetail, VerificationPage } from '@/types/project-verification';

const base = () => `${API_URL.endsWith('/api') ? '' : '/api'}/projects`;
const id = (value: string) => {
  if (!value.trim()) throw new Error('Không tìm thấy mã dự án.');
  return encodeURIComponent(value);
};
const review = (value: EvidenceModeration, projectId: string) => {
  if (!value || value.projectId !== projectId || !Number.isInteger(value.status) || value.status < 0 || value.status > 5 || typeof value.isCurrent !== 'boolean' || !Array.isArray(value.attempts) || !Array.isArray(value.source?.tasks)) {
    throw new Error('Phản hồi kiểm tra cấp 1 không hợp lệ.');
  }
  return value;
};
export const projectVerificationService = {
  async getLevel1(projectId: string, signal?: AbortSignal) {
    return review(await apiRequest<EvidenceModeration>(`${base()}/${id(projectId)}/evidence-moderation`, { signal }), projectId);
  },
  async retryLevel1(projectId: string) {
    return review(await apiRequest<EvidenceModeration>(`${base()}/${id(projectId)}/evidence-moderation/retry`, { method: 'POST' }), projectId);
  },
  async list(projectId: string, pendingOnly = false, signal?: AbortSignal) {
    const result = await apiRequest<VerificationPage>(`${base()}/${id(projectId)}/verifications?page=1&pageSize=1${pendingOnly ? '&status=0' : ''}`, { signal });
    if (!result || !Array.isArray(result.verifications) || !Number.isInteger(result.totalPages)) throw new Error('Phản hồi hồ sơ cấp 2 không hợp lệ.');
    return result;
  },
  async detail(verificationId: string, signal?: AbortSignal) {
    const result = await apiRequest<VerificationDetail>(`${base()}/verifications/${id(verificationId)}`, { signal });
    if (!result?.verification || !Array.isArray(result.assignments) || !Array.isArray(result.payments)) throw new Error('Phản hồi chi tiết hồ sơ không hợp lệ.');
    return result;
  },
  contribution(projectId: string, signal?: AbortSignal) {
    return apiRequest<{ status: number }>(`${base()}/${id(projectId)}/contribution`, { signal });
  },
};
