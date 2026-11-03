import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { companyService, type PartnerVerificationStatus } from '@/services/company.service';
import { authStore, useAuthStore } from '@/store/auth.store';

export function usePartnerVerification(accountId: string, enabled: boolean, onStatusChange?: (value: PartnerVerificationStatus) => void) {
  const { account } = useAuthStore();
  const accountRef = useRef(account); accountRef.current = account;
  const callbackRef = useRef(onStatusChange); callbackRef.current = onStatusChange;
  const [loaded, setLoaded] = useState<{ accountId: string; value: PartnerVerificationStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const apply = useCallback((value: PartnerVerificationStatus) => {
    const current = accountRef.current;
    if (current?.id !== accountId) return;
    setLoaded({ accountId, value }); setError('');
    if (value.status !== null && current.profile && current.profile.isVerified !== (value.status === 1))
      authStore.updateAccount({ ...current, profile: { ...current.profile, isVerified: value.status === 1 } });
    callbackRef.current?.(value);
  }, [accountId]);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const value = await companyService.getVerificationStatus(controller.signal);
      if (!controller.signal.aborted) { apply(value); return value; }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được trạng thái xác minh. Vui lòng thử lại.');
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
    return null;
  }, [apply]);
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30_000);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { clearInterval(timer); foreground.remove(); request.current?.abort(); request.current = null; };
  }, [enabled, refresh]));
  return { value: loaded?.accountId === accountId ? loaded.value : null, loading, error, refresh, apply };
}
