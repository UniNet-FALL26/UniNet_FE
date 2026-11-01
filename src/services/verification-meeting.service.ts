import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import { isMeetingId, validateMeeting, type MeetingResponse, type MeetingJoinResponse } from '@/types/verification-meeting';

async function request<T extends MeetingResponse | MeetingJoinResponse>(assignmentId: string, verificationId: string, action: 'get' | 'create' | 'join', signal?: AbortSignal) {
  if (!isMeetingId(assignmentId) || !isMeetingId(verificationId)) throw new Error('Mã hồ sơ hoặc phân công không hợp lệ.');
  const path = `${API_URL.endsWith('/api') ? '' : '/api'}/assignments/${encodeURIComponent(assignmentId)}/meeting${action === 'join' ? '/join' : ''}`;
  return validateMeeting(await apiRequest<T>(path, { method: action === 'get' ? 'GET' : 'POST', signal }), assignmentId, verificationId, action === 'join');
}
export const verificationMeetingService = {
  get: (a: string, v: string, signal?: AbortSignal) => request<MeetingResponse>(a, v, 'get', signal),
  create: (a: string, v: string, signal?: AbortSignal) => request<MeetingResponse>(a, v, 'create', signal),
  join: (a: string, v: string, signal?: AbortSignal) => request<MeetingJoinResponse>(a, v, 'join', signal),
};
