import { API_URL } from "@/constants/config";
import { localizeProjectError } from "@/services/project-errors";
import type { LoginResponse } from "@/types/auth";
import { tokenStorage, type AuthSession } from "@/utils/storage";
import { apiErrorMessage, apiFeedbackPolicy, apiSuccessMessage, readableApiMessage } from '@/utils/api-feedback';
import { toast } from '@/store/toast.store';
export type ApiRequestOptions = RequestInit & { feedback?: false | { success?: string | false; error?: boolean } };
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
  }
}
export function reportApiFailure(cause: unknown, fallback: string) {
  // API failures already emitted their specific toast; handle only local operation failures here.
  if (!(cause instanceof ApiError)) toast.error(readableApiMessage(cause instanceof Error ? cause.message : null) || fallback);
}
const expired = () =>
  new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
const changed = () =>
  new ApiError("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.", 401);
let pendingRefresh: {
  session: AuthSession;
  promise: Promise<LoginResponse>;
} | null = null;

async function fetchResponse(
  path: string,
  options: RequestInit,
): Promise<Response> {
  if (!API_URL)
    throw new ApiError("Dịch vụ chưa được cấu hình. Vui lòng thử lại sau.");
  try {
    return await fetch(`${API_URL}${path}`, options);
  } catch (cause) {
    if (options.signal?.aborted) throw cause;
    throw new ApiError("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
  }
}
async function responseError(response: Response, path: string, method = "GET") {
  const body: unknown = await response.json().catch(() => null);
  const message = apiErrorMessage(path, response.status, body);
  const code =
    body &&
    typeof body === "object" &&
    "code" in body &&
    typeof body.code === "string"
      ? body.code
      : undefined;
  const originalMessage = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : message;
  const projectMessage = /^\/(?:api\/)?(?:moderator\/)?projects(?:\/|$)/.test(path)
    ? localizeProjectError(path, method.toUpperCase(), response.status, code, originalMessage)
    : null;
  return new ApiError(
    readableApiMessage(projectMessage) || message,
    response.status,
    code,
  );
}

export async function refreshSession(
  expected?: AuthSession,
): Promise<LoginResponse> {
  const session = tokenStorage.getSession();
  if (expected && session !== expected) {
    // Another request can finish rotation between the caller's read and this read.
    if (
      session?.generation === expected.generation &&
      session.refreshToken &&
      session.account
    )
      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        account: session.account,
        requiresProfileCompletion: !session.account.profileComplete,
      };
    throw changed();
  }
  if (!session?.refreshToken) {
    if (session) await tokenStorage.clear(session);
    throw expired();
  }
  if (pendingRefresh?.session === session) return pendingRefresh.promise;
  const promise = (async () => {
    const response = await fetchResponse("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      if ([400, 401, 403].includes(response.status)) {
        await tokenStorage.clear(session);
        throw expired();
      }
      throw await responseError(response, "/auth/refresh");
    }
    const result: LoginResponse | null = await response
      .json()
      .catch(() => null);
    if (
      !result ||
      typeof result.accessToken !== "string" ||
      !result.accessToken ||
      typeof result.refreshToken !== "string" ||
      !result.refreshToken ||
      !result.account ||
      typeof result.account.id !== "string"
    )
      throw new ApiError(
        "Phản hồi làm mới phiên không hợp lệ. Vui lòng thử lại.",
        502,
      );
    if (session.account && result.account.id !== session.account.id) {
      await tokenStorage.clear(session);
      throw expired();
    }
    if (!(await tokenStorage.replaceSession(session, result))) throw changed();
    return result;
  })();
  const entry = { session, promise };
  pendingRefresh = entry;
  try {
    return await promise;
  } finally {
    if (pendingRefresh === entry) pendingRefresh = null;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const original = tokenStorage.getSession();
  const headers = new Headers(options.headers);
  if (
    !headers.has("Content-Type") &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData)
  )
    headers.set("Content-Type", "application/json");
  if (original?.accessToken && !headers.has("Authorization"))
    headers.set("Authorization", `Bearer ${original.accessToken}`);
  let response = await fetchResponse(path, { ...options, headers });
  const assertCurrentSession = () => {
    if (
      original &&
      tokenStorage.getSession()?.generation !== original.generation
    )
      throw changed();
  };
  assertCurrentSession();
  // Never refresh failed authentication, public requests or a caller-supplied unrelated bearer.
  const authPath = /^\/auth\/(?:login|register|google|refresh)(?:\/|$)/.test(
    path.split("?")[0],
  );
  if (
    response.status === 401 &&
    !authPath &&
    original &&
    headers.get("Authorization") === `Bearer ${original.accessToken}`
  ) {
    let current = tokenStorage.getSession();
    if (!current || current.generation !== original.generation) throw changed();
    if (current.accessToken === original.accessToken) {
      await refreshSession(current);
      current = tokenStorage.getSession();
    }
    if (!current || current.generation !== original.generation) throw changed();
    headers.set("Authorization", `Bearer ${current.accessToken}`);
    response = await fetchResponse(path, { ...options, headers });
    if (response.status === 401) {
      await tokenStorage.clear(current);
      throw expired();
    }
  }
  assertCurrentSession();
  if (!response.ok) throw await responseError(response, path, options.method);
  if (response.status === 204) return undefined as T;
  const result = (await response.json()) as T;
  assertCurrentSession();
  return result;
}
// Thêm hàm apiMultipartRequest để dùng riêng cho các request upload file (FormData)
async function requestMultipart<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const original = tokenStorage.getSession();

  // Dùng plain object thay vì `new Headers()` để tránh bug của React Native
  // làm mất chuỗi 'boundary' khi upload FormData.
  const headers: Record<string, string> = {};
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Tuyệt đối không set Content-Type để trình duyệt/fetch tự động sinh ra Content-Type: multipart/form-data kèm boundary
  if (headers["content-type"]) {
    delete headers["content-type"];
  }

  if (original?.accessToken && !headers["authorization"]) {
    headers["authorization"] = `Bearer ${original.accessToken}`;
  }

  let response = await fetchResponse(path, { ...options, headers });

  const assertCurrentSession = () => {
    if (
      original &&
      tokenStorage.getSession()?.generation !== original.generation
    )
      throw changed();
  };
  assertCurrentSession();

  // Xử lý refresh token tương tự như apiRequest
  const authPath = /^\/auth\/(?:login|register|google|refresh)(?:\/|$)/.test(
    path.split("?")[0],
  );

  if (
    response.status === 401 &&
    !authPath &&
    original &&
    headers["authorization"] === `Bearer ${original.accessToken}`
  ) {
    let current = tokenStorage.getSession();
    if (!current || current.generation !== original.generation) throw changed();
    if (current.accessToken === original.accessToken) {
      await refreshSession(current);
      current = tokenStorage.getSession();
    }
    if (!current || current.generation !== original.generation) throw changed();

    headers["authorization"] = `Bearer ${current.accessToken}`;
    response = await fetchResponse(path, { ...options, headers });

    if (response.status === 401) {
      await tokenStorage.clear(current);
      throw expired();
    }
  }

  assertCurrentSession();
  if (!response.ok) throw await responseError(response, path, options.method);
  if (response.status === 204) return undefined as T;
  const result = (await response.json()) as T;
  assertCurrentSession();
  return result;
}

