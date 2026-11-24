import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ApiError } from '@/services/api';
import { contributionService as api } from '@/services/contribution.service';
import { useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { readPending, savePending } from '@/utils/contribution-pending';
import { contributionError, reasonLabel } from '@/utils/contribution';
import { adjustmentNext } from '@/utils/contribution-adjustment';
import { adjustmentUserStep, userReasonCodes } from '@/utils/contribution-presentation';
import { UserDetails } from './UserDetails';
import type { GitRepository, GitSyncState } from '@/types/project-github';
import type { CombinedAdjustment as Adjustment, GitReadiness } from '@/types/contribution';
import { HubAction, HubModal, hubColors as c } from '../hub/ProjectHubUI';
import { contributionStyles as s } from './styles';

const labels: Record<string, string> = { start: 'Đồng bộ GitHub', 'git-snapshot': 'Chốt dữ liệu GitHub mới', 'peer-round': 'Mở vòng đánh giá mới', run: 'Tính điểm mới', abandon: 'Dừng lần đồng bộ bị chặn' };
const jobLabels: Record<string, string> = { Pending: 'Đã xếp hàng', Running: 'Đang đồng bộ', RetryScheduled: 'Đang chờ thử lại', Completed: 'Hoàn tất', Failed: 'Thất bại', Paused: 'Tạm dừng', Cancelled: 'Đã hủy' };
export function CombinedAdjustment({ projectId, accountId, repositories, sync, loadedPeerId, loadedRunId, onPeer, onResult, onChanged }: { projectId: string; accountId: string; repositories: GitRepository[]; sync: GitSyncState[]; loadedPeerId?: string; loadedRunId?: string; onPeer: () => void; onResult: () => void; onChanged: () => void }) {
  const [a, setA] = useState<Adjustment | null>(null), [git, setGit] = useState<GitReadiness | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [ready, setReady] = useState(false);
  const scope = `combined:${accountId}:${projectId}`, alive = useRef(true), locked = useRef(false), controller = useRef<AbortController | null>(null);
  const request = useRef<string | null>(null), pollId = useRef<string | null>(null);
  useEffect(() => {
    alive.current = true;
    void readPending(scope).then(p => { if (alive.current) { request.current = p?.requestId ?? null; setReady(true); } }).catch(() => { if (alive.current) setError('Không đọc được yêu cầu trước. Không gửi lại đồng bộ; cần đối chiếu server.'); });
    return () => { alive.current = false; controller.current?.abort(); };
  }, [scope]);
  const refresh = useGitHubRevalidation(scope, projectId, async signal => {
    try {
      const row = await (request.current ? api.adjustmentRequest(projectId, request.current, signal) : api.adjustment(projectId, signal)).catch(cause => {
        if (cause instanceof ApiError && cause.status === 404) return { supported: false, executionAvailable: false, id: null, projectId, state: 'Unavailable', revision: 0, repositories: [], blockers: [], gitSnapshotId: null } as unknown as Adjustment;
        throw cause;
      });
      if (row.projectId !== projectId || request.current && row.id && row.requestId !== request.current || !Array.isArray(row.repositories) || !Array.isArray(row.blockers)) throw new Error('Adjustment scope mismatch');
      const readiness = row.gitSnapshotId ? await api.readiness(projectId, row.gitSnapshotId, signal) : null;
      if (readiness && readiness.snapshotId !== row.gitSnapshotId) throw new Error('Snapshot mismatch');
      if (signal.aborted) return false;
      setA(row); setGit(readiness); setError('');
      return row.state !== 'Syncing';
    } catch (cause) { if (!signal.aborted) { setError(contributionError(cause)); if (cause instanceof ApiError && [401, 403].includes(cause.status ?? 0)) { setA(null); setGit(null); } } throw cause; }
  }, ready && !busy);
  // One bounded polling window per durable attempt. Focus and explicit checks remain available.
  useEffect(() => { if (a?.id && a.state === 'Syncing' && pollId.current !== a.id && !busy) { pollId.current = a.id; refresh.wait(); } }, [a?.id, a?.state, busy, refresh]);
  const next = adjustmentNext(a, git?.gitState === 'Ready');
  const action = (next === 'blocked' || next === 'readiness') && !a?.peerCohortId && !a?.runId ? 'abandon' : next;
  async function execute() {
    if (!a || locked.current || !ready || error || !labels[action]) return;
    locked.current = true; setBusy(true); setConfirm(false); setError('');
    const ctrl = new AbortController(); controller.current = ctrl; const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      let result: Adjustment;
      if (action === 'start') {
        request.current ??= randomUUID();
        await savePending(scope, { scope, kind: 'combinedStart', requestId: request.current, baselineId: null, at: new Date().toISOString() });
        result = await api.startAdjustment(projectId, request.current, ctrl.signal);
      } else result = await api.adjustmentStep(projectId, a.id!, action as 'git-snapshot' | 'peer-round' | 'run' | 'abandon', ctrl.signal);
      if (result.projectId !== projectId || !result.id || next !== 'start' && a.id && result.id !== a.id) throw new Error('Adjustment scope mismatch');
      if (!ctrl.signal.aborted && alive.current) { setA(result); onChanged(); }
    } catch (cause) { if (alive.current) setError(contributionError(cause)); }
    finally { clearTimeout(timer); controller.current = null; locked.current = false; if (alive.current) setBusy(false); }
  }
  const stage = adjustmentUserStep(a);
  return <View style={{ gap: 12 }}>
    <Text style={s.heading}>Cập nhật đóng góp</Text>
    <Text style={s.copy}>Cập nhật dữ liệu GitHub, đánh giá thành viên và xem trước kết quả mới.</Text>
    <Text style={s.success}>Điểm hiện tại không thay đổi cho đến khi bạn công bố phiên bản mới.</Text>
    <View style={{ gap: 4 }} accessibilityLabel="Tiến trình cập nhật đóng góp">
      {['Đồng bộ GitHub', 'Chốt dữ liệu Git', 'Đánh giá thành viên', 'Xem trước điểm mới', 'Duyệt và công bố'].map((label, i) => <View key={label} style={s.step}>
        <View style={[s.stepMarker, { backgroundColor: stage > i ? c.primary : c.canvas }]}><Text style={{ color: stage > i ? c.surface : c.textSecondary, fontWeight: '600' }}>{stage > i ? '✓' : i + 1}</Text></View>
        <View style={{ flex: 1 }}><Text style={[s.copy, { color: stage === i ? c.ink : c.textSecondary, fontWeight: stage === i ? '600' : '400' }]}>{label}</Text>
          {stage === i && <Text style={s.small}>{!a?.id ? 'Chưa bắt đầu' : a?.state === 'Failed' || next === 'readiness' ? 'Cần xử lý' : 'Đang thực hiện'}</Text>}
        </View>
      </View>)}
    </View>
    {!a && !error && <ActivityIndicator />}
    {!a?.id && repositories.map(r => <View key={r.id} style={s.item}><Text style={s.heading}>{r.repository.fullName}</Text><Text style={s.copy}>{r.accessStatus === 1 ? 'Quyền truy cập đã xác minh' : 'Cần xác minh quyền truy cập'} · {r.syncPaused ? 'Đồng bộ tạm dừng' : 'Đồng bộ không bị tạm dừng'}</Text><Text style={s.small}>{sync.find(x => x.projectGitRepositoryId === r.id)?.lastSuccessfulSyncAt ? `Lần đồng bộ thành công trước: ${new Date(sync.find(x => x.projectGitRepositoryId === r.id)!.lastSuccessfulSyncAt!).toLocaleString('vi-VN')}.` : 'Chưa có lần đồng bộ mới.'}</Text></View>)}
    {a?.repositories.map(r => <View key={r.associationId} style={s.item}>
      <Text style={s.heading}>{r.repositoryName}</Text><Text style={s.copy}>{jobLabels[r.jobStatus] ?? 'Cần kiểm tra'}{r.errorCode ? ` · ${reasonLabel(r.errorCode)}` : ''}</Text>
    </View>)}
    {next === 'git-snapshot' && <Text style={s.copy}>Đã đồng bộ các repository. Bạn có thể chốt dữ liệu để kiểm tra khả năng tính điểm.</Text>}
    {a?.state === 'SyncCompleted' && a.repositories.every(r => r.newVersionCount === 0) && <Text style={s.small}>Không có thay đổi trong dữ liệu đã thu thập. Việc đánh giá lại thành viên vẫn có thể thay đổi tổng đóng góp.</Text>}
    {a?.eligibleChangeState === 'NoEligibleChanges' && <Text style={s.copy}>Đã đồng bộ. Không có thay đổi trong hoạt động đủ điều kiện tính điểm.</Text>}
    {a?.eligibleChangeState === 'EligibleActivitiesChanged' && <Text style={s.copy}>Có hoạt động đủ điều kiện mới hoặc thay đổi. Hãy kiểm tra kết quả trước khi công bố.</Text>}
    {git && <Text style={s.copy}>{git.gitState === 'Ready' ? 'Dữ liệu GitHub đã sẵn sàng.' : 'Dữ liệu GitHub cần xử lý trước khi tính điểm.'}</Text>}
    {git && userReasonCodes(git.limitations).length > 0 && <UserDetails title="Lưu ý về dữ liệu GitHub">{userReasonCodes(git.limitations).map(x => <Text key={x} style={s.small}>{reasonLabel(x)}</Text>)}</UserDetails>}
    {a?.blockers.map(x => <Text key={x} style={s.error}>{reasonLabel(x)}</Text>)}
    {next === 'disabled' && <Text style={s.copy}>Đồng bộ hiện chưa khả dụng. Vui lòng liên hệ quản trị viên để tiếp tục.</Text>}
    {next === 'unavailable' && a && <Text style={s.copy}>Tính năng cập nhật chưa khả dụng. Điểm đã công bố vẫn được giữ nguyên.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {refresh.state === 'timeout' && <Text style={s.copy}>Đã dừng chờ tự động. Yêu cầu có thể vẫn đang xử lý; hãy kiểm tra trạng thái trước khi tiếp tục.</Text>}
    {labels[action] && <HubAction title={labels[action]} variant="primary" disabled={busy || !!error || !ready} onPress={() => setConfirm(true)} />}
    {next === 'peer' && <><Text style={s.copy}>Mỗi thành viên tự đánh giá những người còn lại. Khi đủ đánh giá, chủ dự án có thể kết thúc vòng này.</Text><HubAction title="Mở đánh giá thành viên" disabled={loadedPeerId !== a?.peerCohortId} onPress={onPeer} /></>}
    {['published', 'restart'].includes(next) && <HubAction title="Bắt đầu lần cập nhật tiếp theo" onPress={() => { request.current = null; void savePending(scope, null).then(() => { if (alive.current) setA({ ...a!, id: null, state: 'NotStarted' }); }); }} />}
    {next === 'review' && <HubAction title="Xem bản nháp và duyệt công bố" disabled={loadedRunId !== a?.runId} onPress={onResult} />}
    <HubAction title="Kiểm tra trạng thái lần điều chỉnh" disabled={busy} onPress={() => void refresh.check()} />
    <UserDetails title="Phạm vi dữ liệu tính điểm"><Text style={s.small}>Hoạt động GitHub được kiểm tra theo chính sách thời gian và quyền sở hữu hiện hành. Hoạt động sau ngày hoàn thành có thể được tính; hãy xem kỹ kết quả trước khi công bố.</Text></UserDetails>
    {confirm && <HubModal title={labels[action] ?? 'Xác nhận'} wide={false} onClose={() => setConfirm(false)} footer={<><HubAction title="Hủy" onPress={() => setConfirm(false)} /><HubAction title="Xác nhận" variant="primary" disabled={busy || !!error} onPress={() => void execute()} /></>}><Text style={s.copy}>Xác nhận tiếp tục bước này. Dữ liệu đã chốt sẽ được giữ nguyên; điểm hiện tại chỉ thay đổi sau khi bạn duyệt và công bố.</Text></HubModal>}
  </View>;
}
