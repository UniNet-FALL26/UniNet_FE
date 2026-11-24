import type { GitIdentity, OfficialMemberContribution } from '@/types/project-github';

export function gitIdentitiesFor(identities: GitIdentity[], projectId: string, profileId: string, activeOnly = true) {
  return identities.filter(x => x.projectId === projectId && x.userProfileId === profileId &&
    (x.status === 0 || !activeOnly && x.status === 1)).sort((a, b) => {
    const left = `${a.status}:${a.externalUsername.toLowerCase()}:${a.id}`;
    const right = `${b.status}:${b.externalUsername.toLowerCase()}:${b.id}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}
export function gitIdentityForConnection(identities: GitIdentity[], projectId: string, profileId: string, providerAccountId: string) {
  return gitIdentitiesFor(identities, projectId, profileId, false)
    .find(x => String(x.externalAccountId) === providerAccountId);
}

// Compatibility for older callers; member UI must use the full collection above.
export function gitIdentityFor(identities: GitIdentity[], profileId: string) {
  const owned = identities.filter(x => x.userProfileId === profileId);
  return owned.find(x => x.status === 0) ?? owned.find(x => x.status === 1);
}
export function officialContributionLabel(result: OfficialMemberContribution | null, projectId: string, profileId: string): string {
  if (!result || result.contractVersion !== '1' || result.projectId !== projectId || result.userId !== profileId || !result.publishedAt || !Number.isFinite(Date.parse(result.publishedAt)) ||
    !Number.isFinite(result.contributionPercent) || result.contributionPercent < 0 || result.contributionPercent > 100) return 'Chưa có điểm';
  return `${result.contributionPercent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}
export function gitError(cause: unknown): string {
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : '';
  const messages: Record<string, string> = {
    GIT_IDENTITY_OWNERSHIP_CONFLICT: 'Tài khoản GitHub đã thuộc thành viên khác trong dự án. Không thể tự chuyển quyền sở hữu.',
    GIT_IDENTITY_CONCURRENCY_CONFLICT: 'Danh tính vừa thay đổi. Hãy tải lại trước khi tiếp tục.',
    GITHUB_REAUTH_REQUIRED: 'Phiên GitHub cần được xác thực lại.',
    GITHUB_APP_IDENTITY_REQUIRED: 'Hãy xác minh tài khoản GitHub của chính bạn trước.',
    GITHUB_APP_USER_MISMATCH: 'Tài khoản GitHub cấp quyền App không trùng tài khoản đã xác minh.',
    GITHUB_REPOSITORY_ALREADY_LINKED: 'Repository đã được liên kết với dự án.',
    GIT_IDENTITY_NOT_OWNER: 'Chỉ chủ danh tính mới được thực hiện thao tác này.',
    GIT_PROJECT_MEMBERSHIP_REQUIRED: 'Bạn cần là thành viên có quyền trong dự án.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    GITHUB_NOT_CONFIGURED: 'GitHub chưa được cấu hình đầy đủ cho môi trường này.',
    GITHUB_APP_NOT_CONFIGURED: 'GitHub App chưa được cấu hình đầy đủ cho môi trường này.',
    GITHUB_APP_REAUTHORIZATION_REQUIRED: 'Quyền GitHub App đã hết hạn. Hãy cấp quyền lại bằng tài khoản đã chọn; phiên đăng nhập UniNet của bạn vẫn được giữ.',
    GITHUB_APP_AUTH_REQUIRED: 'Tài khoản đã chọn chưa có quyền GitHub App. Hãy cài đặt hoặc cấp quyền App trước.',
    GITHUB_APP_INSTALLATION_UNAVAILABLE: 'Installation không còn khả dụng hoặc đã bị tạm ngưng. Hãy kiểm tra đúng tài khoản/owner trên GitHub rồi chọn lại installation.',
    GITHUB_APP_VERIFICATION_PENDING: 'Installation đang chờ xác minh quyền. Không thể bỏ qua kiểm tra này; cần hoàn tất xác minh phía Backend.',
    GITHUB_APP_PROVIDER_ERROR: 'GitHub từ chối yêu cầu. Hãy kiểm tra quyền App, tài khoản đã chọn và thử tải lại; nếu quyền đã hết hạn, hãy cấp quyền lại.',
    INVALID_RETURN_TARGET: 'Địa chỉ quay về Frontend chưa được Backend cho phép.',
  };
  if (typeof code === 'string' && messages[code]) return messages[code];
  return 'Không thể hoàn tất thao tác GitHub. Hãy kiểm tra kết nối, quyền truy cập và thử lại.';
}
export const repositoryAccessLabel = (status: number) => ({ 0: 'Chờ cấp quyền', 1: 'Đã cấp quyền', 2: 'Mất quyền truy cập' }[status] ?? 'Chưa xác định');
export const syncJobLabel = (status?: number) => status === undefined ? 'Chưa có lần đồng bộ' : ({ 0: 'Đang chờ đồng bộ', 1: 'Đang đồng bộ', 2: 'Đồng bộ hoàn tất', 3: 'Đồng bộ thất bại', 4: 'Đang chờ thử lại', 5: 'Đã hủy đồng bộ', 6: 'Đồng bộ tạm dừng' }[status] ?? 'Chưa xác định');
