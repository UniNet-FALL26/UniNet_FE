import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { communityService, type PostResponse } from '@/services/community.service';
import { CompanyIcon, companyColors as c } from './company-ui';

export function CompanyProfilePosts({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  const [posts, setPosts] = useState<PostResponse[]>([]), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [hasMore, setHasMore] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const request = readOnly ? communityService.getAuthorPosts(profileId, page, 10, controller.signal) : communityService.getOwnPosts(page, 10, controller.signal);
    request.then(items => {
      if (controller.signal.aborted) return;
      const own = items.filter(item => item.authorUserId === profileId);
      setPosts(current => page === 1 ? own : [...current, ...own.filter(item => !current.some(old => old.id === item.id))]);
      setHasMore(items.length === 10);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được bài viết.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [profileId, page, revision, readOnly]));
  return <View style={s.posts}><View style={s.heading}><Text role="heading" style={s.title}>Bài viết của tổ chức</Text>{!readOnly && <Pressable accessibilityRole="button" onPress={() => router.push('/(company)/company-community')}><Text style={s.link}>Đến cộng đồng</Text></Pressable>}</View>
    {!!error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision(value => value + 1)}><Text style={s.link}>Thử lại</Text></Pressable></View>}
    {!loading && !error && !posts.length && <View testID="company-posts-empty" style={s.empty}><CompanyIcon name={{ ios: 'doc.text', android: 'article', web: 'article' }} size={30} /><Text style={s.title}>Chưa có bài viết</Text><Text style={s.muted}>{readOnly ? 'Tổ chức chưa chia sẻ bài viết với cộng đồng.' : 'Bài viết bạn chia sẻ với cộng đồng sẽ xuất hiện tại đây.'}</Text></View>}
    {posts.map(post => <View key={post.id} style={s.card}><Text style={s.author}>{post.authorName}</Text><Text style={s.muted}>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</Text><Text style={s.body}>{post.description}</Text>{post.mediaUrls.length > 0 && <Image source={{ uri: post.mediaUrls[0] }} accessibilityLabel="Ảnh bài viết" contentFit="cover" style={s.image} />}<Text style={s.muted}>{post.favoriteCount} lượt thích · {post.commentCount} bình luận</Text></View>)}
    {loading && <ActivityIndicator color={c.blue} />}
    {!loading && hasMore && <Pressable accessibilityRole="button" onPress={() => setPage(value => value + 1)} style={s.more}><Text style={s.link}>Xem thêm bài viết</Text></Pressable>}
  </View>;
}
const s = StyleSheet.create({ posts: { gap: 14 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: c.ink, fontSize: 16, fontWeight: '800' }, link: { color: c.blue, fontSize: 12, fontWeight: '700' }, card: { padding: 20, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.white }, empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: c.white, borderRadius: 14 }, muted: { color: c.muted, fontSize: 12, lineHeight: 18 }, author: { color: c.ink, fontSize: 13, fontWeight: '700' }, body: { color: c.ink, fontSize: 13, lineHeight: 21 }, image: { width: '100%', aspectRatio: 1.7, borderRadius: 10 }, error: { color: c.rose, fontSize: 12 }, more: { padding: 14, alignItems: 'center' } });
