import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { studentVerificationService } from '@/services/student-verification.service';
import { authStore, useAuthStore } from '@/store/auth.store';
import type { StudentVerification } from '@/types/student-verification';

export function useStudentVerification(accountId?: string) {
  const { account } = useAuthStore();
  const accountRef = useRef(account); accountRef.current = account;
  const [loaded, setLoaded] = useState<{ accountId: string; value: StudentVerification } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const apply = useCallback((value: StudentVerification) => {
    if (!accountId || accountRef.current?.id !== accountId) return;
    setLoaded({ accountId, value });
    const current = accountRef.current;
    if (current.profile && current.profile.isVerified !== value.isVerified) authStore.updateAccount({ ...current, profile: { ...current.profile, isVerified: value.isVerified } });
  }, [accountId]);
  const refresh = useCallback(async () => {
    if (!accountId) return null;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const value = await studentVerificationService.get(controller.signal);
      if (controller.signal.aborted) return null;
      apply(value); return value;
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được trạng thái xác minh. Vui lòng thử lại.');
      return null;
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }, [accountId, apply]);
  useFocusEffect(useCallback(() => {
    setError('');
    if (!accountId) { setLoaded(null); setLoading(false); return; }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { clearInterval(timer); foreground.remove(); request.current?.abort(); request.current = null; };
  }, [accountId, refresh]));
  const submitted = async (value: StudentVerification) => { apply(value); await refresh(); };
  return { value: loaded?.accountId === accountId ? loaded?.value ?? null : null, error, loading, refresh, submitted };
}
