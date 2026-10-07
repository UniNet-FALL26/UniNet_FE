import { API_URL } from '@/constants/config';
import { tokenStorage, type AuthSession } from '@/utils/storage';
import type { LoginResponse } from '@/types/auth';

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}
const expired = () => new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
const changed = () => new ApiError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.', 401);
let pendingRefresh: { session: AuthSession; promise: Promise<LoginResponse> } | null = null;

async function fetchResponse(path: string, options: RequestInit): Promise<Response> {
  if (!API_URL) throw new ApiError('Dịch vụ chưa được cấu hình. Vui lòng thử lại sau.');
  try { return await fetch(`${API_URL}${path}`, options); }
  catch (cause) {
    if (options.signal?.aborted) throw cause;
    throw new ApiError('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');
  }
}
async function responseError(response: Response, path: string) {
  const body: unknown = await response.json().catch(() => null);
  const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : response.status === 401 ? path.split('?')[0] === '/auth/login' ? 'Email hoặc mật khẩu không chính xác.' : expired().message : 'Có lỗi xảy ra. Vui lòng thử lại.';
  return new ApiError(message, response.status);
}

export async function refreshSession(expected?: AuthSession): Promise<LoginResponse> {
  const session = tokenStorage.getSession();
  if (expected && session !== expected) {
    // Another request can finish rotation between the caller's read and this read.
    if (session?.generation === expected.generation && session.refreshToken && session.account)
      return { accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt, account: session.account, requiresProfileCompletion: !session.account.profileComplete };
    throw changed();
  }
  if (!session?.refreshToken) { if (session) await tokenStorage.clear(session); throw expired(); }
  if (pendingRefresh?.session === session) return pendingRefresh.promise;
  const promise = (async () => {
    const response = await fetchResponse('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: session.refreshToken }) });
    if (!response.ok) {
      if ([400, 401, 403].includes(response.status)) { await tokenStorage.clear(session); throw expired(); }
      throw await responseError(response, '/auth/refresh');
    }
    const result: LoginResponse | null = await response.json().catch(() => null);
    if (!result || typeof result.accessToken !== 'string' || !result.accessToken || typeof result.refreshToken !== 'string' || !result.refreshToken || !result.account || typeof result.account.id !== 'string')
      throw new ApiError('Phản hồi làm mới phiên không hợp lệ. Vui lòng thử lại.', 502);
    if (session.account && result.account.id !== session.account.id) { await tokenStorage.clear(session); throw expired(); }
    if (!await tokenStorage.replaceSession(session, result)) throw changed();
    return result;
  })();
  const entry = { session, promise }; pendingRefresh = entry;
  try { return await promise; }
  finally { if (pendingRefresh === entry) pendingRefresh = null; }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const original = tokenStorage.getSession();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (original?.accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${original.accessToken}`);
  let response = await fetchResponse(path, { ...options, headers });
  // Never refresh failed authentication, public requests or a caller-supplied unrelated bearer.
  const authPath = /^\/auth\/(?:login|register|google|refresh)(?:\/|$)/.test(path.split('?')[0]);
  if (response.status === 401 && !authPath && original && headers.get('Authorization') === `Bearer ${original.accessToken}`) {
    let current = tokenStorage.getSession();
    if (!current || current.generation !== original.generation) throw changed();
    if (current.accessToken === original.accessToken) { await refreshSession(current); current = tokenStorage.getSession(); }
    if (!current || current.generation !== original.generation) throw changed();
    headers.set('Authorization', `Bearer ${current.accessToken}`);
    response = await fetchResponse(path, { ...options, headers });
    if (response.status === 401) { await tokenStorage.clear(current); throw expired(); }
  }
  if (!response.ok) throw await responseError(response, path);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
