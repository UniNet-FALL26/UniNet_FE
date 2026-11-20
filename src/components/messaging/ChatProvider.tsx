import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, AppState, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { refreshSession } from '@/services/api';
import { messagingService } from '@/services/messaging.service';
import { chatDeviceId, chatPreviewPreference, chatPushPreference, messageRoute, saveChatTarget, takeChatTarget } from '@/messaging/device';
import * as push from '@/messaging/push';
import type { ChatEvent, ChatPushPayload } from '@/types/messaging';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';

type ChatContextValue = {
  unreadCount: number; revision: number; syncVersion: number; connected: boolean; foreground: boolean; deviceId: string; pushEnabled: boolean;
  setViewing: (id: string | null) => void; typing: (id: string, value: boolean) => void; refresh: () => void;
  subscribe: (listener: (event: ChatEvent) => void) => () => void;
  subscribeTyping: (listener: (event: { conversationId: string; accountId: string; isTyping: boolean }) => void) => () => void;
  enablePush: (showPreview: boolean) => Promise<void>;
  disablePush: () => Promise<void>;
};
const Context = createContext<ChatContextValue>({ unreadCount: 0, revision: 0, syncVersion: 0, connected: false, foreground: true, deviceId: '', pushEnabled: false,
  setViewing: () => {}, typing: () => {}, refresh: () => {}, subscribe: () => () => {}, subscribeTyping: () => () => {}, enablePush: async () => {}, disablePush: async () => {} });
