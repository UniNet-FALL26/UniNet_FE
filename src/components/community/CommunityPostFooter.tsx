import { colors } from '@/constants/colors';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  favoriteCount?: number;
  commentCount?: number;
  liked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare: () => void;
};

export function CommunityPostFooter({ favoriteCount, commentCount, liked = false, onLike, onComment, onShare }: Props) {
  const actions = [
    { label: 'Thích', icon: { ios: liked ? 'hand.thumbsup.fill' : 'hand.thumbsup', android: liked ? 'thumb_up' : 'thumb_up_off_alt', web: liked ? 'thumb_up' : 'thumb_up_off_alt' }, onPress: onLike, active: liked },
    { label: 'Bình luận', icon: { ios: 'bubble.right', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }, onPress: onComment, active: false },
    { label: 'Chia sẻ', icon: { ios: 'arrowshape.turn.up.right', android: 'reply', web: 'reply' }, onPress: onShare, active: false },
  ] as const;
  return <View>
    {(favoriteCount !== undefined || commentCount !== undefined) && <View style={s.stats}>
      {favoriteCount !== undefined && <Text accessibilityLabel={`${favoriteCount} lượt thích`} style={s.count}>{favoriteCount.toLocaleString('vi-VN')} lượt thích</Text>}
      {favoriteCount !== undefined && commentCount !== undefined && <Text accessible={false} style={s.separator}>·</Text>}
      {commentCount !== undefined && <Pressable accessibilityRole="button" disabled={!onComment} onPress={onComment}><Text style={s.count}>{commentCount.toLocaleString('vi-VN')} bình luận</Text></Pressable>}
    </View>}
    <View style={s.actions}>{actions.map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled: !action.onPress, selected: action.active }} disabled={!action.onPress} onPress={action.onPress} style={({ pressed }) => [s.action, pressed && s.pressed, !action.onPress && s.disabled]}>
      <SymbolView name={action.icon} size={21} tintColor={action.active ? colors.primary : colors.textSecondary} style={action.label === 'Chia sẻ' && Platform.OS !== 'ios' ? s.shareIcon : undefined} />
      <Text style={[s.label, action.active && s.active]}>{action.label}</Text>
    </Pressable>)}</View>
  </View>;
}

const s = StyleSheet.create({
  stats: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, paddingHorizontal: 3, paddingBottom: 6 },
  separator: { fontSize: 13, color: colors.textSecondary },
  count: { fontSize: 13, color: colors.textSecondary },
  actions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCE2EC', paddingTop: 0 },
  action: { flex: 1, minWidth: 0, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  active: { color: colors.primary },
  shareIcon: { transform: [{ scaleX: -1 }] },
  pressed: { backgroundColor: '#F1F5FA' },
  disabled: { opacity: 0.4 },
});
