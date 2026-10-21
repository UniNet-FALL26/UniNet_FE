import { API_URL } from '@/constants/config';
import type {
  SubmitTaskReportRequest,
  TaskReport,
  TaskReportListResponse,
} from '@/types/task-report';

function apiBase(): string {
  const base = (API_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL.');
  return base;
}

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra mạng và API URL.');
  }

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') message = body.message;
      else if (typeof body?.title === 'string') message = body.title;
    } catch { /* response may be empty/non-JSON */ }
    if (response.status === 401) message = 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const root = (projectId: string, taskId: string) =>
  `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/reports`;

export type ReviewTaskReportRequest = {
  /** 0 = approve, 1 = request revision (matches the backend contract). */
  decision: 0 | 1;
  feedback?: string | null;
};

export const taskReportService = {
  list(projectId: string, taskId: string, accessToken: string, page = 1, pageSize = 20) {
    return request<TaskReportListResponse>(`${root(projectId, taskId)}?page=${page}&pageSize=${pageSize}`, accessToken);
  },
  createDraft(projectId: string, taskId: string, accessToken: string, body: SubmitTaskReportRequest) {
    return request<TaskReport>(`${root(projectId, taskId)}/drafts`, accessToken, { method: 'POST', body: JSON.stringify(body) });
  },
  updateDraft(projectId: string, taskId: string, reportId: string, accessToken: string, body: SubmitTaskReportRequest) {
    return request<TaskReport>(`${root(projectId, taskId)}/${encodeURIComponent(reportId)}/draft`, accessToken, { method: 'PUT', body: JSON.stringify(body) });
  },
  /** Submit a new revision version of a report that was asked to be revised. */
  revise(projectId: string, taskId: string, reportId: string, accessToken: string, body: SubmitTaskReportRequest) {
    return request<TaskReport>(`${root(projectId, taskId)}/${encodeURIComponent(reportId)}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  submitDraft(projectId: string, taskId: string, reportId: string, accessToken: string) {
    return request<TaskReport>(`${root(projectId, taskId)}/${encodeURIComponent(reportId)}/submit`, accessToken, { method: 'POST' });
  },
  review(projectId: string, taskId: string, reportId: string, accessToken: string, body: ReviewTaskReportRequest) {
    return request<TaskReport>(`${root(projectId, taskId)}/${encodeURIComponent(reportId)}/reviews`, accessToken, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  deleteDraft(projectId: string, taskId: string, reportId: string, accessToken: string) {
    return request<void>(`${root(projectId, taskId)}/${encodeURIComponent(reportId)}`, accessToken, { method: 'DELETE' });
  },
};
