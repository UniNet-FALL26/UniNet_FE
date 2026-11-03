import { apiRequest } from '@/services/api';
export interface AssessorAssignment { id: string; projectVerificationId: string; assignedToUserId: string; status: number; assignedAt: string; assignmentDueAt: string | null; reportDueAt: string | null; scheduledStartAt: string | null; scheduledEndAt: string | null; meetingStartAt: string | null; meetingEndAt: string | null; completedAt: string | null; replacementReason: string | null }
export interface AssessorProject { imageUrl?: string | null; id: string; title: string; projectField: string; description: string; status: number; leaderId: string }
export interface AssessmentRubric { code: string; version: string; passingScore: number; criteria: { code: string; name: string; weight: number }[]; conditions: { code: string; description: string }[] }
export interface AssessmentInput { rubricVersion: string; scores: { code: string; score: number | null; reason: string; evidence: string | null }[]; conditions: { code: string; passed: boolean | null; reason: string }[] }
export interface AssessmentResult extends Omit<AssessmentInput, 'rubricVersion'> { rubric: AssessmentRubric; totalScore: number | null; outcome: number }
export interface AssessorReport { outcome?: number; assessment?: AssessmentResult | null; id: string; summary: string; findings: string | null; recommendations: string | null; submittedAt: string }
export interface AssignmentDetail { assignment: AssessorAssignment; project: AssessorProject; evidenceModeration: { status: number; verdict?: string; reason?: string; summary?: string; source?: { tasks: { projectTaskId: string; reports: { taskReportId: string; content: string; evidence: { taskEvidenceId: string; fileUrl: string; fileName: string | null }[] }[] }[] } } | null; report: AssessorReport | null; assessmentRubric: AssessmentRubric | null }
export interface AssignmentPage { page: number; pageSize: number; totalItems: number; totalPages: number; assignments: AssessorAssignment[] }
export interface AssessorMeeting { assignmentId: string; scheduledStartAt: string | null; scheduledEndAt: string | null; meetingStartAt: string | null; meetingEndAt: string | null; joinUrl: string | null }
export interface AvailabilitySlot { id: string; startAt: string; endAt: string }
export const assessorService = {
  list: (page: number, status: number | undefined, signal?: AbortSignal) => apiRequest<AssignmentPage>(`/assignments/me?page=${page}&pageSize=10${status === undefined ? '' : `&status=${status}`}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<AssignmentDetail>(`/assignments/${encodeURIComponent(id)}`, { signal }),
  meeting: (id: string, signal?: AbortSignal) => apiRequest<AssessorMeeting>(`/assignments/${encodeURIComponent(id)}/meeting`, { signal, feedback: false }),
  createMeeting: (id: string) => apiRequest<AssessorMeeting>(`/assignments/${encodeURIComponent(id)}/meeting`, { method: 'POST', feedback: false }),
  getReport: (id: string) => apiRequest<AssessorReport>(`/report/${encodeURIComponent(id)}`, { feedback: false }),
  meetingAction: (id: string, action: 'start' | 'end') => apiRequest<AssessorMeeting>(`/verificator/assignments/${encodeURIComponent(id)}/meeting/${action}`, { method: 'POST', feedback: false }),
  joinMeeting: (id: string) => apiRequest<{ joinUrl: string }>(`/assignments/${encodeURIComponent(id)}/meeting/join`, { method: 'POST', feedback: false }),
  report: (id: string, fields: { summary: string; findings: string; recommendations: string; assessment: AssessmentInput }) => apiRequest<AssessorReport>('/reports', { method: 'POST', body: JSON.stringify({ assignmentId: id, ...fields }), feedback: false }),
  availability: (from: string, to: string, signal?: AbortSignal) => apiRequest<AvailabilitySlot[]>(`/verificators/me/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal }),
  saveAvailability: (startAt: string, endAt: string) => apiRequest<AvailabilitySlot>('/verificators/me/availability', { method: 'POST', body: JSON.stringify({ startAt, endAt }), feedback: false }),
  updateAvailability: (id: string, startAt: string, endAt: string) => apiRequest<AvailabilitySlot>(`/verificators/me/availability/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ startAt, endAt }), feedback: false }),
  deleteAvailability: (id: string) => apiRequest<void>(`/verificators/me/availability/${encodeURIComponent(id)}`, { method: 'DELETE', feedback: false }),
};
