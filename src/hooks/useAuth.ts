import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { authStore } from '@/store/auth.store';
import type { LoginRequest, RegisterPartnerRequest, RegisterStudentRequest } from '@/types/auth';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(operation: () => Promise<T>, onSuccess: (result: T) => Promise<void> = async () => {}) {
    if (loading) return false;
    setLoading(true); setError(null);
    try { await onSuccess(await operation()); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra.'); return false; }
    finally { setLoading(false); }
  }
  return {
    loading, error, clearError: () => setError(null),
    login: (request: LoginRequest) => run(() => authService.login(request), authStore.setAuth),
    register: (request: RegisterStudentRequest) => run(() => authService.registerStudent(request)),
    registerPartner: (request: RegisterPartnerRequest) => run(() => authService.registerPartner(request), authStore.setAuth),
    logout: () => run(() => authService.logout()),
    logoutAll: () => run(() => authService.logoutAll()),
    google: async (getIdToken: () => Promise<string | null>) => {
      let authenticated = false;
      const success = await run(async () => {
        const idToken = await getIdToken();
        return idToken === null ? null : authService.loginWithGoogle(idToken);
      }, async response => {
        if (response) { await authStore.setAuth(response); authenticated = true; }
      });
      return success && authenticated;
    },
  };
}
