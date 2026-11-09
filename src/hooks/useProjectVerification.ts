import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { projectVerificationService as service } from '@/services/project-verification.service';
import type { VerificationDetail } from '@/types/project-verification';
export function useProjectVerification(projectId: string, isCreator: boolean) {
 const [level2, setLevel2] = useState<{data: VerificationDetail | null; loading: boolean; error: string | null}>({data: null, loading: true, error: null});
 const [revision, setRevision] = useState(0);
 useFocusEffect(useCallback(() => {
  if (!isCreator) return;
  const controller = new AbortController();
  setLevel2(v => ({...v, loading: true, error: null}));
  async function load() {
   const pending = await service.list(projectId, true, controller.signal);
   const page = pending.verifications.length ? pending : await service.list(projectId, false, controller.signal);
   const data = page.verifications[0] ? await service.detail(page.verifications[0].id, controller.signal) : null;
   if (!controller.signal.aborted) setLevel2({data, loading: false, error: null});
  }
  void load().catch(error => { if (!controller.signal.aborted) setLevel2({data: null, loading: false, error: error instanceof Error ? error.message : 'Không thể tải hồ sơ thẩm định.'}); });
  return () => controller.abort();
 }, [projectId, isCreator, revision]));
 return {level2, refresh: () => setRevision(v => v + 1)};
}
