import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createGitHubRefresh, type GitRefreshState } from '@/utils/github-refresh';

export function notifyGitHubChanged(projectId: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('uninet:github-changed', { detail: { projectId } }));
}
const isActive = () => Platform.OS === 'web' ? typeof document !== 'undefined' && document.visibilityState !== 'hidden' : AppState.currentState === 'active';
export function useGitHubRevalidation(scope: string, projectId: string, read: (signal: AbortSignal) => Promise<boolean>, enabled = true) {
  const [state, setState] = useState<{ scope: string; state: GitRefreshState }>({ scope, state: 'idle' });
  const action = useRef(read), refresh = useRef<ReturnType<typeof createGitHubRefresh> | null>(null), focused = useRef(true);
  const browserFocused = useRef(true);
  useEffect(() => { action.current = read; }, [read]);
  useEffect(() => {
    if (!enabled) return;
    // Listeners are absent while a parent panel is paused behind its wizard.
    // Re-read actual focus on resume rather than retaining an obsolete blur flag.
    if (Platform.OS === 'web') browserFocused.current = document.hasFocus();
    const runner = createGitHubRefresh({ run: signal => action.current(signal), onState: value => setState({ scope, state: value }),
      terminalError: cause => !!cause && typeof cause === 'object' && 'code' in cause && (cause.code === 'FORBIDDEN' || cause.code === 'GIT_PROJECT_MEMBERSHIP_REQUIRED') });
    refresh.current = runner;
    runner.setActive(isActive() && focused.current && browserFocused.current);
    void runner.trigger();
    const wake = () => { runner.setActive(isActive() && focused.current && browserFocused.current); void runner.trigger(); };
    const focus = () => { browserFocused.current = true; wake(); };
    const blur = () => { browserFocused.current = false; runner.setActive(false); };
    const changed = (event: Event) => { if ((event as CustomEvent<{ projectId: string }>).detail?.projectId === projectId) void runner.trigger(); };
    if (Platform.OS === 'web') {
      window.addEventListener('focus', focus); window.addEventListener('blur', blur);
      document.addEventListener('visibilitychange', wake); window.addEventListener('uninet:github-changed', changed);
    }
    const app = Platform.OS !== 'web' ? AppState.addEventListener('change', wake) : null;
    return () => {
      runner.dispose(); if (refresh.current === runner) refresh.current = null;
      if (Platform.OS === 'web') { window.removeEventListener('focus', focus); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', wake); window.removeEventListener('uninet:github-changed', changed); }
      app?.remove();
    };
  }, [scope, projectId, enabled]);
  useFocusEffect(useCallback(() => {
    focused.current = true; refresh.current?.setActive(isActive() && browserFocused.current); void refresh.current?.trigger();
    return () => { focused.current = false; refresh.current?.setActive(false); };
  }, []));
  return {
    state: state.scope === scope ? state.state : 'idle',
    check: () => refresh.current?.trigger(true), wait: () => refresh.current?.wait(), stopWaiting: () => refresh.current?.stopWaiting(),
  };
}
