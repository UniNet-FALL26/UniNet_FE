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
  const [now, setNow] = useState(Date.now());
  const coordinator = useRef<{ refresh: () => void; join: () => Promise<void> } | null>(null);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let clockTimer: ReturnType<typeof setTimeout> | undefined;
    let latestData: { detail: VerificationDetail; meeting: MeetingResponse | null } | null = null;
    let refreshPending = false;
    let inFlight = false, denied = false, failures = 0;
    let popup: Window | null = null;
    setSnapshot(null); setError(null); setNotice(null); setBusy(false); setLoading(true);
    const visible = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
      (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    function clearTimer() { if (timer) clearTimeout(timer); }
    function clearClock() { if (clockTimer) clearTimeout(clockTimer); }
    function updateClock() {
      clearClock();
      if (signal.aborted || !visible() || denied) return;
      const time = Date.now();
      setNow(time);
      if (latestData && meetingState(latestData.detail, latestData.meeting, time).waitingSeconds > 0) {
        const remaining = Date.parse(latestData.detail.verification.scheduledStartAt!) - time;
        clockTimer = setTimeout(updateClock, Math.min(1000, remaining));
      }
    }
    function handleError(cause: unknown) {
      if (signal.aborted) return;
      failures++;
      denied = cause instanceof ApiError && [401, 403].includes(cause.status ?? 0);
      // Invalidate every link after an error, including locked/replaced assignments.
      setSnapshot(null);
      setNotice(null);
      latestData = null; clearClock();
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
      latestData = { detail, meeting };
      setSnapshot({ key, detail, meeting }); setError(null); failures = 0;
      updateClock();
      return { detail, meeting };
    }
    function schedule() {
      clearTimer();
      if (!signal.aborted && visible() && !denied && failures < 3 &&
        (!latestData || !meetingState(latestData.detail, latestData.meeting).completed)) {
        timer = setTimeout(() => { void load(); }, 12000);
      }
    }
    function settled() {
      if (signal.aborted) return;
      if (refreshPending && visible() && !denied) { refreshPending = false; void load(); }
      else schedule();
    }
    async function load() {
      if (signal.aborted || !visible() || inFlight || denied) return;
      refreshPending = false;
      clearTimer(); inFlight = true; setLoading(true);
      try { await read(); } catch (cause) { handleError(cause); }
      finally { inFlight = false; if (!signal.aborted) { setLoading(false); settled(); } }
    }
    async function join() {
      if (signal.aborted || denied || inFlight || !visible()) return;
      clearTimer(); inFlight = true; setBusy(true); setNotice(null);
      try {
        if (Platform.OS === 'web') {
          try {
            popup = window.open('about:blank', '_blank');
            if (popup) popup.opener = null;
          } catch { /* A browser can reject window.open instead of returning null. */ }
          if (!popup) throw new Error('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép cửa sổ bật lên và thử lại.');
        }
        const latest = await read();
        if (!latest || signal.aborted) return;
        const detail = latest.detail;
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
          try { popup.location.replace(url); }
          catch { throw new Error('Không thể mở phòng họp trong cửa sổ mới. Vui lòng thử tham gia lại.'); }
          popup = null;
        } else {
          try { await Linking.openURL(url); }
          catch { throw new Error('Không thể mở trình duyệt để vào phòng họp. Vui lòng thử tham gia lại.'); }
        }
        if (!signal.aborted) setNotice('Đã mở phòng họp bên ngoài UniNet. Khi quay lại, hãy kiểm tra trạng thái mới nhất. Rời phòng không kết thúc phiên thẩm định.');
      } catch (cause) {
        handleError(cause);
        // Reconcile conflicts through dossier rather than retrying mutations.
        if (!denied && !signal.aborted) {
          try { await read(); } catch (refreshError) { handleError(refreshError); }
          if (!denied && !signal.aborted && cause instanceof Error) setError(cause.message);
        }
      } finally {
        popup?.close(); popup = null; inFlight = false;
        if (!signal.aborted) { setBusy(false); settled(); }
      }
    }
    const refresh = () => {
      if (!denied) {
        failures = 0;
        if (inFlight) refreshPending = true;
        else void load();
      }
    };
    coordinator.current = { refresh, join };
    void load();
    const foreground = () => { clearTimer(); clearClock(); if (visible()) { updateClock(); refresh(); } };
    const subscription = AppState.addEventListener('change', foreground);
    if (Platform.OS === 'web') { document.addEventListener('visibilitychange', foreground); window.addEventListener('focus', foreground); }
    return () => {
      controller.abort(); clearTimer(); clearClock(); popup?.close(); coordinator.current = null; subscription.remove();
      if (Platform.OS === 'web') { document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', foreground); }
    };
  }, [key, id, accountId]));
  const current = snapshot?.key === key ? snapshot : null;
  return { detail: current?.detail ?? null, meeting: current?.meeting ?? null, loading, busy, error, notice, now,
    refresh: () => coordinator.current?.refresh(), join: () => coordinator.current?.join() };
}
