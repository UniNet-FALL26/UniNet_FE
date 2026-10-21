import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/services/api';
import { projectVerificationService as service } from '@/services/project-verification.service';
import type { EvidenceModeration, VerificationDetail } from '@/types/project-verification';

type Block<T> = { data: T | null; loading: boolean; error: string | null; forbidden?: boolean };
const initial = <T,>(): Block<T> => ({ data: null, loading: true, error: null });
const errorText = (error: unknown) => error instanceof ApiError && error.status === 403
  ? 'Bạn không có quyền xem dữ liệu xác minh này.'
  : error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';

export function useProjectVerification(projectId: string, isCreator: boolean) {
  const [level1, setLevel1] = useState<Block<EvidenceModeration>>(initial);
  const [level2, setLevel2] = useState<Block<VerificationDetail>>(initial);
  const [cycle, setCycle] = useState<Block<{ status: number }>>(initial);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryLock = useRef(false);
  const active = useRef(false);
  const refresh = () => setRevision(v => v + 1);

  useFocusEffect(useCallback(() => {
    if (!isCreator) return;
    active.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;
    let failures = 0;
    let forbidden1 = false;
    let forbidden2 = false;
    const signal = controller.signal;
    async function load() {
      if (stopped || inFlight || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      inFlight = true;
      if (!forbidden1) setLevel1(v => ({ ...v, loading: true }));
      if (!forbidden2) setLevel2(v => ({ ...v, loading: true }));
      let pending = false;
      let failed = false;
      await Promise.allSettled([
        (async () => {
          if (forbidden1) return;
          try {
            const data = await service.getLevel1(projectId, signal);
            if (!signal.aborted) setLevel1({ data, loading: false, error: null });
            pending ||= data.status === 0 || data.status === 1;
          } catch (error) {
            if (signal.aborted) return;
            if (error instanceof ApiError && error.status === 404 && error.code === 'LEVEL1_NOT_FOUND') setLevel1({ data: null, loading: false, error: null });
            else {
              failed = true;
              forbidden1 = error instanceof ApiError && (error.status === 403 || error.status === 401);
              setLevel1(v => ({ ...v, data: forbidden1 ? null : v.data, loading: false, error: errorText(error), forbidden: forbidden1 }));
            }
          }
        })(),
        (async () => {
          if (forbidden2) return;
          try {
            // Search Pending explicitly so an older active application is never missed by pagination.
            const pendingPage = await service.list(projectId, true, signal);
            const page = pendingPage.verifications.length ? pendingPage : await service.list(projectId, false, signal);
            const data = page.verifications[0] ? await service.detail(page.verifications[0].id, signal) : null;
            if (!signal.aborted) setLevel2({ data, loading: false, error: null });
            pending ||= data?.verification.status === 0;
          } catch (error) {
            if (signal.aborted) return;
            failed = true;
            forbidden2 = error instanceof ApiError && (error.status === 403 || error.status === 401);
            setLevel2(v => ({ ...v, data: forbidden2 ? null : v.data, loading: false, error: errorText(error), forbidden: forbidden2 }));
          }
        })(),
      ]);
      inFlight = false;
      failures = failed ? failures + 1 : 0;
      if (!stopped && pending && failures < 3) timer = setTimeout(load, 12000);
    }
    void load();
    setCycle(v => ({ ...v, loading: true }));
    service.contribution(projectId, signal).then(data => {
      if (!signal.aborted) setCycle({ data, loading: false, error: null });
    }).catch(error => {
      if (!signal.aborted) setCycle({ data: null, loading: false, error: error instanceof ApiError && error.status === 404 ? null : errorText(error) });
    });
    const subscription = AppState.addEventListener('change', state => {
      if (timer) clearTimeout(timer);
      if (state === 'active') void load();
    });
    return () => { active.current = false; stopped = true; controller.abort(); if (timer) clearTimeout(timer); subscription.remove(); };
  }, [projectId, isCreator, revision]));

  async function retry() {
    if (!isCreator || level1.forbidden || retryLock.current) return;
    retryLock.current = true; setRetrying(true); setNotice(null);
    try {
      const data = await service.retryLevel1(projectId);
      if (active.current) { setLevel1({ data, loading: false, error: null }); setNotice('Đã nhận trạng thái kiểm tra từ hệ thống.'); refresh(); }
    } catch (error) {
      if (!active.current) return;
      const code = error instanceof ApiError ? error.code : undefined;
      setNotice(code === 'LEVEL1_UNCHANGED' ? 'Chưa có thay đổi cần kiểm tra lại. Đang tải kết quả hiện tại.'
        : code === 'LEVEL1_RETRY_EXHAUSTED' ? 'Đã hết lượt thử lại. Cần cập nhật dữ liệu hoặc liên hệ hỗ trợ vận hành.'
        : code === 'EVIDENCE_POLICY_NOT_CONFIGURED' ? 'Hệ thống chưa cấu hình chính sách kiểm tra. Vui lòng liên hệ hỗ trợ.'
        : errorText(error));
      // A failed POST can still have reached the server. Reconcile via GET, never repeat POST automatically.
      refresh();
    } finally { retryLock.current = false; if (active.current) setRetrying(false); }
  }
  return { level1, level2, cycle, notice, retrying, refresh, retry };
}
