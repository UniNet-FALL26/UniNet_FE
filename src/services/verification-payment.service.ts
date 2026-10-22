import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { VerificationPackage, VerificationTransaction, VerificationTransactions } from '@/types/project-verification';

const prefix = () => API_URL.endsWith('/api') ? '' : '/api';
const base = (verificationId: string) => {
  if (!verificationId?.trim()) throw new Error('Không tìm thấy hồ sơ xác minh.');
  return `${prefix()}/project-verifications/${encodeURIComponent(verificationId)}/payments`;
};
function validate(value: VerificationTransaction, verificationId: string) {
  if (!value?.id || value.verificationId !== verificationId || ![0, 1, 2].includes(value.status) || !Number.isFinite(value.amountVnd) || value.amountVnd <= 0 || value.currency !== 'VND' || typeof value.requiresReview !== 'boolean' || typeof value.reconciliationRequired !== 'boolean') throw new Error('Dữ liệu thanh toán chưa hợp lệ. Vui lòng tải lại.');
  return value;
}
export const verificationPaymentService = {
  async create(verificationId: string) {
    return validate(await apiRequest<VerificationTransaction>(base(verificationId), { method: 'POST' }), verificationId);
  },
  async get(verificationId: string, transactionId: string, signal?: AbortSignal) {
    return validate(await apiRequest<VerificationTransaction>(`${base(verificationId)}/${encodeURIComponent(transactionId)}`, { signal }), verificationId);
  },
  async history(verificationId: string, signal?: AbortSignal, page = 1) {
    const result = await apiRequest<VerificationTransactions>(`${base(verificationId)}?page=${page}&pageSize=10`, { signal });
    if (!result || !Array.isArray(result.transactions) || !Number.isInteger(result.totalPages)) throw new Error('Chưa tải được giao dịch thanh toán.');
    result.transactions.forEach(t => validate(t, verificationId));
    return result;
  },
  package(packageId: string, signal?: AbortSignal) {
    return apiRequest<VerificationPackage>(`${prefix()}/packages/${encodeURIComponent(packageId)}`, { signal });
  },
};