export const useChat = () => useContext(Context);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { account, isAuthenticated } = useAuthStore();
  const accountRef = useRef(account); accountRef.current = account;
  const [deviceId, setDeviceId] = useState(''), [unreadCount, setUnreadCount] = useState(0), [revision, setRevision] = useState(0), [connected, setConnected] = useState(false), [pushEnabled, setPushEnabled] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [syncVersion, setSyncVersion] = useState(0);
  const foregroundRef = useRef(true), viewing = useRef<string | null>(null), connection = useRef<HubConnection | null>(null);
  const listeners = useRef(new Set<(event: ChatEvent) => void>()), typingListeners = useRef(new Set<(event: { conversationId: string; accountId: string; isTyping: boolean }) => void>());
  const seen = useRef(new Set<string>()); const [popup, setPopup] = useState<ChatPushPayload | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => { let disposed = false; chatDeviceId().then(id => { if (!disposed) setDeviceId(id); }).catch(() => {}); return () => { disposed = true; }; }, []);
  const refresh = useCallback(() => refreshRef.current(), []);
  const subscribe = useCallback((listener: (event: ChatEvent) => void) => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; }, []);
  const subscribeTyping = useCallback((listener: (event: { conversationId: string; accountId: string; isTyping: boolean }) => void) => { typingListeners.current.add(listener); return () => { typingListeners.current.delete(listener); }; }, []);
  const presence = useCallback(() => {
    if (connection.current?.state === HubConnectionState.Connected && deviceId) void connection.current.invoke('SetPresence', { deviceId, conversationId: viewing.current, isForeground: foregroundRef.current }).catch(() => {});
  }, [deviceId]);
  const setViewing = useCallback((id: string | null) => { viewing.current = id; presence(); }, [presence]);
  const typing = useCallback((id: string, value: boolean) => { if (connection.current?.state === HubConnectionState.Connected) void connection.current.invoke('Typing', id, value).catch(() => {}); }, []);
  const open = useCallback(async (payload: ChatPushPayload) => {
    setPopup(null);
    const current = accountRef.current;
    if (!current) { await saveChatTarget(payload.conversationId, payload.messageId); router.push('/(auth)/login'); return; }
    router.push({ pathname: messageRoute(current.role), params: { conversationId: payload.conversationId, messageId: payload.messageId } });
  }, []);
  const present = useCallback((payload: ChatPushPayload) => {
    if (!accountRef.current || payload.senderAccountId === accountRef.current.id || !foregroundRef.current) return;
    if (deviceId) void messagingService.acknowledge(deviceId, payload.messageId).catch(() => {});
    if (seen.current.has(payload.messageId)) return;
    seen.current.add(payload.messageId); if (seen.current.size > 500) seen.current.delete(seen.current.values().next().value!);
    if (viewing.current !== payload.conversationId) setPopup(payload);
  }, [deviceId]);
  useEffect(() => {
    const update = () => {
      const active = Platform.OS === 'web' ? document.visibilityState === 'visible' && document.hasFocus() : AppState.currentState === 'active';
      if (active && !foregroundRef.current) setSyncVersion(value => value + 1);
      foregroundRef.current = active; setForeground(active); if (!active) setPopup(null); presence(); if (active) refresh();
    };
    update(); const app = AppState.addEventListener('change', update);
    if (Platform.OS === 'web') { window.addEventListener('focus', update); window.addEventListener('blur', update); document.addEventListener('visibilitychange', update); }
    return () => { app.remove(); if (Platform.OS === 'web') { window.removeEventListener('focus', update); window.removeEventListener('blur', update); document.removeEventListener('visibilitychange', update); } };
  }, [presence, refresh]);
  const enablePush = useCallback(async (showPreview: boolean) => {
    if (!deviceId || !accountRef.current) throw new Error('Vui lòng đăng nhập và thử lại.');
    const session = tokenStorage.getSession(), owner = accountRef.current.id;
    const valid = () => tokenStorage.getSession()?.generation === session?.generation && accountRef.current?.id === owner;
    const available = await messagingService.pushConfig(); if (!available.enabled) throw new Error('Thông báo trên thiết bị hiện chưa khả dụng.');
    const token = await push.requestPushToken(); if (!token) throw new Error('Chưa đăng ký được thông báo trên thiết bị này.');
    if (!valid()) throw new Error('Phiên đăng nhập đã thay đổi.');
    await messagingService.registerDevice({ deviceId, token, platform: push.pushPlatform, showPreview });
    if (!valid()) return; await chatPreviewPreference(owner, showPreview); await chatPushPreference(owner, true); setPushEnabled(true);
  }, [deviceId]);
  const disablePush = useCallback(async () => {
    const owner = accountRef.current?.id; if (!owner || !deviceId) return;
    await chatPushPreference(owner, false); await messagingService.unregisterDevice(deviceId);
    await push.revokePushToken(); if (accountRef.current?.id === owner) setPushEnabled(false);
  }, [deviceId]);
  useEffect(() => {
    let disposed = false; let unsubscribe: (() => void) | undefined;
    void push.initializePush({ foreground: present, opened: payload => { void open(payload); }, token: token => {
      const current = accountRef.current;
      const generation = tokenStorage.getSession()?.generation;
      if (current && deviceId) void Promise.all([chatPreviewPreference(current.id), chatPushPreference(current.id)]).then(([showPreview, enabled]) => {
        if (!disposed && enabled && tokenStorage.getSession()?.generation === generation && accountRef.current?.id === current.id) return messagingService.registerDevice({ deviceId, token, platform: push.pushPlatform, showPreview });
      }).catch(() => {});
    } }).then(stop => { if (disposed) stop(); else unsubscribe = stop; }).catch(() => {});
    return () => { disposed = true; unsubscribe?.(); };
  }, [present, open, deviceId]);
  useEffect(() => {
    const initial = tokenStorage.getSession(); if (!isAuthenticated || !account || !initial || !deviceId) return;
    let disposed = false, retry: ReturnType<typeof setTimeout> | undefined, refreshTimer: ReturnType<typeof setTimeout> | undefined, countAbort: AbortController | undefined;
    const active = () => !disposed && tokenStorage.getSession()?.generation === initial.generation && tokenStorage.getSession()?.account?.id === account.id;
    const synchronize = () => {
      if (!active()) return; if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!active()) return; setRevision(value => value + 1); countAbort?.abort(); countAbort = new AbortController();
        messagingService.unread(countAbort.signal).then(result => { if (active()) setUnreadCount(result.count); }).catch(() => {});
      }, 100);
    };
    refreshRef.current = synchronize; synchronize();
    const hub = new HubConnectionBuilder().withUrl(API_URL.replace(/\/api$/, '') + '/hubs/messaging', { accessTokenFactory: async () => {
      if (!active()) throw new Error('Phiên đăng nhập đã thay đổi.'); const session = tokenStorage.getSession()!;
      if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now() + 30_000) await refreshSession(session);
      if (!active()) throw new Error('Phiên đăng nhập đã thay đổi.'); return tokenStorage.getSession()!.accessToken;
    } }).withAutomaticReconnect([0, 2000, 10000, 30000]).configureLogging(LogLevel.None).build(); connection.current = hub;
    hub.on('ChatChanged', (event: ChatEvent) => {
      if (!active()) return; synchronize(); listeners.current.forEach(listener => listener(event));
      if (event.kind === 'message' && event.notification && event.notify) present(event.notification);
      else if (event.kind === 'recalled') setPopup(current => current?.messageId === event.messageId ? null : current);
    });
    hub.on('TypingChanged', event => { if (active()) typingListeners.current.forEach(listener => listener(event)); });
    const ready = () => { if (!active()) return; setConnected(true); setSyncVersion(value => value + 1); synchronize(); presence(); };
    const connect = async () => { if (!active()) return; try { await hub.start(); ready(); } catch { if (active()) retry = setTimeout(() => { void connect(); }, 15000); } };
    hub.onreconnecting(() => setConnected(false)); hub.onreconnected(ready); hub.onclose(() => { setConnected(false); if (active()) retry = setTimeout(() => { void connect(); }, 15000); }); void connect();
    // Presence heartbeat only; message/history synchronization is driven by events and reconnects.
    const heartbeat = setInterval(() => { if (active() && foregroundRef.current) presence(); }, 25000);
    const renewPush = async () => {
      if (!active() || !await chatPushPreference(account.id)) return;
      const token = await push.existingPushToken(); if (!active()) return;
      if (!token) { setPushEnabled(false); return; }
      const showPreview = await chatPreviewPreference(account.id); if (!active()) return;
      await messagingService.registerDevice({ deviceId, token, platform: push.pushPlatform, showPreview }); if (active()) setPushEnabled(true);
    };
    const onPushFocus = () => { void renewPush().catch(() => {}); };
    onPushFocus(); if (Platform.OS === 'web') window.addEventListener('focus', onPushFocus);
    const pushResume = AppState.addEventListener('change', state => { if (state === 'active') onPushFocus(); });
    void takeChatTarget().then(target => { if (target && active()) router.push({ pathname: messageRoute(account.role), params: target }); }).catch(() => {});
    return () => { disposed = true; connection.current = null; refreshRef.current = () => {}; countAbort?.abort(); if (retry) clearTimeout(retry); if (refreshTimer) clearTimeout(refreshTimer); clearInterval(heartbeat); pushResume.remove(); if (Platform.OS === 'web') window.removeEventListener('focus', onPushFocus); void hub.stop(); };
  }, [account?.id, isAuthenticated, deviceId, presence, present]);
  return <Context.Provider value={{ unreadCount, revision, syncVersion, connected, foreground, deviceId, pushEnabled, setViewing, typing, refresh, subscribe, subscribeTyping, enablePush, disablePush }}>{children}
    {popup && <ChatPopup payload={popup} onClose={() => setPopup(null)} onOpen={() => { void open(popup); }} />}
  </Context.Provider>;
}

