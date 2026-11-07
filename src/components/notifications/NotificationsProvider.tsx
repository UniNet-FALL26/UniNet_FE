import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_URL } from '@/constants/config';
import { refreshSession } from '@/services/api';
import { notificationsService } from '@/services/notifications.service';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { toast } from '@/store/toast.store';
import type { AccountNotification } from '@/types/notifications';

type NotificationsContextValue = { unreadCount: number; totalCount: number; revision: number; readStates: Record<string, string | null>; synchronize: () => void; read: (item: AccountNotification) => Promise<void>; readAll: () => Promise<void> };
const NotificationsContext = createContext<NotificationsContextValue>({ unreadCount: 0, totalCount: 0, revision: 0, readStates: {}, synchronize: () => {}, read: async () => {}, readAll: async () => {} });
export const useNotificationUpdates = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { account, isAuthenticated } = useAuthStore();
  const [snapshot, setSnapshot] = useState({ accountId: '', unreadCount: 0, totalCount: 0, revision: 0 });
  const [readStates, setReadStates] = useState<Record<string, string | null>>({});
  const localReads = useRef<Record<string, string | null>>({});
  const pendingReads = useRef(new Set<string>());
  const readVersion = useRef(0);
  const refreshRef = useRef<() => void>(() => {});
  const synchronize = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const initial = tokenStorage.getSession();
    if (!isAuthenticated || !account || !initial) return;
    const accountId = account.id, generation = initial.generation;
    let disposed = false, countRequest: AbortController | undefined, retry: ReturnType<typeof setTimeout> | undefined;
    const active = () => !disposed && tokenStorage.getSession()?.generation === generation && tokenStorage.getSession()?.account?.id === accountId;
    const refresh = () => {
      if (!active()) return;
      setSnapshot(current => ({ accountId, unreadCount: current.accountId === accountId ? current.unreadCount : 0, totalCount: current.accountId === accountId ? current.totalCount : 0, revision: current.revision + 1 }));
      countRequest?.abort();
      countRequest = new AbortController();
      const signal = countRequest.signal;
      const version = readVersion.current;
      notificationsService.list({}, 1, 1, signal).then(({ unreadCount, total }) => {
        if (active() && !signal.aborted && version === readVersion.current && !pendingReads.current.size) setSnapshot(current => ({ ...current, accountId, unreadCount, totalCount: total }));
      }).catch(() => {});
    };
    refreshRef.current = refresh;
    refresh();
    const hub = API_URL.replace(/\/api$/, '') + '/hubs/notifications';
    const connection = new HubConnectionBuilder().withUrl(hub, {
      accessTokenFactory: async () => {
        if (!active()) throw new Error('Phiên đăng nhập đã thay đổi.');
        const session = tokenStorage.getSession()!;
        if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now() + 30_000) await refreshSession(session);
        if (!active()) throw new Error('Phiên đăng nhập đã thay đổi.');
        return tokenStorage.getSession()!.accessToken;
      },
    }).withAutomaticReconnect([0, 2000, 10000, 30000]).configureLogging(LogLevel.None).build();
    const connect = async () => {
      if (!active()) return;
      try { await connection.start(); if (active()) refresh(); else await connection.stop(); }
      catch { if (active()) retry = setTimeout(() => { void connect(); }, 30_000); }
    };
    connection.on('NotificationChanged', refresh);
    connection.onreconnected(refresh);
    connection.onclose(() => { if (active()) retry = setTimeout(() => { void connect(); }, 30_000); });
    void connect();
    const appSubscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const onFocus = () => refresh();
    if (Platform.OS === 'web') window.addEventListener('focus', onFocus);
    const poll = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60_000);
    const unsubscribe = tokenStorage.subscribe(session => {
      if (!session || session.generation !== generation) {
        disposed = true;
        countRequest?.abort();
        void connection.stop();
      }
    });
    return () => {
      disposed = true; refreshRef.current = () => {}; countRequest?.abort();
      if (retry) clearTimeout(retry);
      clearInterval(poll); unsubscribe(); appSubscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('focus', onFocus);
      void connection.stop();
    };
  }, [account?.id, isAuthenticated]);

  const read = async (item: AccountNotification) => {
    if (pendingReads.current.has(item.id) || (item.id in localReads.current ? localReads.current[item.id] : item.readAt)) return;
    const session = tokenStorage.getSession();
    if (!session || session.account?.id !== account?.id || item.recipientUserId !== account?.id) return;
    const active = () => tokenStorage.getSession()?.generation === session.generation && tokenStorage.getSession()?.account?.id === session.account?.id;
    pendingReads.current.add(item.id); readVersion.current++;
    localReads.current = { ...localReads.current, [item.id]: new Date().toISOString() };
    setReadStates(localReads.current);
    setSnapshot(value => ({ ...value, unreadCount: Math.max(0, value.unreadCount - 1) }));
    try { await notificationsService.read(item.id); }
    catch (cause) {
      if (active()) {
        localReads.current = { ...localReads.current, [item.id]: null };
        setReadStates(localReads.current);
        setSnapshot(value => ({ ...value, unreadCount: value.unreadCount + 1 }));
        toast.error(cause instanceof Error ? cause.message : 'Chưa đánh dấu được thông báo. Vui lòng thử lại.');
      }
    } finally {
      pendingReads.current.delete(item.id); readVersion.current++;
      if (active() && !pendingReads.current.size) synchronize();
    }
  };
  const readAll = async () => {
    await notificationsService.readAll();
    localReads.current = {}; setReadStates({}); synchronize();
  };

  const own = isAuthenticated && snapshot.accountId === account?.id;
  return <NotificationsContext.Provider value={{ unreadCount: own ? snapshot.unreadCount : 0, totalCount: own ? snapshot.totalCount : 0, revision: own ? snapshot.revision : 0, readStates: own ? readStates : {}, synchronize, read, readAll }}>{children}</NotificationsContext.Provider>;
}
