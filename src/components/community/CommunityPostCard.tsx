import { colors } from '@/constants/colors';
import type { PostResponse } from '@/services/community.service';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CommunityPostFooter } from './CommunityPostFooter';
import { CommunityPostMedia } from './CommunityPostMedia';

type Props = {
  post: PostResponse;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  onOpen: () => void;
  onOpenMedia: (index: number) => void;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
};

export function CommunityPostDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return <View>
    <Text style={s.description} numberOfLines={expanded ? undefined : 3}>{text}</Text>
    {text.length > 150 && !expanded && <Pressable accessibilityRole="button" accessibilityLabel="Xem thêm nội dung" onPress={() => setExpanded(true)}><Text style={s.seeMore}>Xem thêm</Text></Pressable>}
  </View>;
}

export function CommunityPostCard({ post, menuOpen, onMenuChange, onOpen, onOpenMedia, onLike, onShare, onSave, onEdit, onDelete, onReport }: Props) {
  const name = post.authorNickname || post.authorName;
  const actions = [
    { label: post.isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết', run: onSave, danger: false },
    ...(onEdit ? [{ label: 'Sửa bài viết', run: onEdit, danger: false }] : []),
    ...(onDelete ? [{ label: 'Xóa bài viết', run: onDelete, danger: true }] : []),
    ...(onReport ? [{ label: 'Báo cáo bài viết', run: onReport, danger: false }] : []),
  ];
  return <View testID={`community-post-${post.id}`} style={[s.card, menuOpen && s.raised]}>
    <View style={[s.header, menuOpen && s.raised]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Mở bài viết của ${name}`} onPress={onOpen} style={s.author}>
        <View style={s.avatar}>{post.authorAvatar ? <Image source={{ uri: post.authorAvatar }} style={StyleSheet.absoluteFill} /> : <Text style={s.initial}>{name?.charAt(0)?.toUpperCase()}</Text>}</View>
        <View style={s.authorCopy}><Text style={s.name}>{name}</Text><Text style={s.date}>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</Text></View>
      </Pressable>
      <View style={s.menuAnchor}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn bài viết" accessibilityState={{ expanded: menuOpen }} onPress={() => onMenuChange(!menuOpen)} style={s.menuButton}>
          <SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} size={20} tintColor={colors.textSecondary} />
        </Pressable>
        {menuOpen && <>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng tùy chọn bài viết" style={s.menuBackdrop} onPress={() => onMenuChange(false)} />
          <View role="menu" style={s.menu}>{actions.map(action => <Pressable key={action.label} accessibilityRole="menuitem" onPress={() => { onMenuChange(false); action.run(); }} style={s.menuItem}><Text style={[s.menuLabel, action.danger && s.danger]}>{action.label}</Text></Pressable>)}</View>
        </>}
      </View>
    </View>
    <Pressable onPress={onOpen}><CommunityPostDescription key={post.id} text={post.description || ''} /></Pressable>
    {!!post.mediaUrls?.length && <View style={s.media}><CommunityPostMedia urls={post.mediaUrls} onOpen={onOpenMedia} /></View>}
    <CommunityPostFooter favoriteCount={post.favoriteCount} commentCount={post.commentCount} liked={post.isFavorited} onLike={onLike} onComment={onOpen} onShare={onShare} />
  </View>;
}

const s = StyleSheet.create({
  card: { width: '100%', maxWidth: 626, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, paddingBottom: 8, gap: 10, elevation: 2, boxShadow: '0px 3px 12px rgba(23,43,77,0.08)', borderWidth: 1, borderColor: '#DFE7F2' },
  raised: { zIndex: 9999, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', gap: 8 },
  author: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 },
  authorCopy: { flex: 1, minWidth: 0 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: colors.primary, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  date: { fontSize: 12, color: colors.textSecondary },
  description: { fontSize: 14, lineHeight: 20, color: '#1F2937' },
  seeMore: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 2 },
  media: { overflow: 'hidden', borderRadius: 12, backgroundColor: colors.surface },
  menuAnchor: { position: 'relative' },
  menuButton: { position: 'relative', zIndex: 1001, padding: 4 },
  menuBackdrop: { position: 'absolute', top: -1000, bottom: -1000, left: -1000, right: -1000, zIndex: 999 },
  menu: { position: 'absolute', top: 32, right: 0, width: 200, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 4, boxShadow: '0px 4px 16px rgba(0,0,0,0.15)', elevation: 12, zIndex: 1000 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 12 },
  menuLabel: { fontSize: 14, color: colors.textPrimary },
  danger: { color: colors.error },
});
