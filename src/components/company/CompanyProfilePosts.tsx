import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { communityService, type PostResponse } from '@/services/community.service';
import { CompanyIcon, companyColors as c } from './company-ui';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { CommunityMediaLightbox } from '@/components/community/CommunityMediaLightbox';
import { CommentModal } from '@/components/community/CommentModal';
import { UpdatePostModal } from '@/components/community/UpdatePostModal';
import { useAuthStore } from '@/store/auth.store';
import { reportApiFailure } from '@/services/api';
import { shareCommunityPost } from '@/utils/share-community-post';

export function CompanyProfilePosts({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  const { account } = useAuthStore();
  const [posts, setPosts] = useState<PostResponse[]>([]), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [hasMore, setHasMore] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null), [detailId, setDetailId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null), [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null), [reportReason, setReportReason] = useState('');
  const [media, setMedia] = useState<{ urls: string[]; index: number } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const pending = useRef(new Set<string>());
  const scope = `${profileId}:${account?.id ?? ''}:${readOnly}`;
  const activeScope = useRef<string | null>(scope);
  activeScope.current = scope;
  useEffect(() => {
    setPosts([]); setPage(1); setMenuId(null); setDetailId(null); setEditingPost(null); setDeleteId(null); setReportId(null); setReportReason(''); setMedia(null); setActionBusy(false); setActionError('');
    return () => { activeScope.current = null; };
  }, [scope]);

  const perform = async (key: string, request: () => Promise<unknown>, apply: () => void, fallback: string) => {
    const requestKey = `${scope}:${key}`;
    if (pending.current.has(requestKey)) return;
    pending.current.add(requestKey);
    try { await request(); if (activeScope.current === scope) apply(); }
    catch (cause) { if (activeScope.current === scope) reportApiFailure(cause, fallback); }
    finally { pending.current.delete(requestKey); }
  };
  const like = (id: string) => perform(`like:${id}`, () => communityService.toggleReact(id), () => {
    setPosts(current => current.map(post => post.id === id ? { ...post, isFavorited: !post.isFavorited, favoriteCount: Math.max(0, post.favoriteCount + (post.isFavorited ? -1 : 1)) } : post));
  }, 'Không thể thích bài viết.');
  const save = (id: string) => perform(`save:${id}`, () => communityService.toggleBookmark(id), () => {
    setPosts(current => current.map(post => post.id === id ? { ...post, isSaved: !post.isSaved } : post));
  }, 'Không thể lưu bài viết.');
  const confirmAction = async () => {
    if (actionBusy) return;
    const id = deleteId || reportId;
    if (!id || (reportId && !reportReason.trim())) return;
    setActionBusy(true); setActionError('');
    try {
      if (deleteId) await communityService.deletePost(id);
      else await communityService.reportPost(id, { reason: reportReason.trim() });
      if (activeScope.current !== scope) return;
      if (deleteId) { setPosts(current => current.filter(post => post.id !== id)); setDetailId(current => current === id ? null : current); }
      setDeleteId(null); setReportId(null); setReportReason('');
    } catch (cause) {
      if (activeScope.current === scope) setActionError(cause instanceof Error ? cause.message : deleteId ? 'Không thể xóa bài viết.' : 'Không thể gửi báo cáo.');
    } finally { if (activeScope.current === scope) setActionBusy(false); }
  };
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
  }, [profileId, page, revision, readOnly, account?.id]));
  return <View style={s.posts}><View style={s.heading}><Text role="heading" style={s.title}>Bài viết của tổ chức</Text>{!readOnly && <Pressable accessibilityRole="button" onPress={() => router.push('/(company)/company-community')}><Text style={s.link}>Đến cộng đồng</Text></Pressable>}</View>
    {!!error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRevision(value => value + 1)}><Text style={s.link}>Thử lại</Text></Pressable></View>}
    {!loading && !error && !posts.length && <View testID="company-posts-empty" style={s.empty}><CompanyIcon name={{ ios: 'doc.text', android: 'article', web: 'article' }} size={30} /><Text style={s.title}>Chưa có bài viết</Text><Text style={s.muted}>{readOnly ? 'Tổ chức chưa chia sẻ bài viết với cộng đồng.' : 'Bài viết bạn chia sẻ với cộng đồng sẽ xuất hiện tại đây.'}</Text></View>}
    {posts.map(post => {
      const owner = !readOnly && (account?.id === post.authorUserId || account?.profile?.id === post.authorUserId);
      return <View key={post.id} style={menuId === post.id ? s.raised : undefined}><CommunityPostCard
        post={post} menuOpen={menuId === post.id} onMenuChange={open => setMenuId(open ? post.id : null)}
        onOpen={() => setDetailId(post.id)} onOpenMedia={index => setMedia({ urls: post.mediaUrls, index })}
        onLike={() => void like(post.id)} onShare={() => void shareCommunityPost(post.id, post.description || 'UniNet')} onSave={() => void save(post.id)}
        onEdit={owner ? () => setEditingPost(post) : undefined} onDelete={owner ? () => { setActionError(''); setDeleteId(post.id); } : undefined}
        onReport={!owner ? () => { setActionError(''); setReportId(post.id); setReportReason(''); } : undefined}
      /></View>;
    })}
    {loading && <ActivityIndicator color={c.blue} />}
    {!loading && hasMore && <Pressable accessibilityRole="button" onPress={() => setPage(value => value + 1)} style={s.more}><Text style={s.link}>Xem thêm bài viết</Text></Pressable>}
    <CommentModal post={posts.find(post => post.id === detailId) ?? null} onClose={() => setDetailId(null)}
      onToggleReaction={id => void like(id)} onToggleBookmark={id => void save(id)}
      onRequestEdit={post => { setDetailId(null); if (!readOnly) setEditingPost(post); }} onRequestDelete={id => { setDetailId(null); if (!readOnly) { setActionError(''); setDeleteId(id); } }}
      onCommentCountChange={(id, delta) => setPosts(current => current.map(post => post.id === id ? { ...post, commentCount: Math.max(0, post.commentCount + delta) } : post))} />
    <CommunityMediaLightbox urls={media?.urls ?? []} index={media?.index ?? null} onIndexChange={index => setMedia(current => current ? { ...current, index } : null)} onClose={() => setMedia(null)} />
    <UpdatePostModal post={editingPost} visible={!!editingPost} onClose={() => setEditingPost(null)} onUpdated={updated => setPosts(current => current.map(post => post.id === updated.id ? updated : post))} />
    <Modal visible={!!deleteId || !!reportId} transparent animationType="fade" onRequestClose={() => { if (!actionBusy) { setDeleteId(null); setReportId(null); } }}>
      <View style={s.overlay}><View role="dialog" aria-modal aria-label={deleteId ? 'Xóa bài viết' : 'Báo cáo bài viết'} style={s.dialog}>
        <Text style={s.title}>{deleteId ? 'Xóa bài viết?' : 'Báo cáo bài viết'}</Text>
        {reportId && <TextInput accessibilityLabel="Lý do báo cáo" placeholder="Nhập lý do báo cáo" value={reportReason} onChangeText={setReportReason} maxLength={1000} multiline style={s.reason} />}
        {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
        <View style={s.dialogActions}><Pressable accessibilityRole="button" disabled={actionBusy} onPress={() => { setDeleteId(null); setReportId(null); }} style={s.dialogButton}><Text style={s.link}>Hủy</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={actionBusy || (!!reportId && !reportReason.trim())} onPress={() => void confirmAction()} style={s.dialogButton}><Text style={s.error}>{actionBusy ? 'Đang xử lý…' : deleteId ? 'Xóa' : 'Gửi báo cáo'}</Text></Pressable></View>
      </View></View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({ posts: { gap: 14 }, raised: { zIndex: 9999, elevation: 10 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: c.ink, fontSize: 16, fontWeight: '800' }, link: { color: c.blue, fontSize: 12, fontWeight: '700' }, card: { padding: 20, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.white }, empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: c.white, borderRadius: 14 }, muted: { color: c.muted, fontSize: 12, lineHeight: 18 }, error: { color: c.rose, fontSize: 12 }, more: { padding: 14, alignItems: 'center' }, overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }, dialog: { width: '100%', maxWidth: 400, padding: 20, borderRadius: 16, backgroundColor: '#FFF', gap: 16 }, dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }, dialogButton: { minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, reason: { minHeight: 90, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, color: c.ink, textAlignVertical: 'top' } });
