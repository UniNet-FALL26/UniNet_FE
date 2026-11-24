import type { CombinedAdjustment } from '@/types/contribution';

export function adjustmentStage(a: CombinedAdjustment | null) {
  if (a?.state === 'Published') return 6;
  if (a?.runId) return 5;
  if (a?.peerSnapshotId) return 4;
  if (a?.gitSnapshotId) return 3;
  if (a?.state === 'SyncCompleted') return 2;
  return 0;
}

// No old workflow.latest* IDs participate in this state machine.
export function adjustmentNext(a: CombinedAdjustment | null, gitReady: boolean) {
  if (!a?.supported) return 'unavailable';
  if (!a.id) return a.executionAvailable ? 'start' : 'disabled';
  if (a.state === 'Published') return 'published';
  if (a.canRestart) return 'restart';
  if (a.runId) return 'review';
  if (a.peerSnapshotId) return 'run';
  if (a.peerCohortId) return 'peer';
  if (a.gitSnapshotId) return gitReady ? 'peer-round' : 'readiness';
  if (a.blockers.length || a.state === 'Failed') return a.canRestart ? 'restart' : 'blocked';
  if (a.state === 'SyncCompleted' && a.repositories.length && a.repositories.every(r => r.jobStatus === 'Completed' && r.checkpointsComplete)) return 'git-snapshot';
  return 'waiting';
}
