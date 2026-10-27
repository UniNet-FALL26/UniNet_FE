import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { notificationTheme as theme, notificationVisual } from '@/constants/notification-presentation';
import { notificationRelativeTime } from '@/utils/notifications';
import type { AccountNotification } from '@/types/notifications';

type Props = { item: AccountNotification; disabled: boolean; narrow: boolean; onOpen: () => void; onRead: () => Promise<void> };

export const NotificationRow = memo(function NotificationRow({ item, disabled, narrow, onOpen, onRead }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visual = notificationVisual(item.type, item.category);
  const unread = !item.readAt;
  const time = notificationRelativeTime(item.createdAt);
  return <View style={s.container}>
    <View style={[s.row, unread && s.unreadRow]}>
      <Pressable testID={`notification-${item.id}`} accessibilityRole="button" accessibilityLabel={`${unread ? 'Chưa đọc' : 'Đã đọc'}: ${item.title}. ${item.message}`} disabled={disabled} onPress={onOpen} style={({ hovered, pressed }) => [s.main, narrow && s.mobileMain, (hovered || pressed) && s.hovered, disabled && s.disabled]}>
        <View testID={`notification-icon-${item.id}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.icon, narrow && s.mobileIcon, { backgroundColor: visual.background }]}><SymbolView name={visual.icon} size={23} tintColor={visual.foreground} /></View>
        <View style={s.copy}><Text style={[s.title, unread && s.unreadTitle]}>{item.title}</Text><Text numberOfLines={narrow ? 2 : 1} style={s.message}>{item.message}</Text>{narrow && <Text style={s.time}>{time}</Text>}</View>
        {!narrow && <Text accessibilityLabel={`Thời gian: ${time}`} style={s.desktopTime}>{time}</Text>}
      </Pressable>
      <View style={s.dotSlot}>{unread && <View testID={`notification-unread-${item.id}`} style={s.dot} />}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Tùy chọn thông báo: ${item.title}`} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} disabled={disabled} style={({ hovered, pressed }) => [s.more, (hovered || pressed) && s.hovered]}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} size={20} tintColor={theme.secondary} /></Pressable>
    </View>
    {expanded && <View accessibilityLabel={`Thao tác với ${item.title}`} style={s.actions}>
      <Pressable accessibilityRole="button" onPress={() => { setExpanded(false); onOpen(); }} disabled={disabled} style={s.action}><Text style={s.actionText}>Mở nội dung</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { void onRead().then(() => setExpanded(false)); }} disabled={disabled || !unread} style={[s.action, (disabled || !unread) && s.disabled]}><Text style={s.actionText}>{unread ? 'Đánh dấu đã đọc' : 'Đã đọc'}</Text></Pressable>
    </View>}
  </View>;
});

const s = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: theme.divider }, row: { flexDirection: 'row', alignItems: 'center', borderRadius: 9 }, unreadRow: { backgroundColor: theme.unread },
  main: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingLeft: 12, paddingRight: 10, borderRadius: 9 }, hovered: { backgroundColor: theme.hovered },
  mobileMain: { gap: 10, paddingLeft: 8, paddingRight: 4 }, mobileIcon: { width: 40, height: 40, borderRadius: 20 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, copy: { flex: 1, minWidth: 0, gap: 4 }, title: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: theme.title }, unreadTitle: { fontWeight: '700' }, message: { fontSize: 13, lineHeight: 20, color: theme.secondary },
  time: { fontSize: 12, lineHeight: 18, color: theme.secondary, marginTop: 3 }, desktopTime: { fontSize: 12, color: theme.secondary, width: 104, textAlign: 'right', marginLeft: 8 },
  dotSlot: { width: 16, alignItems: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.active }, more: { width: Platform.OS === 'android' ? 48 : 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  actions: { paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }, action: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8, justifyContent: 'center' }, actionText: { fontSize: 13, color: theme.blue, fontWeight: '600' }, disabled: { opacity: 0.45 },
});
