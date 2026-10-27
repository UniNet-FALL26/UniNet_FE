export type AccountNotification = {
  id: string;
  recipientUserId: string;
  senderUserId?: string | null;
  type: string;
  category: string;
  title: string;
  message: string;
  audience: string;
  requiredPermission?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetUrl?: string | null;
  readAt: string | null;
  eventKey?: string | null;
  broadcastId?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

export type NotificationPage = { items: AccountNotification[]; page: number; pageSize: number; total: number; unreadCount: number };
export type NotificationFilter = { unreadOnly?: boolean; category?: string };
