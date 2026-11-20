import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import type { PushCallbacks } from './push.types';
import { parseChatPush } from './push.types';

export const pushPlatform = Platform.OS === 'ios' ? 'iOS' : 'Android';
export function isPushConfigured() { return Constants.executionEnvironment !== 'storeClient' && !!Constants.expoConfig?.extra?.[Platform.OS === 'ios' ? 'firebaseIosEnabled' : 'firebaseAndroidEnabled']; }
async function client() { if (!isPushConfigured()) return null; const sdk = await import('@react-native-firebase/messaging'); return { sdk, messaging: sdk.getMessaging() }; }
async function androidChannel() {
  if (Platform.OS !== 'android') return;
  const notifications = await import('expo-notifications');
  await notifications.setNotificationChannelAsync('uninet-messages', { name: 'Tin nhắn UniNet', importance: notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 150, 200] });
}
export async function existingPushToken() {
  const module = await client(); if (!module) return null;
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33 && !await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)) return null;
  const permission = await module.sdk.hasPermission(module.messaging);
  if (permission < 1) return null;
  await androidChannel();
  return await module.sdk.getToken(module.messaging);
}
export async function requestPushToken() {
  const module = await client(); if (!module) throw new Error('Bản ứng dụng này chưa được cấu hình thông báo.');
  if (Platform.OS === 'android') {
    await androidChannel();
    if (Number(Platform.Version) >= 33 && await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Bạn chưa cấp quyền thông báo cho UniNet.');
  } else {
    const permission = await module.sdk.requestPermission(module.messaging); if (permission < 1) throw new Error('Bạn chưa cấp quyền thông báo cho UniNet.');
    if (!module.messaging.isDeviceRegisteredForRemoteMessages) await module.sdk.registerDeviceForRemoteMessages(module.messaging);
  }
  return await module.sdk.getToken(module.messaging);
}
export async function revokePushToken() { const module = await client(); if (module) await module.sdk.deleteToken(module.messaging); }
let initialOpened = false;
export async function initializePush(callbacks: PushCallbacks) {
  const module = await client(); if (!module) return () => {};
  const subscriptions = [module.sdk.onMessage(module.messaging, remote => { const data = parseChatPush(remote.data); if (data) callbacks.foreground(data); }),
    module.sdk.onTokenRefresh(module.messaging, callbacks.token),
    module.sdk.onNotificationOpenedApp(module.messaging, remote => { const data = parseChatPush(remote.data); if (data) callbacks.opened(data); })];
  if (!initialOpened) { initialOpened = true; const remote = await module.sdk.getInitialNotification(module.messaging); const data = parseChatPush(remote?.data); if (data) callbacks.opened(data); }
  return () => subscriptions.forEach(unsubscribe => unsubscribe());
}
