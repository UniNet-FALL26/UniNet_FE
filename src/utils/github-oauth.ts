import { Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { projectGitService } from '@/services/project-github.service';

export type GitHubPendingFlow = { flowId: string; accountId: string; projectId: string; tab: 'members' | 'settings'; expiresAt: string };
const key = 'uninet.github-flow.v1';
export async function readGitHubFlow(): Promise<GitHubPendingFlow | null> {
  const raw = Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)) : await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as GitHubPendingFlow;
    if (typeof value.flowId !== 'string' || typeof value.accountId !== 'string' || typeof value.projectId !== 'string' || !['members', 'settings'].includes(value.tab) ||
      !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) return null;
    return value;
  } catch { return null; }
}
export async function clearGitHubFlow() {
  if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); }
  else await SecureStore.deleteItemAsync(key);
}
export async function beginGitHubOAuth(accountId: string, projectId: string, tab: 'members' | 'settings') {
  const target = process.env.EXPO_PUBLIC_GITHUB_OAUTH_RETURN_TARGET || (Platform.OS === 'web' ? 'expoWeb' : 'expoNative');
  const flow = await projectGitService.startOAuth(target);
  const url = new URL(flow.authorizationUrl);
  if (url.origin !== 'https://github.com' || url.username || url.password || url.pathname !== '/login/oauth/authorize') throw new Error('Invalid GitHub authorization URL');
  const value = JSON.stringify({ flowId: flow.flowId, accountId, projectId, tab, expiresAt: flow.expiresAt });
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('Browser unavailable');
    window.sessionStorage.setItem(key, value);
    window.location.assign(flow.authorizationUrl); // Same tab preserves the existing tab-scoped UniNet session.
  } else {
    await SecureStore.setItemAsync(key, value);
    await Linking.openURL(flow.authorizationUrl);
  }
}
export async function openGitHubAppAuthorization(url: string) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://github.com' || parsed.username || parsed.password || parsed.pathname !== '/login/oauth/authorize') throw new Error('Invalid GitHub authorization URL');
  // App currently returns to the Backend e2e target; retain this screen for explicit revalidation.
  await Linking.openURL(url);
}
export async function beginGitHubAppAuthorization(projectId: string, connectionId: string) {
  // Reserve the tab in the direct user gesture, avoiding a second normal "open" button.
  const popup = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
  if (popup) popup.opener = null;
  try {
    const flow = await projectGitService.startApp(projectId, connectionId);
    const url = new URL(flow.authorizationUrl);
    if (url.origin !== 'https://github.com' || url.username || url.password || url.pathname !== '/login/oauth/authorize') throw new Error('Invalid GitHub authorization URL');
    if (Platform.OS !== 'web') { await Linking.openURL(flow.authorizationUrl); return { ...flow, opened: true }; }
    if (popup && !popup.closed) { popup.location.replace(flow.authorizationUrl); return { ...flow, opened: true }; }
    return { ...flow, opened: false }; // Only popup-blocked browsers need a manual fallback.
  } catch (cause) { popup?.close(); throw cause; }
}
