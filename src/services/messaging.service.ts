import { Platform } from 'react-native';
import { API_URL } from '@/constants/config';
import { apiRequest, ApiError, refreshSession } from './api';
import { tokenStorage } from '@/utils/storage';
import type { ChatAttachment, ChatConversation, ChatFileInput, ChatGroupInput, ChatMessage, ChatPage, ChatPerson, DirectChat } from '@/types/messaging';

const root = '/messaging';
const id = encodeURIComponent;
const json = (method: string, body?: unknown) => ({ method, feedback: false as const, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const read = <T>(path: string, signal?: AbortSignal) => apiRequest<T>(root + path, { signal, feedback: false });

export const messagingService = {
  list: (filter = 'all', q = '', page = 1, signal?: AbortSignal) => read<ChatPage<ChatConversation>>(`/conversations?${new URLSearchParams({ filter, q, page: String(page) })}`, signal),
  get: (conversationId: string, signal?: AbortSignal) => read<ChatConversation>(`/conversations/${id(conversationId)}`, signal),
  unread: (signal?: AbortSignal) => read<{ count: number }>('/unread-count', signal),
  people: (q: string, signal?: AbortSignal) => read<ChatPerson[]>(`/people?q=${id(q)}`, signal),
  direct: (profileId: string, signal?: AbortSignal) => read<DirectChat>(`/direct/${id(profileId)}`, signal),
  history: (conversationId: string, before?: number | null, signal?: AbortSignal) => read<ChatPage<ChatMessage>>(`/conversations/${id(conversationId)}/messages?limit=50${before ? `&before=${before}` : ''}`, signal),
  async send(target: { conversationId: string } | { profileId: string }, input: { clientMessageId: string; content: string; replyToMessageId?: string; deviceId: string; files: ChatFileInput[] }) {
    const form = new FormData(); form.append('ClientMessageId', input.clientMessageId); form.append('Content', input.content); form.append('DeviceId', input.deviceId);
    if (input.replyToMessageId) form.append('ReplyToMessageId', input.replyToMessageId);
    for (const file of input.files) {
      if (Platform.OS === 'web') form.append('Files', file.file ?? await (await fetch(file.uri)).blob(), file.name);
      else form.append('Files', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
    }
    const path = 'conversationId' in target ? `/conversations/${id(target.conversationId)}/messages` : `/direct/${id(target.profileId)}/messages`;
    return apiRequest<ChatMessage>(root + path, { method: 'POST', body: form, feedback: false });
  },
  edit: (messageId: string, content: string) => apiRequest<ChatMessage>(`${root}/messages/${id(messageId)}`, json('PUT', { content })),
  recall: (messageId: string) => apiRequest<void>(`${root}/messages/${id(messageId)}`, json('DELETE')),
  react: (messageId: string, reactionType: string | null) => apiRequest<void>(`${root}/messages/${id(messageId)}/reaction`, json('PUT', { reactionType })),
  read: (conversationId: string, messageId: string, deviceId: string) => apiRequest<void>(`${root}/conversations/${id(conversationId)}/read`, json('PUT', { messageId, deviceId })),
  createGroup: (input: ChatGroupInput) => apiRequest<ChatConversation>(`${root}/groups`, json('POST', input)),
  updateGroup: (conversationId: string, name: string, avatarUrl: string | null) => apiRequest<ChatConversation>(`${root}/conversations/${id(conversationId)}/group`, json('PUT', { name, avatarUrl })),
  addMembers: (conversationId: string, accountIds: string[], profileIds?: string[]) => apiRequest<void>(`${root}/conversations/${id(conversationId)}/members`, json('POST', { accountIds, profileIds })),
  removeMember: (conversationId: string, accountId: string) => apiRequest<void>(`${root}/conversations/${id(conversationId)}/members/${id(accountId)}`, json('DELETE')),
  role: (conversationId: string, accountId: string, role: number) => apiRequest<void>(`${root}/conversations/${id(conversationId)}/members/${id(accountId)}/role`, json('PUT', { role })),
  settings: (conversationId: string, isPinned: boolean, mutedUntil: string | null) => apiRequest<void>(`${root}/conversations/${id(conversationId)}/settings`, json('PUT', { isPinned, mutedUntil })),
  linkProject: (conversationId: string, projectId: string | null) => apiRequest(`${root}/conversations/${id(conversationId)}/project`, json('PUT', { projectId })),
  projectChat: (projectId: string, signal?: AbortSignal) => read<{ conversationId: string | null; canAccess: boolean }>(`/projects/${id(projectId)}/chat`, signal),
  files: (conversationId: string, page = 1, signal?: AbortSignal) => read<ChatAttachment[]>(`/conversations/${id(conversationId)}/files?page=${page}`, signal),
  block: (accountId: string, blocked: boolean) => apiRequest<void>(`${root}/blocks/${id(accountId)}`, json(blocked ? 'PUT' : 'DELETE')),
  pushConfig: () => read<{ enabled: boolean }>('/push/config'),
  registerDevice: (input: { deviceId: string; token: string; platform: string; showPreview: boolean }) => apiRequest<void>(`${root}/devices`, json('PUT', input)),
  unregisterDevice: (deviceId: string) => apiRequest<void>(`${root}/devices/${id(deviceId)}`, json('DELETE')),
  acknowledge: (deviceId: string, messageId: string) => apiRequest<void>(`${root}/devices/${id(deviceId)}/ack`, json('POST', { messageId })),
  async attachmentBlob(file: ChatAttachment, signal?: AbortSignal) {
    if (!/^\/messaging\/attachments\/[a-f0-9-]+\/content$/.test(file.fileUrl)) throw new Error('Đường dẫn file không hợp lệ.');
    const original = tokenStorage.getSession(); if (!original) throw new ApiError('Vui lòng đăng nhập.', 401);
    if (original.expiresAt && Date.parse(original.expiresAt) <= Date.now() + 30_000) await refreshSession(original);
    if (tokenStorage.getSession()?.generation !== original.generation) throw new ApiError('Phiên đăng nhập đã thay đổi.', 401);
    const response = await fetch(API_URL + file.fileUrl, { headers: { Authorization: `Bearer ${tokenStorage.getSession()!.accessToken}` }, signal });
    if (!response.ok) throw new ApiError(response.status === 403 ? 'Bạn không còn quyền xem file này.' : 'Không tải được file trò chuyện.', response.status);
    return response.blob();
  },
};
