import { useSyncExternalStore } from 'react';
import type { AuthAccount, LoginResponse } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/utils/storage';

type AuthState = { account: AuthAccount | null; accessToken: string | null; isAuthenticated: boolean; isLoading: boolean };
let state: AuthState = { account: null, accessToken: null, isAuthenticated: false, isLoading: true };
const listeners = new Set<() => void>();
const update = (next: Partial<AuthState>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useAuthStore = () => useSyncExternalStore(subscribe, () => state, () => state);
export const authStore = {
  async setAuth(response: LoginResponse) {
    await tokenStorage.set(response.accessToken);
    update({ account: response.account, accessToken: response.accessToken, isAuthenticated: true, isLoading: false });
  },
  async clearAuth() {
    await tokenStorage.clear();
    update({ account: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
  async restoreSession() {
    try {
      const token = await tokenStorage.get();
      if (token) {
        const account = await authService.getCurrentUser();
        update({ account, accessToken: token, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch { await tokenStorage.clear(); }
    update({ account: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
};
