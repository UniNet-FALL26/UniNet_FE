import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { authStore } from '@/store/auth.store';
import type { LoginRequest, RegisterStudentRequest } from '@/types/auth';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(operation: () => Promise<T>, onSuccess: (result: T) => Promise<void>) {
    if (loading) return false;
    setLoading(true); setError(null);
    try { await onSuccess(await operation()); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra.'); return false; }
    finally { setLoading(false); }
  }
  return {
    loading, error, clearError: () => setError(null),
    login: (request: LoginRequest) => run(() => authService.login(request), authStore.setAuth),
    register: (request: RegisterStudentRequest) => run(() => authService.registerStudent(request), authStore.setAuth),
    logout: () => run(() => authService.logout(), () => authStore.clearAuth()),
    google: () => run(() => Promise.resolve(authService.loginWithGoogle()), authStore.setAuth),
  };
}
