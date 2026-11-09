import { API_URL } from '@/constants/config';
import type { ActivationInspect, ContractInspect, ProfileInput, ProfileInspect, ProfileSubmitted } from '@/types/assessor-onboarding';

const messages: Record<string, string> = {
  INVITATION_UNAVAILABLE: 'Lời mời không còn hiệu lực. Vui lòng mở đúng lời mời hoặc liên hệ Admin.',
  CONTRACT_UNAVAILABLE: 'Hợp đồng không còn khả dụng. Mở email mới nhất và xác thực lại hoặc liên hệ Admin.',
  ACTIVATION_UNAVAILABLE: 'Liên kết kích hoạt không còn dùng được. Bạn có thể yêu cầu gửi lại hoặc liên hệ Admin.',
  OTP_INVALID: 'Mã OTP không đúng. Vui lòng kiểm tra lại.',
  OTP_UNAVAILABLE: 'Mã đã hết hạn hoặc không còn dùng được. Bạn có thể xin mã mới theo giới hạn.',
  CONTRACT_NOT_VIEWED: 'Vui lòng mở PDF hợp đồng trước khi xin mã ký.',
  SIGNATURE_INVALID: 'Kiểm tra tên ký, xác nhận đồng ý và tải lại thông tin hợp đồng.',
  ONBOARDING_CHANGED: 'Trạng thái hồ sơ đã thay đổi. Vui lòng kiểm tra email hoặc liên hệ Admin.',
  CONTRACTS_DISABLED: 'Dịch vụ hợp đồng chưa sẵn sàng. Vui lòng thử lại sau.',
};
export class OnboardingError extends Error {
  constructor(message: string, public status = 0, public code?: string, public fields: Record<string, string[]> = {}, public retryAfter = 60) { super(message); }
}
async function post<T>(path: string, body: object, binary = false): Promise<T> {
  if (!API_URL) throw new OnboardingError('Dịch vụ chưa được cấu hình.');
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    response = await fetch(`${API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '')}/api/assessor-onboarding/${path}`, {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch { throw new OnboardingError('Không thể xác nhận kết quả do mất kết nối hoặc hết thời gian chờ. Kiểm tra email hoặc liên hệ Admin trước khi gửi lại.'); }
  finally { clearTimeout(timeout); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const retry = response.headers.get('Retry-After');
    const seconds = retry ? (/^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : 60;
    const fields: Record<string, string[]> = {};
    if (data?.errors && typeof data.errors === 'object') {
      for (const [key, value] of Object.entries(data.errors)) {
        fields[key] = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
      }
    }
    throw new OnboardingError(messages[data?.code] || (response.status === 429 ? 'Đã đạt giới hạn yêu cầu. Vui lòng chờ; giới hạn theo giờ có thể lâu hơn thời gian đếm ngược.' : response.status >= 500 ? 'Dịch vụ gặp lỗi. Kết quả thao tác chưa xác định; kiểm tra email hoặc liên hệ Admin.' : response.status === 401 || response.status === 403 ? 'Không thể truy cập dịch vụ public. Vui lòng liên hệ Admin.' : 'Yêu cầu chưa hợp lệ. Vui lòng kiểm tra thông tin.'), response.status, data?.code, fields, Number.isFinite(seconds) ? Math.max(60, seconds) : 60);
  }
  if (response.status === 202 || response.status === 204) return undefined as T;
  if (binary) {
    if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new OnboardingError('Không tải được PDF hợp đồng.');
    return await response.blob() as T;
  }
  return response.json();
}
export const assessorOnboardingService = {
  inspectProfile: (token: string) => post<ProfileInspect>('profile/inspect', { token }),
  submitProfile: (token: string, fields: ProfileInput) => post<ProfileSubmitted>('profile', { token, ...fields }),
  requestReadOtp: (token: string) => post<void>('contract/read-otp', { token }),
  verifyReadOtp: (token: string, code: string) => post<{ token: string }>('contract/verify-read-otp', { token, code }),
  inspectContract: (token: string) => post<ContractInspect>('contract/inspect', { token }),
  getContractPdf: (token: string) => post<Blob>('contract/pdf', { token }, true),
  requestSignOtp: (token: string) => post<void>('contract/sign-otp', { token }),
  signContract: (token: string, code: string, signedName: string, contractSha256: string, accepted: boolean) => post<{ status: 'AwaitingApproval' }>('contract/sign', { token, code, signedName, contractSha256, accepted }),
  inspectActivation: (token: string) => post<ActivationInspect>('password/inspect', { token }),
  setPassword: (token: string, password: string, confirmPassword: string) => post<{ status: 'Activated' }>('password', { token, password, confirmPassword }),
  resendActivation: (token: string) => post<void>('password/resend', { token }),
};
