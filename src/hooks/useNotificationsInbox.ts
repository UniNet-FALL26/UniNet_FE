import { useCallback, useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { notificationsService } from '@/services/notifications.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { mergeNotifications, notificationCategories } from '@/utils/notifications';
import type { AccountNotification, NotificationFilter } from '@/types/notifications';

export function useNotificationsInbox(filter: NotificationFilter = {}, pageSize = 20) {
  const { account } = useAuthStore();
  const { revision, synchronize } = useNotificationUpdates();
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''), [actionError, setActionError] = useState('');
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = tokenStorage.getSession()?.generation;
  const current = useCallback(() => tokenStorage.getSession()?.generation === generation && tokenStorage.getSession()?.account?.id === account?.id, [account?.id, generation]);
  const load = useCallback(async (nextPage = 1) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    if (nextPage === 1) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const result = await notificationsService.list(filter, nextPage, pageSize, controller.signal);
      if (controller.signal.aborted || !current()) return;
      if (result.items.some(row => row.recipientUserId !== account?.id)) throw new Error('Dữ liệu thông báo không thuộc tài khoản hiện tại.');
      setItems(existing => nextPage === 1 ? result.items : mergeNotifications(existing, result.items));
      setTotal(result.total); setPage(nextPage);
    } catch (cause) { if (!controller.signal.aborted && current()) setError(cause instanceof Error ? cause.message : 'Không tải được thông báo.'); }
    finally { if (!controller.signal.aborted && current()) { setLoading(false); setLoadingMore(false); } }
  }, [account?.id, current, filter.unreadOnly, filter.category, pageSize]);
  useEffect(() => { void load(); return () => request.current?.abort(); }, [load, revision]);

  const open = async (notification: AccountNotification, afterNavigate?: () => void) => {
    if (busy) return;
    setBusy(true); setActionError('');
    try {
      await notificationsService.read(notification.id);
      if (!current()) return;
      synchronize();
      const target = await notificationsService.target(notification.id);
      if (!current()) return;
      if (!target) { setActionError('Thông báo này không có nội dung để mở hoặc nội dung không còn khả dụng.'); return; }
      afterNavigate?.(); router.push(target as Href);
    } catch (cause) {
      if (current()) setActionError(cause instanceof ApiError && [403, 404, 410].includes(cause.status ?? 0) ? 'Nội dung đã bị xóa hoặc bạn không còn quyền truy cập.' : cause instanceof Error ? cause.message : 'Chưa mở được thông báo. Vui lòng thử lại.');
    } finally { if (current()) setBusy(false); }
  };
  const readAll = async () => {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await notificationsService.readAll(); if (current()) synchronize(); }
    catch (cause) { if (current()) setActionError(cause instanceof Error ? cause.message : 'Chưa đánh dấu được thông báo.'); }
    finally { if (current()) setBusy(false); }
  };
  const markRead = async (notification: AccountNotification) => {
    if (busy || notification.readAt) return;
    setBusy(true); setActionError('');
    try { await notificationsService.read(notification.id); if (current()) synchronize(); }
    catch (cause) { if (current()) setActionError(cause instanceof Error ? cause.message : 'Chưa đánh dấu được thông báo.'); }
    finally { if (current()) setBusy(false); }
  };
  return { items, loading, loadingMore, error, actionError, busy, total, hasMore: items.length < total, refresh: () => load(), loadMore: () => load(page + 1), open, readAll, markRead };
}

export function useNotificationCategoryCounts() {
  const { account } = useAuthStore();
  const { revision } = useNotificationUpdates();
  const generation = tokenStorage.getSession()?.generation;
  const [snapshot, setSnapshot] = useState<{ accountId?: string; counts: Partial<Record<string, number>> }>({ counts: {} });
  useEffect(() => {
    if (!account?.id) return;
    const controller = new AbortController();
    // API totals cover the entire inbox, including rows not loaded by pagination.
    void Promise.all(notificationCategories.map(async category => {
      const page = await notificationsService.list({ category: category.value }, 1, 1, controller.signal);
      return [category.value, page.total] as const;
    })).then(entries => {
      if (!controller.signal.aborted && tokenStorage.getSession()?.generation === generation && tokenStorage.getSession()?.account?.id === account.id)
        setSnapshot({ accountId: account.id, counts: Object.fromEntries(entries) });
    }).catch(() => { /* Leave unavailable totals absent rather than showing invented counts. */ });
    return () => controller.abort();
  }, [account?.id, generation, revision]);
  return snapshot.accountId === account?.id ? snapshot.counts : {};
}
