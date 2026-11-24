import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { ApiError } from '@/services/api';
import { contributionService as api } from '@/services/contribution.service';
import { allGitPages, projectGitService as git } from '@/services/project-github.service';
import { notifyGitHubChanged, useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { readPending, savePending, pendingResolved } from '@/utils/contribution-pending';
import { contributionError } from '@/utils/contribution';
import type { ContributionData, PendingContribution } from '@/types/contribution';
import type { HubProject } from '@/types/project-hub';
import type { GitRepository, GitSyncState } from '@/types/project-github';
export function useContribution(project: HubProject, accountId: string, profileId: string) {
  const scope = `${accountId}:${project.id}`;
  const [data, setData] = useState<ContributionData | null>(null), [repos, setRepos] = useState<GitRepository[]>([]), [sync, setSync] = useState<GitSyncState[]>([]);
  const [error, setError] = useState(''), [mutationError, setMutationError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [pending, setPending] = useState<PendingContribution | null>(null);
  const journal = useRef<PendingContribution | null>(null), locked = useRef(false), alive = useRef(true), mutation = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    void readPending(scope).then(value => { if (alive.current) { journal.current = value; setPending(value); setReady(true); } }).catch(() => { if (alive.current) { const unknown: PendingContribution = { scope, kind: 'unknown', baselineId: null, at: new Date().toISOString() }; journal.current = unknown; setPending(unknown); setReady(true); setError('Không đọc được trạng thái yêu cầu trước. Chỉ được kiểm tra trạng thái server.'); } });
    return () => { alive.current = false; mutation.current?.abort(); };
  }, [scope]);
  const read = async (signal: AbortSignal) => {
    try {
      const workflow = await api.workflow(project.id, signal);
      const manage = workflow.canManage && project.isOwner && profileId === project.creator.id;
      const next: ContributionData = { workflow, snapshot: null, readiness: null, cohort: null, peer: null, run: null, published: null };
      if (workflow.mode === 'OfficialV2') {
        if (manage) next.capabilities = await api.versionCapabilities(project.id, signal).catch(cause => { if (cause instanceof ApiError && (cause.status === 404 || cause.status === 503)) return { supported: false, canAdjust: false, canOpenPeerRound: false, currentPublishedRunId: null }; throw cause; });
        if (manage) {
          next.adjustment = await api.adjustment(project.id, signal).catch(cause => { if (cause instanceof ApiError && [404, 503].includes(cause.status ?? 0)) return null; throw cause; });
          if (next.adjustment && next.adjustment.projectId !== project.id) throw new Error('Adjustment scope mismatch');
          if (next.adjustment?.id && !['Published', 'Failed'].includes(next.adjustment.state)) {
            workflow.latestGitSnapshotId = next.adjustment.gitSnapshotId;
            workflow.latestPeerCohortId = next.adjustment.peerCohortId;
            workflow.latestPeerSnapshotId = next.adjustment.peerSnapshotId;
            workflow.latestRunId = next.adjustment.runId;
          }
        }
        if (manage && workflow.latestGitSnapshotId) {
          [next.snapshot, next.readiness] = await Promise.all([api.snapshot(project.id, workflow.latestGitSnapshotId, signal), api.readiness(project.id, workflow.latestGitSnapshotId, signal)]);
          if (next.snapshot.projectId !== project.id || next.snapshot.snapshotId !== workflow.latestGitSnapshotId || next.readiness.snapshotId !== workflow.latestGitSnapshotId) throw new Error('Snapshot scope mismatch');
        }
        if (workflow.latestPeerCohortId) {
          next.cohort = await api.cohort(project.id, workflow.latestPeerCohortId, signal);
          if (next.cohort.projectId !== project.id || next.cohort.id !== workflow.latestPeerCohortId || !Array.isArray(next.cohort.ratings) || !Array.isArray(next.cohort.participantIds)) throw new Error('Peer scope mismatch');
          // Defensive privacy: forms never consume another evaluator's ratings, even for Creator.
          next.cohort = { id: next.cohort.id, projectId: next.cohort.projectId, status: next.cohort.status, participantIds: next.cohort.participantIds, submittedCount: next.cohort.submittedCount, requiredCount: next.cohort.requiredCount, snapshotId: next.cohort.snapshotId, ratings: next.cohort.ratings.filter(x => x.evaluatorId === profileId) };
        }
        if (manage && workflow.latestPeerSnapshotId) {
          next.peer = await api.peerSnapshot(project.id, workflow.latestPeerSnapshotId, signal);
          if (next.peer.snapshotId !== workflow.latestPeerSnapshotId || next.peer.cohortId !== next.cohort?.id) throw new Error('Peer snapshot mismatch');
        }
        if (manage && workflow.latestRunId) {
          next.run = await api.run(project.id, workflow.latestRunId, signal);
          if (next.run.projectId !== project.id || next.run.calculation.projectId !== project.id || next.run.id !== workflow.latestRunId || !Number.isInteger(next.run.revision)) throw new Error('Run scope mismatch');
        }
        if (manage && workflow.publishedRunId) {
          next.publishedRun = next.run?.id === workflow.publishedRunId ? next.run : await api.run(project.id, workflow.publishedRunId, signal);
          if (next.publishedRun.projectId !== project.id || next.publishedRun.id !== workflow.publishedRunId || !next.publishedRun.publishedAt) throw new Error('Current publication scope mismatch');
        }
        if (workflow.publishedRunId) {
          next.published = await git.myContribution(project.id, signal);
          if (next.published.projectId !== project.id || next.published.userId !== profileId || !next.published.publishedAt) throw new Error('Published scope mismatch');
        }
      }
      const [repositories, statuses] = await Promise.all([allGitPages(p => git.repositories(project.id, p, signal)), git.syncStatus(project.id, signal)]);
      if (repositories.some(r => r.projectId !== project.id)) throw new Error('Repository scope mismatch');
      if (signal.aborted) return false;
      const p = journal.current;
      if (p && pendingResolved(p, next)) { await savePending(scope, null); if (signal.aborted) return false; journal.current = null; setPending(null); setMutationError(''); setNotice('Đã xác nhận yêu cầu trước.'); }
      setData(next); setRepos(repositories.filter(r => !r.unlinkedAt)); setSync(statuses.items); setError(''); return true;
    } catch (cause) {
      if (!signal.aborted) { setError(contributionError(cause)); if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) { setData(null); setRepos([]); setSync([]); } } throw cause;
    }
  };
  const refresh = useGitHubRevalidation(scope + ':' + project.status, project.id, read, ready && !busy);
  async function perform(kind: string, body?: { roster?: string[]; target?: string; score?: number; comment?: string | null; revision?: number | null; feedback?: string }) {
    if (!data || locked.current || error || !ready || !alive.current) return false;
    const manage = data.workflow.canManage && project.isOwner && profileId === project.creator.id;
    if (kind !== 'peerRating' && !manage) return false;
    if (journal.current && !(kind === 'createRun' && journal.current.kind === 'createRun')) return false;
    locked.current = true; setBusy(true); setMutationError(''); setNotice('');
    let reused = false;
    const ctrl = new AbortController(); mutation.current = ctrl; const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const cutoff = kind === 'capture' ? await api.captureCutoff(project.id, ctrl.signal) : null;
      if (!alive.current || ctrl.signal.aborted) return false;
      const p: PendingContribution = journal.current ?? { scope, kind, at: new Date().toISOString(), baselineId: kind === 'capture' ? data.workflow.latestGitSnapshotId : kind === 'openPeer' ? data.workflow.latestPeerCohortId : data.workflow.latestRunId,
        ...(kind === 'createRun' ? { requestId: randomUUID(), gitSnapshotId: data.snapshot!.snapshotId, peerSnapshotId: data.peer!.snapshotId } : {}), ...(data.run ? { runId: data.run.id, revision: data.run.revision } : {}) };
      if (kind !== 'peerRating') { await savePending(scope, p); journal.current = p; if (alive.current) setPending(p); }
      if (!alive.current || ctrl.signal.aborted) return false;
      if (kind === 'capture') await api.capture(project.id, cutoff!, ctrl.signal);
      else if (kind === 'openPeer') await api.openPeer(project.id, body!.roster!, ctrl.signal);
      else if (kind === 'closePeer') await api.closePeer(project.id, data.cohort!.id, ctrl.signal);
      else if (kind === 'peerRating') await api.submitPeer(project.id, data.cohort!.id, body!.target!, body!.score!, body?.comment ?? null, body?.revision ?? null, ctrl.signal);
      else if (kind === 'approvePublish') await api.approvePublish(project.id, data.run!.id, data.run!.revision, data.workflow.publishedRunId, body?.feedback?.trim() || null, ctrl.signal);
      else if (kind === 'createRun') { const result = await api.createRun(project.id, p.requestId!, p.gitSnapshotId ?? data.snapshot!.snapshotId, p.peerSnapshotId ?? data.peer!.snapshotId, ctrl.signal); reused = !!result.reusedInputs; }
      else await api.transition(project.id, data.run!.id, kind, data.run!.revision, body?.feedback?.trim() || null, ctrl.signal);
      if (kind === 'approvePublish') notifyGitHubChanged(project.id);
      await savePending(scope, null); journal.current = null;
      if (alive.current) { setPending(null); setData(null); setNotice(reused ? 'Đầu vào và chính sách không thay đổi. Đã giữ nguyên kết quả có sẵn, không tạo phiên bản mới.' : kind === 'peerRating' ? 'Đã lưu đánh giá của bạn.' : 'Đã hoàn tất. Đang cập nhật thông tin.'); } return true;
    } catch (cause) {
      const definitive = cause instanceof ApiError && !!cause.status && cause.status >= 400 && cause.status < 500 && cause.status !== 408;
      if (definitive) { await savePending(scope, null); journal.current = null; }
      if (alive.current) { if (definitive) setPending(null); setMutationError(contributionError(cause)); if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) setData(null); }
      return false;
    } finally { clearTimeout(timer); mutation.current = null; locked.current = false; if (alive.current) setBusy(false); }
  }
  return { data, repos, sync, error: error || (refresh.state === 'timeout' ? 'Yêu cầu quá thời gian. Chưa thể xác nhận trạng thái mới nhất.' : ''), mutationError, notice, busy, pending, ready, refresh: refresh.check, perform };
}