async function withFeedback<T>(path: string, options: ApiRequestOptions, request: (init: RequestInit) => Promise<T>): Promise<T> {
  const { feedback, ...init } = options;
  const method = (init.method || 'GET').toUpperCase();
  const policy = apiFeedbackPolicy(path, method);
  try {
    const result = await request(init);
    if (init.signal?.aborted) return result;
    if (result && typeof result === 'object' && ('success' in result && result.success === false || 'isSuccess' in result && result.isSuccess === false)) {
      const code = 'code' in result && typeof result.code === 'string' ? result.code : undefined;
      throw new ApiError(apiErrorMessage(path, 400, result), 400, code);
    }
    if (feedback !== false && feedback?.success !== false && (policy.success || typeof feedback?.success === 'string'))
      toast.success(typeof feedback?.success === 'string' ? feedback.success : apiSuccessMessage(path, method, result));
    return result;
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    const error = cause instanceof ApiError ? cause : new ApiError(apiErrorMessage(path, 502, null), 502);
    if (feedback !== false && feedback?.error !== false && policy.error) toast.error(error.message);
    throw error;
  }
}
export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return withFeedback(path, options, init => requestJson<T>(path, init));
}
export function apiMultipartRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return withFeedback(path, options, init => requestMultipart<T>(path, init));
}
