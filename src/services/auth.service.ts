import { apiRequest, ApiError, refreshSession } from '@/services/api';
import type { AuthAccount, LoginRequest, LoginResponse, RegisterPartnerRequest, RegisterStudentRequest } from '@/types/auth';
import { tokenStorage } from '@/utils/storage';
import { chatDeviceId } from '@/messaging/device';
import { messagingService } from './messaging.service';

export const authService = {
  login: async (request: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ ...request, deviceId: await chatDeviceId() }) }),
  registerStudent: (request: RegisterStudentRequest) => apiRequest<LoginResponse>('/auth/register/student', { method: 'POST', body: JSON.stringify(request) }),
  registerPartner: (request: RegisterPartnerRequest) => apiRequest<LoginResponse>('/auth/register/partner', { method: 'POST', body: JSON.stringify(request) }),
  getCurrentUser: () => apiRequest<AuthAccount>('/auth/me'),
  refreshToken: () => refreshSession(),
  loginWithGoogle: () => { throw new ApiError('Đăng nhập Google chưa được cấu hình.'); },
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
