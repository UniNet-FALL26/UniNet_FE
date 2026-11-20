import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { notificationTheme as theme, notificationVisual } from '@/constants/notification-presentation';
import { notificationRelativeTime } from '@/utils/notifications';
import type { AccountNotification } from '@/types/notifications';

type Props = { item: AccountNotification; disabled: boolean; narrow: boolean; onOpen: () => void };

export const NotificationRow = memo(function NotificationRow({ item, disabled, narrow, onOpen }: Props) {
  const visual = notificationVisual(item.type, item.category);
  const unread = !item.readAt;
  const time = notificationRelativeTime(item.createdAt);
  return <Pressable testID={`notification-${item.id}`} accessibilityRole="button" accessibilityLabel={`${unread ? 'Chưa đọc' : 'Đã đọc'}: ${item.title}. ${item.message}`} disabled={disabled} onPress={onOpen} style={({ hovered, pressed }) => [s.container, s.row, unread && s.unreadRow, (hovered || pressed) && s.hovered, disabled && s.disabled]}>
      <View style={[s.main, narrow && s.mobileMain]}>
        <View testID={`notification-icon-${item.id}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.icon, narrow && s.mobileIcon, { backgroundColor: visual.background }]}><SymbolView name={visual.icon} size={18} tintColor={visual.foreground} /></View>
        <View style={s.copy}><Text style={[s.title, unread && s.unreadTitle]}>{item.title}</Text><Text numberOfLines={2} style={s.message}>{item.message}</Text><Text accessibilityLabel={`Thời gian: ${time}`} style={s.time}>{time}</Text></View>
      </View>
      <View style={s.dotSlot}>{unread ? <View testID={`notification-unread-${item.id}`} style={s.dot} /> : <SymbolView name={{ ios: 'checkmark', android: 'done_all', web: 'done_all' }} size={15} tintColor={theme.secondary} />}</View>
  </Pressable>;
});

const s = StyleSheet.create({
  container: { marginBottom: 5 }, row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.divider, backgroundColor: theme.surface }, unreadRow: { backgroundColor: theme.unread, borderColor: theme.unread },
  main: { flex: 1, minWidth: 0, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 11, paddingRight: 8, borderRadius: 10 }, hovered: { backgroundColor: theme.hovered },
  mobileMain: { gap: 9, paddingLeft: 8, paddingRight: 4 }, mobileIcon: { width: 32, height: 32, borderRadius: 9 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, copy: { flex: 1, minWidth: 0, gap: 1 }, title: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: theme.title }, unreadTitle: { fontWeight: '700' }, message: { fontSize: 11, lineHeight: 16, color: theme.title },
  time: { fontSize: 10, lineHeight: 15, color: theme.secondary, marginTop: 1 },
  dotSlot: { width: 32, alignItems: 'center' }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.active }, disabled: { opacity: 0.45 },
});
