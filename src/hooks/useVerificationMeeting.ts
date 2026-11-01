import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import { projectVerificationService as dossiers } from '@/services/project-verification.service';
import { verificationMeetingService as rooms } from '@/services/verification-meeting.service';
import type { VerificationDetail } from '@/types/project-verification';
import { safeMeetingUrl, type MeetingResponse } from '@/types/verification-meeting';
import { meetingState } from '@/utils/verification-meeting';

export function useVerificationMeeting(id: string) {
  const accountId = useAuthStore().account?.id;
  const key = `${accountId ?? ''}:${id}`;
  const [snapshot, setSnapshot] = useState<{ key: string; detail: VerificationDetail; meeting: MeetingResponse | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const coordinator = useRef<{ refresh: () => void; join: () => Promise<void> } | null>(null);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false, denied = false, failures = 0;
    let popup: Window | null = null;
    setSnapshot(null); setError(null); setNotice(null); setBusy(false); setLoading(true);
    const visible = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
      (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    function clearTimer() { if (timer) clearTimeout(timer); }
    function handleError(cause: unknown) {
      if (signal.aborted) return;
      failures++;
      denied = cause instanceof ApiError && [401, 403].includes(cause.status ?? 0);
      // Invalidate every link after an error, including locked/replaced assignments.
      setSnapshot(null);
      setError(cause instanceof Error ? cause.message : 'Không thể tải phòng họp. Vui lòng thử lại.');
    }
    async function read() {
      if (!accountId) throw new ApiError('Vui lòng đăng nhập lại để xem buổi thẩm định.', 401);
      const detail = await dossiers.detail(id, signal);
      if (signal.aborted) return null;
      if (detail.verification.id.toLowerCase() !== id.toLowerCase()) throw new Error('Phản hồi hồ sơ không khớp.');
      const state = meetingState(detail);
      const meeting = state.canRead && state.assignment ? await rooms.get(state.assignment.id, id, signal) : null;
      if (signal.aborted) return null;
      setSnapshot({ key, detail, meeting }); setError(null); failures = 0;
      return { detail, meeting };
    }
    function schedule(detail?: VerificationDetail) {
      clearTimer();
      if (!signal.aborted && !denied && failures < 3 && (!detail || (detail.verification.status === 0 && !meetingState(detail).result))) {
        timer = setTimeout(() => { void load(); }, 12000);
      }
    }
    async function load() {
      if (signal.aborted || !visible() || inFlight || denied) return;
      clearTimer(); inFlight = true; setLoading(true);
      let detail: VerificationDetail | undefined;
      try { detail = (await read())?.detail; } catch (cause) { handleError(cause); }
      finally { inFlight = false; if (!signal.aborted) { setLoading(false); schedule(detail); } }
    }
    async function join() {
      if (signal.aborted || denied || inFlight || !visible()) return;
      if (Platform.OS === 'web') {
        popup = window.open('about:blank', '_blank');
        if (!popup) { setError('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép cửa sổ bật lên và thử lại.'); return; }
        popup.opener = null;
      }
      clearTimer(); inFlight = true; setBusy(true); setNotice(null);
      let detail: VerificationDetail | undefined;
      try {
        const latest = await read();
        if (!latest || signal.aborted) return;
        detail = latest.detail;
        const state = meetingState(latest.detail, latest.meeting);
        if (!state.canJoin || !state.assignment) throw new Error(state.message);
        let meeting = latest.meeting;
        if (!meeting?.roomName) meeting = await rooms.create(state.assignment.id, id, signal);
        if (signal.aborted) return;
        if (!meetingState(detail, meeting).canJoin) throw new Error('Phiên đã kết thúc hoặc không còn cho phép tham gia.');
        let joined;
        try { joined = await rooms.join(state.assignment.id, id, signal); }
        catch (cause) {
          if (!(cause instanceof ApiError) || cause.code !== 'MEETING_ROOM_REQUIRED' || signal.aborted) throw cause;
          await rooms.create(state.assignment.id, id, signal);
          if (signal.aborted) return;
          joined = await rooms.join(state.assignment.id, id, signal);
        }
        if (signal.aborted) return;
        const url = safeMeetingUrl(joined.joinUrl);
        if (Platform.OS === 'web') {
          if (!popup || popup.closed) throw new Error('Cửa sổ phòng họp đã đóng. Vui lòng thử tham gia lại.');
          popup.location.replace(url); popup = null;
        } else await Linking.openURL(url);
        if (!signal.aborted) setNotice('Đã mở phòng họp bên ngoài UniNet. Khi quay lại, hãy kiểm tra trạng thái mới nhất. Rời phòng không kết thúc phiên thẩm định.');
      } catch (cause) {
        handleError(cause);
        // Reconcile conflicts through dossier rather than retrying mutations.
        if (!denied && !signal.aborted) {
          try { detail = (await read())?.detail; } catch (refreshError) { handleError(refreshError); }
          if (!signal.aborted && cause instanceof Error) setError(cause.message);
        }
      } finally {
        popup?.close(); popup = null; inFlight = false;
        if (!signal.aborted) { setBusy(false); schedule(detail); }
      }
    }
    const refresh = () => { if (!denied) { failures = 0; void load(); } };
    coordinator.current = { refresh, join };
    void load();
    const foreground = () => { clearTimer(); if (visible()) refresh(); };
    const subscription = AppState.addEventListener('change', foreground);
    if (Platform.OS === 'web') { document.addEventListener('visibilitychange', foreground); window.addEventListener('focus', foreground); }
    return () => {
      controller.abort(); clearTimer(); popup?.close(); coordinator.current = null; subscription.remove();
      if (Platform.OS === 'web') { document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', foreground); }
    };
  }, [key, id, accountId]));
  const current = snapshot?.key === key ? snapshot : null;
  return { detail: current?.detail ?? null, meeting: current?.meeting ?? null, loading, busy, error, notice,
    refresh: () => coordinator.current?.refresh(), join: () => coordinator.current?.join() };
}
