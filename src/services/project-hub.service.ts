import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { HubPage, HubPerson, HubProject, HubProjectInput, HubRecruitment, HubRequest } from '@/types/project-hub';

const root = () => `${API_URL.endsWith('/api') ? '' : '/api'}/project-hub`;
const id = (value: string) => encodeURIComponent(value);
const json = (method: string, body?: unknown) => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const projectHubService = {
  mine: (page = 1, q = '', signal?: AbortSignal) => apiRequest<HubPage>(`${root()}/mine?${new URLSearchParams({ page: String(page), pageSize: '12', q })}`, { signal, feedback: false }),
  discover: (page = 1, q = '', signal?: AbortSignal) => apiRequest<HubPage>(`${root()}/discover?${new URLSearchParams({ page: String(page), pageSize: '12', q })}`, { signal, feedback: false }),
  get: (projectId: string, signal?: AbortSignal) => apiRequest<HubProject>(`${root()}/${id(projectId)}`, { signal, feedback: false }),
  create: (value: HubProjectInput) => apiRequest<HubProject>(root(), json('POST', value)),
  update: (projectId: string, value: Partial<HubProjectInput>) => apiRequest<HubProject>(`${root()}/${id(projectId)}`, json('PATCH', value)),
  remove: (projectId: string) => apiRequest<void>(`${root()}/${id(projectId)}`, json('DELETE')),
  complete: (projectId: string) => apiRequest<HubProject>(`${root()}/${id(projectId)}/complete`, json('POST')),
  saveRecruitment: (projectId: string, value: Pick<HubRecruitment, 'description' | 'positions' | 'deadline' | 'status'>) => apiRequest<HubProject>(`${root()}/${id(projectId)}/recruitment`, json('PUT', value)),
  requests: (projectId: string, signal?: AbortSignal) => apiRequest<{ items: HubRequest[] }>(`${root()}/${id(projectId)}/requests`, { signal, feedback: false }),
  mineRequests: (projectId: string, signal?: AbortSignal) => apiRequest<{ items: HubRequest[] }>(`${root()}/requests/mine?${new URLSearchParams({ projectId })}`, { signal, feedback: false }),
  sendRequest: (projectId: string, value: { requestType: 0 | 1; invitedUserId?: string; positionId?: string; role?: string; message?: string }) => apiRequest<HubRequest>(`${root()}/${id(projectId)}/requests`, json('POST', value)),
  decide: (requestId: string, decision: 'accept' | 'reject' | 'cancel') => apiRequest<HubRequest>(`${root()}/requests/${id(requestId)}/decision`, json('POST', { decision })),
  updateMember: (projectId: string, userId: string, value: { role?: string; positionId?: string; status?: number }) => apiRequest<HubProject>(`${root()}/${id(projectId)}/members/${id(userId)}`, json('PATCH', value)),
  saveReview: (projectId: string, value: { challenges?: string; lessonsLearned?: string }) => apiRequest<HubProject>(`${root()}/${id(projectId)}/review`, json('PUT', value)),
  people: (q: string, signal?: AbortSignal) => apiRequest<{ items: HubPerson[] }>(`${root()}/people?${new URLSearchParams({ q })}`, { signal, feedback: false }),
};
