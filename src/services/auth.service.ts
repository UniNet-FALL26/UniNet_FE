import { apiRequest, ApiError, refreshSession } from '@/services/api';
import type { AuthAccount, LoginRequest, LoginResponse, RegisterPartnerRequest, RegisterStudentRequest } from '@/types/auth';
import { tokenStorage } from '@/utils/storage';
import { chatDeviceId } from '@/messaging/device';
import { messagingService } from './messaging.service';

export const authService = {
  login: async (request: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ ...request, deviceId: await chatDeviceId() }), feedback: { success: false } }),
  registerStudent: (request: RegisterStudentRequest) => apiRequest<LoginResponse>('/auth/register/student', { method: 'POST', body: JSON.stringify(request) }),
  registerPartner: (request: RegisterPartnerRequest) => apiRequest<LoginResponse>('/auth/register/partner', { method: 'POST', body: JSON.stringify(request) }),
  getCurrentUser: () => apiRequest<AuthAccount>('/auth/me'),
  refreshToken: () => refreshSession(),
  loginWithGoogle: async (idToken: string) => {
    if (typeof idToken !== 'string' || !idToken.trim() || idToken.length > 16384) throw new ApiError('Không xác nhận được tài khoản Google. Vui lòng đăng nhập lại.', 400, 'INVALID_GOOGLE_TOKEN');
    const response = await apiRequest<LoginResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken, role: 0, deviceId: await chatDeviceId() }), feedback: { success: false } });
    if (response.account.role !== 0) throw new ApiError('Đăng nhập Google chỉ dành cho sinh viên. Vui lòng dùng email và mật khẩu.', 403, 'GOOGLE_STUDENT_ONLY');
    return response;
  },
  logout: async () => {
    const session = tokenStorage.getSession();
    try { if (session) { await messagingService.unregisterDevice(await chatDeviceId()).catch(() => {}); const push = await import('@/messaging/push'); await push.revokePushToken().catch(() => {}); await apiRequest<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }), feedback: false }).catch(() => {}); } }
    finally { const current = tokenStorage.getSession(); if (current && current.generation === session?.generation) await tokenStorage.clear(current); }
  },
  logoutAll: async () => {
    const session = tokenStorage.getSession();
    await apiRequest<void>('/auth/logout-all', { method: 'POST' });
    const current = tokenStorage.getSession();
    if (current && current.generation === session?.generation) await tokenStorage.clear(current);
  },
};
