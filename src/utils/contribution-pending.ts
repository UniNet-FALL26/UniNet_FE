import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { PendingContribution, ContributionData } from '@/types/contribution';
const key = (scope: string) => 'uninet.contribution.pending.' + scope.replace(/[^a-zA-Z0-9_.-]/g, '_');
export async function readPending(scope: string): Promise<PendingContribution | null> {
  const raw = Platform.OS === 'web' ? window.sessionStorage.getItem(key(scope)) : await SecureStore.getItemAsync(key(scope));
  if (!raw) return null;
  try { const p = JSON.parse(raw) as PendingContribution; if (p.scope === scope && typeof p.kind === 'string') return p; } catch { /* Invalid local metadata cannot authorize a mutation. */ }
  throw new Error('Không đọc được trạng thái yêu cầu trước. Cần kiểm tra server trước khi tiếp tục.');
}
export async function savePending(scope: string, value: PendingContribution | null) {
  if (Platform.OS === 'web') { if (value) window.sessionStorage.setItem(key(scope), JSON.stringify(value)); else window.sessionStorage.removeItem(key(scope)); }
  else if (value) await SecureStore.setItemAsync(key(scope), JSON.stringify(value)); else await SecureStore.deleteItemAsync(key(scope));
}
export function pendingResolved(p: PendingContribution, d: ContributionData) {
  if (p.kind === 'capture') return !!d.workflow.latestGitSnapshotId && d.workflow.latestGitSnapshotId !== p.baselineId;
  if (p.kind === 'openPeer') return !!d.workflow.latestPeerCohortId && d.workflow.latestPeerCohortId !== p.baselineId;
  if (p.kind === 'createRun') return d.run?.requestId === p.requestId;
  if (p.kind === 'closePeer') return d.cohort?.status === 3 && !!d.cohort.snapshotId;
  if (p.kind === 'approvePublish') return !!d.run && d.run.id === p.runId && !!d.run.publishedAt;
  if (p.kind === 'peerRating') return false; // Own readback permits an explicit new edit; never auto-resubmit a rating.
  return !!d.run && d.run.id === p.runId && (d.run.revision > (p.revision ?? -1) || p.kind === 'publish' && !!d.run.publishedAt);
}
