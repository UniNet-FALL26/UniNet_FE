import { apiRequest, ApiError, refreshSession } from '@/services/api';
import type { AuthAccount, LoginRequest, LoginResponse, RegisterPartnerRequest, RegisterStudentRequest } from '@/types/auth';
import { tokenStorage } from '@/utils/storage';

export const authService = {
  login: (request: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(request) }),
  registerStudent: (request: RegisterStudentRequest) => apiRequest<LoginResponse>('/auth/register/student', { method: 'POST', body: JSON.stringify(request) }),
  registerPartner: (request: RegisterPartnerRequest) => apiRequest<LoginResponse>('/auth/register/partner', { method: 'POST', body: JSON.stringify(request) }),
  getCurrentUser: () => apiRequest<AuthAccount>('/auth/me'),
  refreshToken: () => refreshSession(),
  loginWithGoogle: () => { throw new ApiError('Đăng nhập Google chưa được cấu hình.'); },
  logout: async () => { await tokenStorage.clear(); },
  logoutAll: async () => {
    const session = tokenStorage.getSession();
    await apiRequest<void>('/auth/logout-all', { method: 'POST' });
    const current = tokenStorage.getSession();
    if (current && current.generation === session?.generation) await tokenStorage.clear(current);
  },
};
