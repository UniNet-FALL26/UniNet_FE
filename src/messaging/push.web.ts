import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import type { PushCallbacks } from './push.types';
import { parseChatPush } from './push.types';

const config = { apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID };
const vapid = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
export const pushPlatform = 'Web';
export function isPushConfigured() { return !!(config.apiKey && config.projectId && config.appId && config.messagingSenderId && vapid); }
async function messaging() {
  if (!isPushConfigured() || typeof window === 'undefined' || !window.isSecureContext || !await isSupported()) return null;
  const app = getApps().find(app => app.name === 'uninet-chat') ?? initializeApp(config, 'uninet-chat'); return getMessaging(app);
}
export async function existingPushToken() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;
  const client = await messaging(); if (!client) return null;
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`, { scope: '/firebase-cloud-messaging-push-scope' });
  return await getToken(client, { vapidKey: vapid, serviceWorkerRegistration: registration });
}
export async function requestPushToken() {
  if (!isPushConfigured()) throw new Error('Thông báo trên thiết bị hiện chưa khả dụng.');
  if (typeof Notification === 'undefined' || !window.isSecureContext) throw new Error('Trình duyệt này chưa hỗ trợ thông báo.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo cho UniNet.');
  return await existingPushToken();
}
export async function revokePushToken() { const client = await messaging(); if (client) await deleteToken(client); }
export async function initializePush(callbacks: PushCallbacks) {
  const client = await messaging(); if (!client) return () => {};
  const unsubscribe = onMessage(client, remote => { const data = parseChatPush(remote.data); if (data) callbacks.foreground(data); });
  const clicked = (event: MessageEvent) => { if (event.origin && event.origin !== location.origin) return; if (event.data?.kind === 'chat-notification-open') { const data = parseChatPush(event.data.payload); if (data) callbacks.opened(data); } };
  navigator.serviceWorker.addEventListener('message', clicked);
  const params = new URLSearchParams(location.search);
  if (params.get('fromPush') === '1') { const data = parseChatPush({ type: 'chat_message', conversationId: params.get('conversationId'), messageId: params.get('messageId') }); if (data) callbacks.opened(data); }
  return () => { unsubscribe(); navigator.serviceWorker.removeEventListener('message', clicked); };
}
