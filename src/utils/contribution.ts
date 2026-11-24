import type { ContributionData, ContributionAction, PeerCohort, PeerRating } from '@/types/contribution';
export const runLabel = (state?: string | null) => ({ Draft: 'Bản nháp', Review: 'Đang xét duyệt', Approved: 'Đã phê duyệt', Rejected: 'Cần chỉnh sửa', Finalized: 'Đã chốt kết quả', Published: 'Đã công bố' }[state ?? ''] ?? 'Chưa có kết quả');
export const peerLabel = (status?: number) => ['Chưa gửi đánh giá', 'Đang đánh giá', 'Đủ đánh giá để kết thúc', 'Đã đóng đánh giá'][status ?? -1] ?? 'Chưa bắt đầu';
export const readinessLabel = (state?: string) => ({ Ready: 'Sẵn sàng', Incomplete: 'Chưa đủ dữ liệu', InsufficientData: 'Chưa đủ căn cứ tính toán', NotApplicable: 'Không áp dụng', Complete: 'Đầy đủ', EligibleForExperimentalMvp: 'Đủ điều kiện theo chính sách', Unsupported: 'Chưa được hỗ trợ', Corrupt: 'Không xác minh được dữ liệu' }[state ?? ''] ?? 'Chưa kiểm tra');
export const categoryLabel = (s: string) => ({ Commit: 'Commit', PR: 'Pull Request', Review: 'Review', Issue: 'Issue', commits: 'Commit', 'pull-requests': 'Pull Request', 'pull-request-reviews': 'Review', issues: 'Issue', 'issue-events': 'Sự kiện Issue', 'issue-comments': 'Bình luận Issue' }[s] ?? 'Dữ liệu bổ trợ');
export function canClosePeer(c: PeerCohort | null) { return !!c && c.status === 2 && c.submittedCount === c.requiredCount; }
export function validPeer(self: string, target: string, score: number, closed: boolean) { return !!self && !!target && self !== target && !closed && Number.isInteger(score) && score >= 1 && score <= 5; }
export function ownRatings(c: Pick<PeerCohort, 'ratings'>, self: string): PeerRating[] { return c.ratings.filter(x => x.evaluatorId === self); }
export function contributionNext(d: ContributionData, manage: boolean, self: string): { kind: ContributionAction; label: string } {
  if (d.workflow.mode !== 'OfficialV2') return { kind: 'blocked', label: 'Dự án chưa sử dụng quy trình này' };
  if (!manage) {
    if (d.published) return { kind: 'result', label: 'Xem kết quả cá nhân' };
    if (d.cohort && d.cohort.status !== 3 && d.cohort.participantIds.includes(self)) return { kind: 'peer', label: ownRatings(d.cohort, self).length ? 'Tiếp tục đánh giá' : 'Đánh giá thành viên' };
    return { kind: 'wait', label: 'Chờ chủ dự án chuẩn bị bước tiếp theo' };
  }
  if (!d.workflow.projectCompleted) return { kind: 'complete', label: 'Hoàn thành dự án' };
  if (d.workflow.blockers.length) return { kind: 'blocked', label: 'Cần xử lý điều kiện dự án trước khi tiếp tục' };
  if (d.adjustment?.id && d.adjustment.state === 'PeerOpen' && !d.adjustment.runId && d.adjustment.peerCohortId === d.cohort?.id && canClosePeer(d.cohort))
    return { kind: 'closePeer', label: 'Kết thúc đánh giá' };
  if (d.run && !['Draft','Rejected','Review','Approved','Finalized','Published'].includes(d.run.state)) return { kind: 'blocked', label: 'Cần kiểm tra trạng thái kết quả' };
  const replacement = !!d.run && ((!!d.cohort && d.cohort.snapshotId !== d.run.calculation?.peerSnapshotId) || (!!d.peer && d.run.calculation?.peerSnapshotId !== d.peer.snapshotId) || (!!d.snapshot && d.run.calculation?.gitEvidenceSnapshotId !== d.snapshot.snapshotId));
  if (d.capabilities?.supported) {

    if (replacement) {
      if (d.readiness?.gitState !== 'Ready') return { kind: 'git', label: 'Xem dữ liệu cần kiểm tra' };
      if (d.cohort && d.cohort.status !== 3) return canClosePeer(d.cohort) ? { kind: 'closePeer', label: 'Kết thúc đánh giá' } : { kind: 'peer', label: 'Xem tiến độ đánh giá' };
      if (d.peer?.state === 'Ready' || d.peer?.state === 'NotApplicable') return { kind: 'createRun', label: 'Tạo kết quả Contribution' };
    }
    if (d.run && d.run.state !== 'Published') return { kind: 'approvePublish', label: 'Duyệt và công bố' };
    if (d.workflow.publishedRunId || d.run?.state === 'Published') return { kind: 'adjust', label: 'Điều chỉnh Contribution' };
  } else if (d.run && d.run.state !== 'Published') return { kind: 'blocked', label: 'Cần triển khai hỗ trợ duyệt và công bố trước khi tiếp tục' };
  if (d.workflow.publishedRunId || d.run?.state === 'Published') return { kind: 'result', label: 'Xem kết quả' };
  if (d.run) { const kind = ({ Draft: 'submit', Rejected: 'submit', Review: 'approve', Approved: 'finalize', Finalized: 'publish' } as const)[d.run.state]; return kind ? { kind, label: ({ submit: 'Gửi xét duyệt', approve: 'Phê duyệt kết quả', finalize: 'Chốt kết quả', publish: 'Công bố điểm' })[kind] } : { kind: 'blocked', label: 'Cần kiểm tra trạng thái kết quả' }; }
  if (!d.snapshot) return { kind: 'capture', label: 'Chốt dữ liệu GitHub' };
  if (d.readiness?.gitState !== 'Ready') return { kind: 'git', label: 'Xem dữ liệu cần kiểm tra' };
  if (!d.cohort) return { kind: 'openPeer', label: 'Bắt đầu đánh giá thành viên' };
  if (canClosePeer(d.cohort)) return { kind: 'closePeer', label: 'Kết thúc đánh giá' };
  if (d.cohort.status !== 3) return { kind: 'peer', label: 'Xem tiến độ đánh giá' };
  if (d.peer?.state !== 'Ready' && d.peer?.state !== 'NotApplicable') return { kind: 'peer', label: 'Xem dữ liệu đánh giá' };
  return { kind: 'createRun', label: 'Tạo kết quả Contribution' };
}
export function contributionLabel(d: ContributionData) {
  if (d.workflow.publishedRunId) return 'Đã công bố';
  if (d.run?.state === 'Finalized') return 'Đã chốt kết quả';
  if (d.run) return d.run.state === 'Review' || d.run.state === 'Approved' ? 'Đang xét duyệt' : 'Chờ tổng kết';
  if (d.cohort && d.cohort.status !== 3) return 'Đang đánh giá';
  return d.workflow.projectCompleted ? 'Chờ tổng kết' : 'Chưa bắt đầu';
}
const reasons: Record<string, string> = {
  ADJUSTMENT_EXECUTION_DISABLED: 'Đồng bộ hiện chưa khả dụng. Vui lòng liên hệ quản trị viên.',
  ADJUSTMENT_SCHEMA_REQUIRED: 'Tính năng cập nhật hiện chưa khả dụng.',
  ADJUSTMENT_AUTHORIZATION_REQUIRED: 'Repository cần được khôi phục và xác minh quyền GitHub App.',
  ADJUSTMENT_CHECKPOINTS_INCOMPLETE: 'Dữ liệu đồng bộ chưa được xác nhận đầy đủ.',
  ADJUSTMENT_SYNC_FAILED: 'Một repository đồng bộ thất bại hoặc bị tạm dừng. Chưa được chốt Git.',
  ADJUSTMENT_DEADLINE_EXCEEDED: 'Đã hết thời gian xử lý của lần điều chỉnh. Kiểm tra job và recovery.',
  ADJUSTMENT_SYNC_NOT_COMPLETE: 'Hãy đợi tất cả repository hoàn tất đồng bộ trước.',
  ADJUSTMENT_NEWER_SYNC: 'Có lần đồng bộ khác sau yêu cầu này. Cần kết thúc và tạo lần điều chỉnh mới.',
  ADJUSTMENT_SYNC_UNRESOLVED: 'Dự án còn yêu cầu đồng bộ chưa kết thúc.',
  ADJUSTMENT_SCOPE_CHANGED: 'Danh sách repository liên kết đã thay đổi. Không trộn hai lần điều chỉnh.',
  ADJUSTMENT_ACTIVE: 'Dự án đang có một lần điều chỉnh chưa kết thúc.',
  ADJUSTMENT_CONFLICT: 'Trạng thái vừa thay đổi. Hãy kiểm tra trạng thái trước khi thử lại.',
  ADJUSTMENT_LEASE_ACTIVE: 'Đồng bộ vẫn đang xử lý. Vui lòng chờ trước khi kết thúc lần cập nhật.',
  ADJUSTMENT_ABANDONED: 'Chủ dự án đã dừng lần điều chỉnh trước khi chốt Git.',

  OFFICIAL_VERSION_SCHEMA_REQUIRED: 'Tính năng công bố hiện chưa khả dụng.', OFFICIAL_PUBLICATION_CHANGED: 'Phiên bản hiện hành đã thay đổi. Hãy tải lại trước khi duyệt.', OFFICIAL_PEER_ROUND_ACTIVE: 'Vui lòng hoàn tất vòng đánh giá đang mở trước.',
  CUTOFF_CLOCK_MISMATCH: 'Cần kiểm tra đồng hồ thiết bị và lịch sử xác minh trước khi chốt dữ liệu.', DiagnosticNotContributionRun: 'Đây là kiểm tra dữ liệu, chưa phải kết quả Contribution.', RosterAndHistoryFrozenInDiagnosticArtifactOnly: 'Roster và lịch sử attribution sẽ được đóng băng cùng đầu vào Run.',
  ProjectNotCompleted: 'Cần hoàn thành dự án trước khi chốt dữ liệu.', HistoricalWorkflowSelectionRequired: 'Dự án cần chọn quy trình Contribution được hỗ trợ.', AuthorizedRepositoryRequired: 'Cần repository đã được cấp quyền.', VerifiedGitIdentityRequired: 'Cần ít nhất một Git identity đã xác minh.', OFFICIAL_PROJECT_NOT_COMPLETED: 'Dự án chưa hoàn thành.', OFFICIAL_CALCULATION_NOT_READY: 'Dữ liệu Git hoặc đánh giá thành viên chưa đủ điều kiện.', OFFICIAL_PEER_INTEGRITY: 'Không xác minh được dữ liệu đánh giá đã đóng.', FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.', PEER_REVISION_CONFLICT: 'Đánh giá vừa thay đổi. Đã tải lại bản mới; hãy kiểm tra trước khi gửi.', OFFICIAL_REVISION_CONFLICT: 'Kết quả vừa thay đổi. Hãy kiểm tra bản mới trước khi tiếp tục.', PEER_COHORT_CLOSED: 'Đợt đánh giá đã đóng, không thể chỉnh sửa.', PEER_SELF_REVIEW_FORBIDDEN: 'Không thể tự đánh giá chính mình.', CONTRIBUTION_PEER_EVALUATIONS_INCOMPLETE: 'Mỗi thành viên cần đánh giá tất cả những người còn lại.', OFFICIAL_ROSTER_MISMATCH: 'Danh sách thành viên đã thay đổi, cần kiểm tra lại roster.', OFFICIAL_WORKFLOW_NOT_ENABLED: 'Dự án chưa sử dụng quy trình Official V2.', EvidenceCoverageIncomplete: 'Phạm vi dữ liệu chưa được xác minh đầy đủ.', PartialPatchOverlapNotSupportedInExperimentalV1: 'Chưa hỗ trợ phân bổ phần nội dung Git trùng một phần.', HistoricalForcePushNotProven: 'Chưa xác minh được toàn bộ lịch sử force-push.', EmptyCategoryCoverageNotFrozen: 'Chưa có bằng chứng đã đóng băng cho loại hoạt động không có dữ liệu.', VerifiedEmptyReviewCoverage: 'Đã xác minh không có Review trong phạm vi thu thập.', IncompleteSourceEvidence: 'Một phần dữ liệu nguồn còn thiếu.', SomeRepositoryEvidenceRestricted: 'Một phần dữ liệu repository không được phép truy cập.', AlreadyRepresentedByPullRequest: 'Commit đã được đại diện bởi Pull Request.', DuplicateObservation: 'Lần quan sát lặp đã được loại khỏi tính điểm.', PureMergeCommit: 'Merge commit không có nội dung độc lập.', IssueIsPullRequest: 'Mục này là Pull Request, không tính như Issue.', PullRequestActivityExcludedFromIssue: 'Hoạt động của Pull Request không tính thành Issue.'
};
export function reasonLabel(code: string) { return reasons[code] ?? 'Dữ liệu cần được kiểm tra theo chính sách hiện tại. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.'; }
export function contributionError(cause: unknown) { const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''; return reasons[code] ?? 'Không thể hoàn tất yêu cầu. Hãy kiểm tra trạng thái rồi thử lại khi phù hợp.'; }
