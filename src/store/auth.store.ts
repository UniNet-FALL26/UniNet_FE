import { useSyncExternalStore } from 'react';
import type { AuthAccount, LoginResponse } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { tokenStorage } from '@/utils/storage';

type AuthState = { account: AuthAccount | null; accessToken: string | null; isAuthenticated: boolean; isLoading: boolean };
let state: AuthState = { account: null, accessToken: null, isAuthenticated: false, isLoading: true };
const listeners = new Set<() => void>();
const update = (next: Partial<AuthState>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
tokenStorage.subscribe(session => {
  if (!session) update({ account: null, accessToken: null, isAuthenticated: false, isLoading: false });
  else update({ account: session.account ?? state.account, accessToken: session.accessToken, isAuthenticated: !!(session.account ?? state.account), isLoading: false });
});
export const useAuthStore = () => useSyncExternalStore(subscribe, () => state, () => state);
export const authStore = {
  updateAccount(account: AuthAccount) { tokenStorage.updateAccount(account); },
  async setAuth(response: LoginResponse) {
    await tokenStorage.setSession(response);
  },
  async clearAuth() {
    await tokenStorage.clear();
  },
  async restoreSession() {
    const session = tokenStorage.getSession();
    try {
      if (session) {
        const account = await authService.getCurrentUser();
        const current = tokenStorage.getSession();
        if (!current || current.generation !== session.generation) return;
        update({ account, accessToken: current.accessToken, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch (cause) {
      const current = tokenStorage.getSession();
      if (current && current.generation === session?.generation) {
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status ?? 0)) { await tokenStorage.clear(current); return; }
        update({ account: current.account ?? state.account, accessToken: current.accessToken, isAuthenticated: !!(current.account ?? state.account), isLoading: false });
        return;
      }
      if (current) return;
    }
    if (!tokenStorage.getSession()) update({ account: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
};
