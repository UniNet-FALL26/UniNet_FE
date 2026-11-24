import type { GitRepository, GitSyncState } from '@/types/project-github';

export function githubLinkStatus(repo: GitRepository, sync: GitSyncState | undefined, unavailable = false) {
  if (unavailable) return { link: 'Không thể kiểm tra trạng thái', authorization: 'Thông tin gần nhất được giữ lại; vui lòng thử lại.', sync: 'Chưa thể kiểm tra đồng bộ', warning: true };
  if (repo.unlinkedAt) return { link: 'Đã ngắt liên kết', authorization: 'Lịch sử vẫn được giữ lại', sync: 'Không đồng bộ qua liên kết này', warning: false };
  const unknown = repo.syncReadiness === 'VerificationPending';
  const authorization = repo.accessStatus === 2 ? 'Mất quyền truy cập GitHub' : unknown ? 'Đang xác minh lại quyền truy cập' : repo.accessStatus === 0 ? 'Đang chờ xác minh quyền để kích hoạt' : 'Quyền truy cập đã được xác minh';
  let activity = 'Chưa có lần đồng bộ hoàn tất';
  if (repo.syncPaused) activity = 'Đồng bộ đang tạm dừng';
  else if (sync?.latestJob?.status === 1) activity = 'Đang đồng bộ';
  else if (sync?.latestJob?.status === 0 || sync?.latestJob?.status === 4) activity = 'Đồng bộ đang chờ xử lý';
  else if (sync?.latestJob?.status === 2) activity = 'Lần đồng bộ gần nhất đã hoàn tất';
  else if (sync?.latestJob?.status === 3) activity = 'Lần đồng bộ gần nhất thất bại';
  else if (sync?.latestJob?.status === 6) activity = 'Tác vụ đồng bộ đang tạm dừng';
  return { link: 'Đã liên kết', authorization, sync: activity, warning: repo.accessStatus === 2 || unknown };
}
