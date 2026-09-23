import { API_URL } from '@/constants/config';
import { tokenStorage } from '@/utils/storage';

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError('Dịch vụ chưa được cấu hình. Vui lòng thử lại sau.');
  const token = await tokenStorage.get();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new ApiError('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');
  }
  if (!response.ok) throw new ApiError(response.status === 401 ? 'Email hoặc mật khẩu không chính xác.' : 'Có lỗi xảy ra. Vui lòng thử lại.', response.status);
  return response.json() as Promise<T>;
}
