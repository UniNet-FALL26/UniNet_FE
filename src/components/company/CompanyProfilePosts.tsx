import { CommunityProfilePosts } from '@/components/community/CommunityProfilePosts';

export function CompanyProfilePosts({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  return <CommunityProfilePosts profileId={profileId} readOnly={readOnly} title="Bài viết của tổ chức"
    emptyMessage={readOnly ? 'Tổ chức chưa chia sẻ bài viết với cộng đồng.' : 'Bài viết bạn chia sẻ với cộng đồng sẽ xuất hiện tại đây.'}
    communityHref="/(company)/company-community" />;
}
