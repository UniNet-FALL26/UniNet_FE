import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/services/api';
import { externalProjectDraftService as service } from '@/services/external-project-draft.service';
import { externalDraftShortcuts } from '@/store/external-project-drafts';
import { toast } from '@/store/toast.store';
import { tokenStorage } from '@/utils/storage';
import type { DraftData, DraftResponse } from '@/types/external-project-draft';

export function useExternalProjectDraft(id: string, owner: string | undefined) {
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [form, setForm] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [serverCopy, setServerCopy] = useState<DraftResponse | null>(null);
  const [expired, setExpired] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false), dirtyRef = useRef(false), active = useRef(false);
  const snapshot = useRef<DraftResponse | null>(null);
  const sameOwner = () => active.current && tokenStorage.getSession()?.account?.id === owner;
  const receive = (data: DraftResponse, replaceForm = false) => {
    snapshot.current = data; setDraft(data);
    if (replaceForm || !dirtyRef.current) { setForm(data.data); dirtyRef.current = false; }
    if (owner && (data.status === 3 || data.status === 4)) void externalDraftShortcuts.remove(owner, id).catch(() => {});
  };
  useFocusEffect(useCallback(() => {
    if (!owner || !id) return;
    active.current = true;
    if (!lock.current) setBusy(false);
    let stopped = false, inFlight = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (stopped || inFlight || lock.current || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      if (timer) clearTimeout(timer);
      controller = new AbortController(); const signal = controller.signal;
      inFlight = true; setLoading(true);
      try {
        const data = await service.get(id, signal);
        if (stopped || signal.aborted) return;
        const previous = snapshot.current;
        if (data.status === 3 || data.status === 4) { receive(data); setConflict(false); }
        else if (conflict || (dirtyRef.current && previous && previous.version !== data.version)) { setServerCopy(data); setConflict(true); }
        else receive(data);
        setError(null);
        setUnavailable(false);
        if (data.status === 0) timer = setTimeout(() => void load(), 8000);
      } catch (cause) {
        if (stopped || signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái.');
        if (cause instanceof ApiError && cause.status === 404) void externalDraftShortcuts.remove(owner, id).catch(() => {});
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status ?? 0)) setUnavailable(true);
        if (cause instanceof ApiError && cause.status === 410) { setExpired(true); setError('Bản nháp đã hết hạn. Hãy tạo bản nháp mới.'); void externalDraftShortcuts.remove(owner, id).catch(() => {}); }
        if (!(cause instanceof ApiError && [401, 403, 404, 410].includes(cause.status ?? 0)) && snapshot.current?.status === 0) timer = setTimeout(() => void load(), 8000);
      } finally {
        inFlight = false;
        if (!stopped) {
          setLoading(false);
          if (signal.aborted && AppState.currentState === 'active') timer = setTimeout(() => void load(), 0);
        }
      }
    };
    void load();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void load();
      else { if (timer) clearTimeout(timer); controller?.abort(); }
    });
    return () => { active.current = false; stopped = true; controller?.abort(); if (timer) clearTimeout(timer); subscription.remove(); };
  }, [id, owner, revision, conflict]));

  const edit = (data: DraftData) => { dirtyRef.current = true; setForm(data); };
  const reconcile = async () => {
    // A failed write may have reached the server. Preserve local edits until reviewed.
    setConflict(true);
    try { const data = await service.get(id); if (sameOwner()) { setServerCopy(data); if (data.status === 3 || data.status === 4) receive(data); } return data; }
    catch { return null; }
  };
  async function write(confirm: boolean, sharingRights = false): Promise<string | null> {
    const original = snapshot.current;
    if (lock.current || conflict || expired || unavailable || !form || !original || ![1, 2].includes(original.status) || !sameOwner() || (confirm && !sharingRights)) return null;
    lock.current = true; setBusy(true); setError(null);
    let reconciledWrite = false;
    try {
      let current = original;
      if (!confirm || dirtyRef.current || current.status === 2) {
        current = await service.update(id, current.version, form);
        if (!sameOwner()) return null;
        receive(current, true);
      }
      if (!confirm) { toast.success('Đã lưu bản nháp'); return null; }
      if (current.missingFields.length) { setError('Hồ sơ còn thiếu thông tin. Vui lòng kiểm tra các trường bắt buộc.'); return null; }
      try {
        const result = await service.confirm(id, current.version);
        if (!sameOwner()) return null;
        if (owner) await externalDraftShortcuts.remove(owner, id).catch(() => {});
        return result.projectId;
      } catch (cause) {
        const status = cause instanceof ApiError ? cause.status : undefined;
        if (!status || status >= 500 || [409, 410].includes(status)) {
          reconciledWrite = true;
          const reconciled = await reconcile();
          if (reconciled?.status === 3 && sameOwner()) return reconciled.confirmedProjectId;
        }
        throw cause;
      }
    } catch (cause) {
      if (!sameOwner()) return null;
      const api = cause instanceof ApiError ? cause : null;
      const messages: Record<string, string> = {
        DRAFT_VERSION_CONFLICT: 'Bản nháp đã thay đổi. Nội dung bạn đang sửa được giữ lại. Hãy kiểm tra bản trên hệ thống trước khi lưu tiếp.',
        DRAFT_CONFLICT: 'Bản nháp vừa thay đổi. Vui lòng kiểm tra trạng thái mới.', DRAFT_LOCKED: 'Bản nháp đang xử lý hoặc đã xác nhận. Vui lòng tải lại trạng thái.',
        DRAFT_EXPIRED: 'Bản nháp đã hết hạn. Hãy tạo bản nháp mới.', INVALID_SKILL_IDS: 'Danh mục kỹ năng đã thay đổi. Tải lại danh mục và chọn kỹ năng hợp lệ.',
        INVALID_EVIDENCE_FILES: 'Vui lòng chọn lại minh chứng trong danh sách tài liệu của bản nháp.', SHARING_RIGHTS_REQUIRED: 'Vui lòng xác nhận quyền chia sẻ dự án và tài liệu.',
        INVALID_IMPLEMENTATION_DATE: 'Kiểm tra thời gian thực hiện: dùng YYYY, YYYY-MM hoặc YYYY-MM-DD; không ở tương lai.',
        INVALID_DRAFT_URL: 'Kiểm tra URL mã nguồn và demo: dùng HTTP/HTTPS không chứa thông tin đăng nhập.',
        INVALID_DRAFT_DATA: 'Thông tin chưa đúng định dạng hoặc vượt giới hạn. Vui lòng kiểm tra lại form.',
        DRAFT_INCOMPLETE: 'Hồ sơ còn thiếu trường bắt buộc. Vui lòng kiểm tra và bổ sung.',
      };
      setError(messages[api?.code || ''] || (cause instanceof Error ? cause.message : 'Không thể lưu bản nháp. Vui lòng thử lại.'));
      if (api?.status === 410) { setExpired(true); if (owner) void externalDraftShortcuts.remove(owner, id).catch(() => {}); }
      if (api?.status && [401, 403, 404].includes(api.status)) setUnavailable(true);
      if (api?.status === 404 && owner) void externalDraftShortcuts.remove(owner, id).catch(() => {});
      if (!reconciledWrite && (!api?.status || api.status >= 500 || [409, 410].includes(api.status))) await reconcile();
      return null;
    } finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return { draft: unavailable ? null : draft, form: unavailable ? null : form, edit, loading, busy, error, conflict, serverCopy, expired,
    refresh: () => setRevision(value => value + 1),
    save: () => write(false), confirm: (rights: boolean) => write(true, rights),
    useServerCopy: () => { if (serverCopy) { receive(serverCopy, true); setServerCopy(null); setConflict(false); setError(null); } },
    keepLocalCopy: () => { if (serverCopy && [1, 2].includes(serverCopy.status)) { snapshot.current = serverCopy; setDraft(serverCopy); setServerCopy(null); setConflict(false); } },
  };
}