function ChatPopup({ payload, onOpen, onClose }: { payload: ChatPushPayload; onOpen: () => void; onClose: () => void }) {
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets(); const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(motion, { toValue: 1, duration: 180, useNativeDriver: true }).start(); const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [payload.messageId, motion, onClose]);
  return <Animated.View testID="chat-message-notification" role="status" style={[styles.popup, { width: Math.min(320, width - 24), top: insets.top + 12, right: 12, opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở tin nhắn ${payload.conversationName}`} onPress={onOpen} style={styles.popupOpen}>
      <View><PersonAvatar person={{ fullName: payload.conversationName, avatarUrl: payload.conversationAvatarUrl }} size={36} />{payload.conversationType === 1 && <View style={styles.smallAvatar}><PersonAvatar person={{ fullName: payload.senderName, avatarUrl: payload.senderAvatarUrl }} size={16} /></View>}</View>
      <View style={styles.popupCopy}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Image source={require('@/assets/images/icon.png')} accessibilityLabel="Logo UniNet" style={{ width: 16, height: 16 }} /><Text style={{ fontSize: 10, fontWeight: '600', color: '#1769E0' }}>UniNet</Text></View><Text style={styles.popupTitle} numberOfLines={1}>{payload.conversationName}</Text><Text style={styles.popupText} numberOfLines={1}>{payload.conversationType === 1 ? `${payload.senderName}: ` : ''}{payload.messagePreview}</Text></View>
    </Pressable><Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo tin nhắn" onPress={onClose} hitSlop={8} style={styles.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor="#687A96" /></Pressable>
  </Animated.View>;
}
const styles = StyleSheet.create({ popup: { position: 'absolute', zIndex: 10000, elevation: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE8F8', boxShadow: '0 4px 16px rgba(24, 49, 90, 0.12)' }, popupOpen: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }, popupCopy: { flex: 1, minWidth: 0, gap: 2 }, popupTitle: { fontSize: 13, fontWeight: '700', color: '#122442' }, popupText: { fontSize: 12, lineHeight: 18, color: '#5A6B83' }, smallAvatar: { position: 'absolute', bottom: -3, right: -3, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 20 }, close: { padding: 2 } });
