import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import { projectVerificationService as service } from '@/services/project-verification.service';
import type { VerificationDetail, VerificationFinalResult } from '@/types/project-verification';

export function useVerificationDossier(id: string, withResult = false) {
  const { account } = useAuthStore();
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [result, setResult] = useState<VerificationFinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  const owner = useRef('');
  const key = `${account?.id ?? ''}:${id}`;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    if (owner.current !== key) { setDetail(null); setResult(null); owner.current = key; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let failures = 0;
    let denied = false;
    const visible = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
      (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    async function load() {
      if (controller.signal.aborted || !visible() || inFlight || denied) return;
      if (timer) clearTimeout(timer);
      inFlight = true; setLoading(true);
      let pending = true;
      try {
        const next = await service.detail(id, controller.signal);
        if (controller.signal.aborted) return;
        setDetail(next); setError(null);
        pending = next.verification.status === 0;
        if (withResult) {
          try {
            const report = next.finalResult ?? await service.result(id, controller.signal);
            if (!controller.signal.aborted) { setResult(report); setResultError(null); }
          } catch (cause) {
            if (controller.signal.aborted) return;
            if (cause instanceof ApiError && cause.status === 404 && cause.code === 'VERIFICATION_RESULT_NOT_AVAILABLE') {
              setResult(null); setResultError(null);
            } else throw cause;
          }
        }
        failures = 0;
      } catch (cause) {
        if (controller.signal.aborted) return;
        failures++;
        denied = cause instanceof ApiError && [401, 403].includes(cause.status ?? 0);
        if (denied) { setDetail(null); setResult(null); }
        const message = cause instanceof ApiError && cause.status === 403 ? 'Bạn không có quyền xem hồ sơ xác minh này.'
          : cause instanceof Error ? cause.message : 'Không thể tải hồ sơ. Vui lòng thử lại.';
        if (withResult && !denied) setResultError(message);
        setError(message);
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (pending && failures < 3 && !denied && visible()) timer = setTimeout(() => { void load(); }, 12000);
        }
      }
    }
    void load();
    const foreground = () => { if (timer) clearTimeout(timer); if (visible()) void load(); };
    const subscription = AppState.addEventListener('change', foreground);
    if (Platform.OS === 'web' && typeof document !== 'undefined') { document.addEventListener('visibilitychange', foreground); window.addEventListener('focus', foreground); }
    return () => {
      controller.abort(); if (timer) clearTimeout(timer); subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') { document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', foreground); }
    };
  }, [key, id, revision, withResult]));
  return { detail, result, error, resultError, loading, refresh };
}
