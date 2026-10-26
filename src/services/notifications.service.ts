import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { NotificationFilter } from '@/types/notifications';
import { parseNotificationPage, safeNotificationTarget } from '@/utils/notifications';

const prefix = () => API_URL.endsWith('/api') ? '/notifications' : '/api/notifications';
export const notificationsService = {
  async list(filter: NotificationFilter = {}, page = 1, pageSize = 20, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), unreadOnly: String(!!filter.unreadOnly) });
    if (filter.category) query.set('category', filter.category);
    return parseNotificationPage(await apiRequest<unknown>(`${prefix()}?${query}`, { signal }));
  },
  async unread(signal?: AbortSignal) {
    const result = await apiRequest<{ count: number }>(`${prefix()}/unread-count`, { signal });
    if (!result || !Number.isInteger(result.count) || result.count < 0) throw new Error('Không tải được số thông báo chưa đọc.');
    return result.count;
  },
  read: (id: string, signal?: AbortSignal) => apiRequest<void>(`${prefix()}/${encodeURIComponent(id)}/read`, { method: 'PATCH', signal }),
  readAll: (signal?: AbortSignal) => apiRequest<void>(`${prefix()}/read-all`, { method: 'PATCH', signal }),
  async target(id: string, signal?: AbortSignal) {
    const result = await apiRequest<{ targetUrl: string | null }>(`${prefix()}/${encodeURIComponent(id)}/target`, { signal });
    return safeNotificationTarget(result?.targetUrl);
  },
};
