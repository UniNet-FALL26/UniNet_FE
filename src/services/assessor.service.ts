import { apiRequest } from '@/services/api';
export interface AssessorAssignment { id: string; projectVerificationId: string; assignedToUserId: string; status: number; assignedAt: string; assignmentDueAt: string | null; reportDueAt: string | null; scheduledStartAt: string | null; scheduledEndAt: string | null; meetingStartAt: string | null; meetingEndAt: string | null; completedAt: string | null; replacementReason: string | null }
export interface AssessorProject { id: string; title: string; projectField: string; description: string; status: number; leaderId: string }
export interface AssessorReport { id: string; summary: string; findings: string | null; recommendations: string | null; submittedAt: string }
export interface AssignmentDetail { assignment: AssessorAssignment; project: AssessorProject; evidenceModeration: { status: number; verdict?: string; reason?: string; summary?: string } | null; report: AssessorReport | null }
export interface AssignmentPage { page: number; pageSize: number; totalItems: number; totalPages: number; assignments: AssessorAssignment[] }
export interface AssessorMeeting { assignmentId: string; scheduledStartAt: string | null; scheduledEndAt: string | null; meetingStartAt: string | null; meetingEndAt: string | null; joinUrl: string | null }
export interface AvailabilitySlot { id: string; startAt: string; endAt: string }
export const assessorService = {
  list: (page: number, status: number | undefined, signal?: AbortSignal) => apiRequest<AssignmentPage>(`/assignments/me?page=${page}&pageSize=10${status === undefined ? '' : `&status=${status}`}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<AssignmentDetail>(`/assignments/${encodeURIComponent(id)}`, { signal }),
  meeting: (id: string, signal?: AbortSignal) => apiRequest<AssessorMeeting>(`/assignments/${encodeURIComponent(id)}/meeting`, { signal, feedback: false }),
  meetingAction: (id: string, action: 'start' | 'end') => apiRequest<AssessorMeeting>(`/verificator/assignments/${encodeURIComponent(id)}/meeting/${action}`, { method: 'POST', feedback: false }),
  joinMeeting: (id: string) => apiRequest<{ joinUrl: string }>(`/assignments/${encodeURIComponent(id)}/meeting/join`, { method: 'POST', feedback: false }),
  report: (id: string, fields: { summary: string; findings: string; recommendations: string; outcome: number }) => apiRequest<AssessorReport>('/reports', { method: 'POST', body: JSON.stringify({ assignmentId: id, ...fields }), feedback: false }),
  availability: (from: string, to: string, signal?: AbortSignal) => apiRequest<AvailabilitySlot[]>(`/verificators/me/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal }),
  saveAvailability: (startAt: string, endAt: string) => apiRequest<AvailabilitySlot>('/verificators/me/availability', { method: 'POST', body: JSON.stringify({ startAt, endAt }), feedback: false }),
  deleteAvailability: (id: string) => apiRequest<void>(`/verificators/me/availability/${encodeURIComponent(id)}`, { method: 'DELETE', feedback: false }),
};
