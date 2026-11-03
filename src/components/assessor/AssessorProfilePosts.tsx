import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { communityService, type PostResponse } from '@/services/community.service';
import { CommentModal } from '@/components/community/CommentModal';
import { colors } from '@/constants/colors';
import type { AssessorProfile } from '@/services/assessor-profile.service';
import { toast } from '@/store/toast.store';

const pageSize = 10;
export function AssessorProfilePosts({ profile }: { profile: AssessorProfile }) {
  const [posts, setPosts] = useState<PostResponse[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false), [revision, setRevision] = useState(0);
  const [commentPost, setCommentPost] = useState<string | null>(null), [pending, setPending] = useState<string[]>([]);
  const active = useRef(false), request = useRef<AbortController | null>(null), mutations = useRef(new Set<string>());
  const load = useCallback(async (number: number, signal: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const result = await communityService.getOwnPosts(number, pageSize, signal);
      if (!Array.isArray(result)) throw new Error('Không tải được bài đăng cộng đồng.');
      if (signal.aborted || !active.current) return;
      const owned = result.filter(post => post.authorUserId === profile.id);
      setPosts(current => number === 1 ? owned : [...current, ...owned.filter(post => !current.some(old => old.id === post.id))]);
      setPage(number); setHasMore(result.length === pageSize);
    } catch (cause) { if (!signal.aborted && active.current) setError(cause instanceof Error ? cause.message : 'Không tải được bài đăng cộng đồng.'); }
    finally { if (!signal.aborted && active.current) setLoading(false); }
  }, [profile.id]);
  useFocusEffect(useCallback(() => {
    active.current = true; const controller = new AbortController(); request.current = controller; setPosts([]); setHasMore(false); setPage(1);
    void load(1, controller.signal);
    return () => { active.current = false; request.current?.abort(); };
  }, [load, revision]));
  const more = () => { if (loading) return; const controller = new AbortController(); request.current = controller; void load(page + 1, controller.signal); };
  const toggle = async (post: PostResponse, kind: 'like' | 'save') => {
    const key = kind + post.id; if (mutations.current.has(key)) return;
    mutations.current.add(key); setPending(current => [...current, key]);
    try {
      if (kind === 'like') await communityService.toggleReact(post.id); else await communityService.toggleBookmark(post.id);
      if (active.current) setPosts(current => current.map(item => item.id !== post.id ? item : kind === 'like'
        ? { ...item, isFavorited: !item.isFavorited, favoriteCount: Math.max(0, item.favoriteCount + (item.isFavorited ? -1 : 1)) }
        : { ...item, isSaved: !item.isSaved }));
    } catch { /* The existing API feedback displays the failure; keep the previous state. */ }
    finally { mutations.current.delete(key); if (active.current) setPending(current => current.filter(item => item !== key)); }
  };
  return <View testID="assessor-profile-posts" style={s.feed}>
    <View style={s.heading}><Text role="heading" aria-level={2} style={s.title}>Bài đăng cộng đồng</Text><Pressable accessibilityRole="button" accessibilityLabel="Tải lại bài đăng cộng đồng" onPress={() => setRevision(current => current + 1)} style={s.iconButton}><SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={18} tintColor={colors.primary} /></Pressable></View>
    {loading && posts.length === 0 && <View style={s.state}><ActivityIndicator color={colors.primary} /><Text style={s.muted}>Đang tải bài đăng…</Text></View>}
    {!!error && <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { if (posts.length) more(); else setRevision(current => current + 1); }} style={s.retry}><Text style={s.link}>Thử lại bài đăng</Text></Pressable></View>}
    {!loading && !error && posts.length === 0 && <View testID="assessor-posts-empty" style={s.state}>
      <View style={s.emptyIcon}><SymbolView name={{ ios: 'doc.text', android: 'article', web: 'article' }} size={28} tintColor={colors.primary} /></View>
      <Text style={s.emptyTitle}>Chưa có bài đăng cộng đồng nào.</Text><Text style={s.muted}>Những bài viết bạn chia sẻ với cộng đồng sẽ xuất hiện tại đây.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(assessor)/assessor-community')} style={s.retry}><Text style={s.link}>Đến cộng đồng</Text></Pressable>
    </View>}
    {posts.map(post => <View key={post.id} testID={`assessor-post-${post.id}`} style={s.post}>
      <View style={s.authorRow}><View style={s.avatar}>{post.authorAvatar ? <Image source={{ uri: post.authorAvatar }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`Ảnh đại diện ${post.authorName}`} /> : <Text style={s.initial}>{(post.authorName || profile.fullName).charAt(0).toUpperCase()}</Text>}</View>
        <View style={s.authorCopy}><View style={s.nameRow}><Text style={s.author}>{post.authorName || profile.fullName}</Text>{profile.isVerified && <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }} size={14} tintColor={colors.primary} />}</View><Text style={s.date}>{Number.isFinite(Date.parse(post.createdAt)) ? new Date(post.createdAt).toLocaleString('vi-VN') : '—'}</Text></View>
      </View>
      {!!post.description && <Text selectable style={s.description}>{post.description}</Text>}
      {post.mediaUrls.map((url, index) => {
        if (!/^https?:\/\//i.test(url)) return null;
        const attachment = /\.(pdf|docx?|xlsx?|pptx?|mp4|webm|mov)(?:[?#]|$)/i.test(url);
        return attachment ? <Pressable key={url + index} accessibilityRole="link" accessibilityLabel="Mở tệp đính kèm" onPress={() => void Linking.openURL(url).catch(() => toast.error('Không mở được tệp.'))} style={s.attachment}><SymbolView name={{ ios: 'doc.fill', android: 'description', web: 'description' }} size={24} tintColor={colors.primary} /><Text style={s.link}>Xem tệp đính kèm</Text><SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={16} tintColor={colors.textMuted} /></Pressable>
          : <Image key={url + index} source={{ uri: url }} contentFit="cover" accessibilityLabel={`Ảnh bài đăng ${index + 1}`} style={s.postImage} />;
      })}
      <View style={s.counts}><Text style={s.muted}>{post.favoriteCount} lượt thích</Text><Pressable accessibilityRole="button" accessibilityLabel={`Xem ${post.commentCount} bình luận`} onPress={() => setCommentPost(post.id)}><Text style={s.muted}>{post.commentCount} bình luận</Text></Pressable></View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={post.isFavorited ? 'Bỏ thích bài viết' : 'Thích bài viết'} accessibilityState={{ selected: post.isFavorited }} disabled={pending.includes('like' + post.id)} onPress={() => void toggle(post, 'like')} style={s.action}><SymbolView name={{ ios: post.isFavorited ? 'heart.fill' : 'heart', android: post.isFavorited ? 'favorite' : 'favorite_border', web: post.isFavorited ? 'favorite' : 'favorite_border' }} size={17} tintColor={post.isFavorited ? '#D34C68' : colors.textSecondary} /><Text style={[s.actionLabel, post.isFavorited && s.liked]}>Thích</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bình luận bài viết" onPress={() => setCommentPost(post.id)} style={s.action}><SymbolView name={{ ios: 'bubble.right', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} size={17} tintColor={colors.textSecondary} /><Text style={s.actionLabel}>Bình luận</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={post.isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'} accessibilityState={{ selected: post.isSaved }} disabled={pending.includes('save' + post.id)} onPress={() => void toggle(post, 'save')} style={s.action}><SymbolView name={{ ios: post.isSaved ? 'bookmark.fill' : 'bookmark', android: post.isSaved ? 'bookmark' : 'bookmark_border', web: post.isSaved ? 'bookmark' : 'bookmark_border' }} size={17} tintColor={post.isSaved ? colors.primary : colors.textSecondary} /><Text style={s.actionLabel}>{post.isSaved ? 'Đã lưu' : 'Lưu'}</Text></Pressable>
      </View>
    </View>)}
    {posts.length > 0 && hasMore && <Pressable accessibilityRole="button" disabled={loading} onPress={more} style={s.more}>{loading ? <ActivityIndicator color={colors.primary} /> : <Text style={s.link}>Xem thêm bài viết</Text>}</Pressable>}
    <CommentModal postId={commentPost} onClose={() => { setCommentPost(null); setRevision(current => current + 1); }} />
  </View>;
}
const s = StyleSheet.create({
  feed: { width: '100%', gap: 14 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  iconButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  state: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 240 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  muted: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, error: { color: colors.error, fontSize: 13, lineHeight: 20 }, retry: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.primaryLight }, link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  post: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 16, gap: 12 }, authorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }, initial: { color: colors.primary, fontWeight: '700' }, authorCopy: { flex: 1, minWidth: 0, gap: 3 }, nameRow: { flexDirection: 'row', gap: 5, alignItems: 'center' }, author: { fontSize: 13, fontWeight: '700', color: colors.navy, flexShrink: 1 }, date: { fontSize: 10, color: colors.textMuted },
  description: { fontSize: 13, lineHeight: 21, color: colors.textPrimary }, postImage: { width: '100%', aspectRatio: 1.6, borderRadius: 8, backgroundColor: colors.primaryLight }, attachment: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: colors.background },
  counts: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EDF2F8', paddingTop: 4, gap: 4 }, action: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, actionLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' }, liked: { color: '#D34C68' }, more: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
});
