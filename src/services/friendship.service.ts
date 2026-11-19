import { API_URL } from '@/constants/config';
import { apiRequest } from './api';
import type { FriendList, FriendPage, FriendPerson } from '@/types/friendship';

const root = () => `${API_URL.endsWith('/api') ? '' : '/api'}/friendships`;
const id = (value: string) => encodeURIComponent(value);
export const friendshipService = {
  list(kind: FriendList, q = '', page = 1, signal?: AbortSignal, projectId?: string) {
    const query = new URLSearchParams({ q, page: String(page), pageSize: '20' });
    if (projectId) query.set('projectId', projectId);
    const path = kind === 'friends' ? '' : kind === 'people' ? '/people' : `/requests/${kind}`;
    return apiRequest<FriendPage>(`${root()}${path}?${query}`, { signal, feedback: false });
  },
  relationship: (profileId: string, signal?: AbortSignal) => apiRequest<FriendPerson>(`${root()}/relationship/${id(profileId)}`, { signal, feedback: false }),
  send: (receiverAccountId: string) => apiRequest<FriendPerson>(`${root()}/requests`, { method: 'POST', body: JSON.stringify({ receiverAccountId }), feedback: false }),
  decide(person: FriendPerson, action: 'accept' | 'reject' | 'cancel' | 'remove') {
    if (!person.friendshipId || !person.friendshipVersion) throw new Error('Quan hệ chưa được tải đầy đủ. Vui lòng tải lại.');
    return apiRequest<FriendPerson>(`${root()}/${id(person.friendshipId)}${action === 'remove' ? '' : '/' + action}`, {
      method: action === 'remove' ? 'DELETE' : 'POST', body: JSON.stringify({ version: person.friendshipVersion }), feedback: false,
    });
  },
};
