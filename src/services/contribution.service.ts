import { API_URL } from '@/constants/config';
import { apiRequest, ApiError } from '@/services/api';
import { projectGitService, allGitPages } from '@/services/project-github.service';
import type { Workflow, GitSnapshot, GitReadiness, PeerCohort, PeerSnapshot, OfficialRun, OfficialPage, SnapshotMember, Exclusion, ScoredActivity, RunAudit } from '@/types/contribution';
const root = (id: string) => `${API_URL.endsWith('/api') ? '' : '/api'}/projects/${encodeURIComponent(id)}/contribution/v2`;
const read = <T>(id: string, path: string, signal?: AbortSignal) => apiRequest<T>(root(id) + path, { method: 'GET', signal, feedback: false, cache: 'no-store' });
const write = <T>(id: string, path: string, body: unknown, signal?: AbortSignal, method = 'POST') => apiRequest<T>(root(id) + path, { method, body: JSON.stringify(body), signal, feedback: false });
export const contributionService = {
  adjustment: (id: string, signal?: AbortSignal) => read<import('@/types/contribution').CombinedAdjustment>(id, '/adjustments/latest', signal),
  adjustmentRequest: (id: string, requestId: string, signal?: AbortSignal) => read<import('@/types/contribution').CombinedAdjustment>(id, `/adjustments/by-request/${encodeURIComponent(requestId)}`, signal),
  startAdjustment: (id: string, requestId: string, signal?: AbortSignal) => write<import('@/types/contribution').CombinedAdjustment>(id, '/adjustments', { requestId }, signal),
  adjustmentStep: (id: string, adjustment: string, step: 'git-snapshot' | 'peer-round' | 'run' | 'abandon', signal?: AbortSignal) => write<import('@/types/contribution').CombinedAdjustment>(id, `/adjustments/${encodeURIComponent(adjustment)}/${step}`, {}, signal),
  async workflow(id: string, signal?: AbortSignal) {
    const w = await read<Workflow>(id, '/workflow', signal);
    if (w.contractVersion !== '1' || w.projectId !== id || typeof w.canManage !== 'boolean' || !Array.isArray(w.blockers)) throw new ApiError('Phản hồi Contribution không hợp lệ.'); return w;
  },
  snapshot: (id: string, snapshot: string, signal?: AbortSignal) => read<GitSnapshot>(id, `/snapshots/${encodeURIComponent(snapshot)}`, signal),
  readiness: (id: string, snapshot: string, signal?: AbortSignal) => read<GitReadiness>(id, `/snapshots/${encodeURIComponent(snapshot)}/readiness`, signal),
  cohort: (id: string, cohort: string, signal?: AbortSignal) => read<PeerCohort>(id, `/peer-cohorts/${encodeURIComponent(cohort)}`, signal),
  peerSnapshot: (id: string, snapshot: string, signal?: AbortSignal) => read<PeerSnapshot>(id, `/peer-snapshots/${encodeURIComponent(snapshot)}`, signal),
  run: (id: string, run: string, signal?: AbortSignal) => read<OfficialRun>(id, `/runs/${encodeURIComponent(run)}`, signal),
  capture: (id: string, observationCutoff: string, signal?: AbortSignal) => write<{ snapshotId: string }>(id, '/snapshots', { observationCutoff }, signal),
  openPeer: (id: string, participantIds: string[], signal?: AbortSignal) => write<PeerCohort>(id, '/peer-cohorts', { participantIds }, signal),
  submitPeer: (id: string, cohort: string, target: string, score: number, comment: string | null, expectedRevision: number | null, signal?: AbortSignal) => write<PeerCohort>(id, `/peer-cohorts/${encodeURIComponent(cohort)}/evaluations/${encodeURIComponent(target)}`, { score, comment, expectedRevision }, signal, 'PUT'),
  closePeer: (id: string, cohort: string, signal?: AbortSignal) => write<{ peerSnapshotId: string }>(id, `/peer-cohorts/${encodeURIComponent(cohort)}/close`, {}, signal),
  createRun: (id: string, requestId: string, gitSnapshotId: string, peerSnapshotId: string, signal?: AbortSignal) => write<OfficialRun>(id, '/runs', { requestId, gitSnapshotId, peerSnapshotId }, signal),
  transition: (id: string, run: string, action: string, expectedRevision: number, feedback: string | null, signal?: AbortSignal) => {
    if (!['submit', 'approve', 'reject', 'finalize', 'publish'].includes(action)) throw new Error('Invalid transition');
    return write<OfficialRun>(id, `/runs/${encodeURIComponent(run)}/${action}`, { expectedRevision, feedback }, signal);
  },
  memberships: (id: string, snapshot: string, page: number, signal?: AbortSignal) => read<OfficialPage<SnapshotMember>>(id, `/snapshots/${encodeURIComponent(snapshot)}/memberships?page=${page}&pageSize=20`, signal),
  activities: (id: string, run: string, page: number, signal?: AbortSignal) => read<OfficialPage<ScoredActivity>>(id, `/runs/${encodeURIComponent(run)}/activities?page=${page}&pageSize=20`, signal),
  exclusions: (id: string, run: string, page: number, signal?: AbortSignal) => read<OfficialPage<Exclusion>>(id, `/runs/${encodeURIComponent(run)}/exclusions?page=${page}&pageSize=20`, signal),
  audit: (id: string, run: string, page: number, signal?: AbortSignal) => read<OfficialPage<RunAudit>>(id, `/runs/${encodeURIComponent(run)}/audit?page=${page}&pageSize=20`, signal),
  versionCapabilities: (id: string, signal?: AbortSignal) => read<import('@/types/contribution').VersionCapabilities>(id, '/version-capabilities', signal),
  versions: (id: string, page: number, signal?: AbortSignal) => read<OfficialPage<import('@/types/contribution').PublishedVersion>>(id, `/versions?page=${page}&pageSize=20`, signal),
  approvePublish: (id: string, run: string, expectedRevision: number, expectedPublishedRunId: string | null, reason: string | null, signal?: AbortSignal) => write<OfficialRun>(id, `/runs/${encodeURIComponent(run)}/approve-and-publish`, { expectedRevision, expectedPublishedRunId, reason }, signal),  async captureCutoff(id: string, signal?: AbortSignal) {
    const identities = await allGitPages(p => projectGitService.identities(id, p, signal));
    const histories = await Promise.all(identities.filter(x => x.status === 0).map(x => apiRequest<{ items: { occurredAt: string }[] }>(`${API_URL.endsWith('/api') ? '' : '/api'}/projects/${encodeURIComponent(id)}/git/identities/${encodeURIComponent(x.id)}/history?page=1&pageSize=1`, { signal, feedback: false })));
    const now = Date.now();
    if (histories.some(x => !x.items.length || !Number.isFinite(Date.parse(x.items[0].occurredAt)) || Date.parse(x.items[0].occurredAt) > now)) throw new ApiError('Cần kiểm tra đồng hồ thiết bị và lịch sử xác minh trước khi chốt dữ liệu.', 400, 'CUTOFF_CLOCK_MISMATCH');
    // Server remains authoritative; a future device time is rejected without creating a snapshot.
    return new Date(now).toISOString();
  },
};
