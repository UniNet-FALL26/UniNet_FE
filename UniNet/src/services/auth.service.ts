import { apiRequest, ApiError } from '@/services/api';
import type { AuthAccount, LoginRequest, LoginResponse, RegisterPartnerRequest, RegisterStudentRequest } from '@/types/auth';

// Endpoint paths are provisional until the backend contract is provided.
export const authService = {
  login: (request: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(request) }),
  registerStudent: (request: RegisterStudentRequest) => apiRequest<LoginResponse>('/auth/register/student', { method: 'POST', body: JSON.stringify(request) }),
  registerPartner: (request: RegisterPartnerRequest) => apiRequest<LoginResponse>('/auth/register/partner', { method: 'POST', body: JSON.stringify(request) }),
  getCurrentUser: () => apiRequest<AuthAccount>('/auth/me'),
  refreshToken: () => { throw new ApiError('Làm mới phiên cần hợp đồng API.'); },
  loginWithGoogle: () => { throw new ApiError('Đăng nhập Google chưa được cấu hình.'); },
  logout: async () => {},
};
