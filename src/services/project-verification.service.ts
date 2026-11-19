import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { VerificationDetail, VerificationPage, VerificationPackage, MeetingSlots, MeetingSlot, VerificationFinalResult } from '@/types/project-verification';

const base = () => `${API_URL.endsWith('/api') ? '' : '/api'}/projects`;
const id = (value: string) => {
  if (!value.trim()) throw new Error('Không tìm thấy mã dự án.');
  return encodeURIComponent(value);
};
export const projectVerificationService = {
  cancel(verificationId: string, reason: string) {
    return apiRequest<VerificationDetail>(`${base()}/verifications/${id(verificationId)}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: reason.trim() }) });
  },
  async result(verificationId: string, signal?: AbortSignal, feedback?: false) {
    const value = await apiRequest<VerificationFinalResult>(`${base()}/verifications/${id(verificationId)}/result`, { signal, feedback });
    if (!value || ![0, 1, 2, 3].includes(value.status) || !Array.isArray(value.reports)) throw new Error('Phản hồi kết quả thẩm định không hợp lệ.');
    return value;
  },
  packages(page = 1, signal?: AbortSignal) {
    return apiRequest<{ packages: VerificationPackage[]; totalPages: number }>(`${API_URL.endsWith('/api') ? '' : '/api'}/packages?type=0&role=0&isActive=true&page=${page}&pageSize=20`, { signal });
  },
  create(projectId: string, packageId: string) {
    return apiRequest<VerificationDetail>(`${base()}/${id(projectId)}/verifications`, { method: 'POST', body: JSON.stringify({ packageId }) });
  },
  slots(verificationId: string, from: string, to: string, signal?: AbortSignal) {
    return apiRequest<MeetingSlots>(`${base()}/verifications/${id(verificationId)}/meeting-slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal });
  },
  hold(verificationId: string, slot: MeetingSlot) {
    return apiRequest<VerificationDetail>(`${base()}/verifications/${id(verificationId)}/meeting`, { method: 'PUT', body: JSON.stringify({ startAt: slot.startAt, endAt: slot.endAt }) });
  },
  async list(projectId: string, pendingOnly = false, signal?: AbortSignal) {
    const result = await apiRequest<VerificationPage>(`${base()}/${id(projectId)}/verifications?page=1&pageSize=1${pendingOnly ? '&status=0' : ''}`, { signal });
    if (!result || !Array.isArray(result.verifications) || !Number.isInteger(result.totalPages)) throw new Error('Phản hồi hồ sơ thẩm định không hợp lệ.');
    return result;
  },
  async detail(verificationId: string, signal?: AbortSignal) {
    const result = await apiRequest<VerificationDetail>(`${base()}/verifications/${id(verificationId)}`, { signal });
    if (!result?.verification || !Array.isArray(result.assignments) || !Array.isArray(result.payments)) throw new Error('Phản hồi chi tiết hồ sơ không hợp lệ.');
    return result;
  },
  async latestFinalResult(projectId: string, signal: AbortSignal): Promise<VerificationFinalResult | null> {
    for (let page = 1; !signal.aborted; page++) {
      const history = await apiRequest<VerificationPage>(`${base()}/${id(projectId)}/verifications?page=${page}&pageSize=20`, { signal, feedback: false });
      const concluded = history.verifications.find(verification => verification.status === 1 || verification.status === 2);
      if (concluded) {
        const result = await projectVerificationService.result(concluded.id, signal, false);
        return result.status === 1 || result.status === 2 ? result : null;
      }
      if (page >= history.totalPages || !history.verifications.length) break;
    }
    return null;
  },
  contribution(projectId: string, signal?: AbortSignal) {
    return apiRequest<{ status: number }>(`${base()}/${id(projectId)}/contribution`, { signal });
  },
};
