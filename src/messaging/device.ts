import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

let pendingDevice: Promise<string> | undefined;
export function chatDeviceId() {
  return pendingDevice ??= (async () => {
    const key = 'uninet.chat.device';
    let saved: string | null = null;
    try { saved = Platform.OS === 'web' ? (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null) : await SecureStore.getItemAsync(key); } catch { /* Keep login usable if persistent storage is unavailable. */ }
    if (saved && /^[a-zA-Z0-9_-]{8,100}$/.test(saved)) return saved;
    const next = randomUUID();
    try { if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(key, next); }
      else await SecureStore.setItemAsync(key, next); } catch { /* This app session retains its in-memory device ID. */ }
    return next;
  })();
}

export function messageRoute(role?: number) { return role === 1 ? '/(company)/company-messages' as const : role === 2 ? '/(assessor)/assessor-messages' as const : '/(tabs)/messages' as const; }
export async function chatPushPreference(accountId: string, value?: boolean) {
  const key = 'uninet.chat.push.' + accountId;
  if (value !== undefined) { if (Platform.OS === 'web') localStorage.setItem(key, String(value)); else await SecureStore.setItemAsync(key, String(value)); return value; }
  const saved = Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key); return saved !== 'false';
}
export async function chatPreviewPreference(accountId: string, value?: boolean) {
  const key = 'uninet.chat.preview.' + accountId;
  if (value !== undefined) { if (Platform.OS === 'web') localStorage.setItem(key, String(value)); else await SecureStore.setItemAsync(key, String(value)); return value; }
  const saved = Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key); return saved !== 'false';
}
const pendingKey = 'uninet.chat.open';
export async function saveChatTarget(conversationId: string, messageId?: string) {
  if (!/^[a-f0-9-]{36}$/i.test(conversationId)) return;
  const value = JSON.stringify({ conversationId, messageId: messageId && /^[a-f0-9-]{36}$/i.test(messageId) ? messageId : undefined });
  if (Platform.OS === 'web') localStorage.setItem(pendingKey, value); else await SecureStore.setItemAsync(pendingKey, value);
}
export async function takeChatTarget() {
  const value = Platform.OS === 'web' ? localStorage.getItem(pendingKey) : await SecureStore.getItemAsync(pendingKey);
  if (Platform.OS === 'web') localStorage.removeItem(pendingKey); else await SecureStore.deleteItemAsync(pendingKey);
  try { const data = JSON.parse(value || 'null'); return data && /^[a-f0-9-]{36}$/i.test(data.conversationId) ? data as { conversationId: string; messageId?: string } : null; } catch { return null; }
}
