// TypeScript fallback; Metro resolves the native/Web implementation for each platform.
export { isPushConfigured, pushPlatform, existingPushToken, requestPushToken, initializePush, revokePushToken } from './push.web';
