import type { AccountNotification, NotificationPage } from '@/types/notifications';

const guid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const businessPath = new RegExp(`^/(?:settings|\\(company\\)/profile|(?:\\(company\\)/)?(?:verification|jobs|applicants)|\\(tabs\\)/opportunities|opportunities|group/(?:${guid}|(?:verification|verification-result|verification-dossier)/${guid})|workspace/${guid})$`);

export function safeNotificationTarget(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u0020#]/.test(value) || /%[0-9a-f]{2}/i.test(value)) return null;
  const [path, query] = value.split('?');
  if (!businessPath.test(path) || value.split('?').length > 2) return null;
  if (query && !query.split('&').every(pair => /^(?:account|jobId|applicationId|view|tab|taskId|invitationId|id)=[a-zA-Z0-9_-]+$/.test(pair))) return null;
  return value;
}

export function parseNotificationPage(value: unknown): NotificationPage {
  const invalid = () => new Error('Phản hồi thông báo không hợp lệ. Vui lòng thử lại.');
  if (!value || typeof value !== 'object') throw invalid();
  const row = value as NotificationPage;
  if (!Array.isArray(row.items) || ![row.page, row.pageSize, row.total, row.unreadCount].every(Number.isInteger) || row.page < 1 || row.pageSize < 1 || row.total < 0 || row.unreadCount < 0) throw invalid();
  for (const item of row.items) {
    if (!item || typeof item !== 'object' || !['id', 'recipientUserId', 'type', 'category', 'title', 'message', 'audience', 'createdAt'].every(key => typeof item[key as keyof AccountNotification] === 'string') || !item.id || !item.recipientUserId || !Number.isFinite(Date.parse(item.createdAt)) || (item.readAt !== null && (typeof item.readAt !== 'string' || !Number.isFinite(Date.parse(item.readAt))))) throw invalid();
  }
  return row;
}

export function mergeNotifications<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  return [...new Map([...current, ...incoming].map(row => [row.id, row])).values()];
}

export const notificationCategories = [
  { value: '', label: 'Tất cả' }, { value: 'community', label: 'Cộng đồng' }, { value: 'verification', label: 'Xác minh' }, { value: 'recruitment', label: 'Tuyển dụng' }, { value: 'project', label: 'Dự án' }, { value: 'system', label: 'Hệ thống' },
] as const;

export function groupNotifications<T extends { createdAt: string }>(items: readonly T[], now = new Date()) {
  const today = new Date(now.getTime()); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime()); yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today.getTime()); week.setDate(week.getDate() - (week.getDay() + 6) % 7);
  const groups: { label: string; items: T[] }[] = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Trước đó'].map(label => ({ label, items: [] }));
  for (const item of items) {
    const time = Date.parse(item.createdAt);
    const index = time >= today.getTime() ? 0 : time >= yesterday.getTime() ? 1 : time >= week.getTime() ? 2 : 3;
    groups[index].items.push(item);
  }
  return groups.filter(group => group.items.length > 0);
}

export function notificationRelativeTime(value: string, now = new Date()) {
  const date = new Date(value), timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return 'Không rõ thời gian';
  const seconds = Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
