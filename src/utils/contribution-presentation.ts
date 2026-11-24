import type { CombinedAdjustment } from '@/types/contribution';

// Presentation only. Mutation guards and authoritative readiness remain in existing services.
export function adjustmentUserStep(a: CombinedAdjustment | null) {
  if (a?.state === 'Published') return 5;
  if (a?.runId) return 4;
  if (a?.peerSnapshotId) return 3;
  if (a?.gitSnapshotId) return 2;
  if (a?.state === 'SyncCompleted') return 1;
  return 0;
}
export const userReasonCodes = (codes: string[]) => [...new Set(codes)].filter(x =>
  !['DiagnosticNotContributionRun', 'RosterAndHistoryFrozenInDiagnosticArtifactOnly'].includes(x));
export const projectRoleLabel = (role: string) => ({ Creator: 'Chủ dự án', Owner: 'Chủ dự án', Member: 'Thành viên', Leader: 'Trưởng nhóm' }[role] ?? role);
export const auditActionLabel = (action: string) => ({ Created: 'Đã tạo bản nháp', Submitted: 'Đã gửi xét duyệt', Approved: 'Đã phê duyệt', Rejected: 'Yêu cầu điều chỉnh', Finalized: 'Đã chốt kết quả', Published: 'Đã công bố', Submit: 'Đã gửi xét duyệt', Approve: 'Đã phê duyệt', Finalize: 'Đã chốt kết quả', Publish: 'Đã công bố' }[action] ?? 'Cập nhật kết quả');
