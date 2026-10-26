import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { notificationTheme as theme, notificationVisuals } from '@/constants/notification-presentation';
import { useNotificationCategoryCounts, useNotificationsInbox } from '@/hooks/useNotificationsInbox';
import { groupNotifications } from '@/utils/notifications';
import { NotificationRow } from './NotificationRow';
import { NotificationCategoryFilter } from './NotificationCategoryFilter';
import { useNotificationUpdates } from './NotificationsProvider';

export function NotificationsPanel() {
  const [unreadOnly, setUnreadOnly] = useState(false), [category, setCategory] = useState('');
  const inbox = useNotificationsInbox({ unreadOnly, category });
  const counts = useNotificationCategoryCounts();
  const { unreadCount } = useNotificationUpdates();
  const { width } = useWindowDimensions();
  const narrow = width < 640;
  const groups = groupNotifications(inbox.items);
  return <View style={[s.panel, narrow && s.mobilePanel]} testID="notifications-page">
    <View style={[s.heading, narrow && s.mobileHeading]}>
      <View style={s.headingCopy}><Text accessibilityRole="header" aria-level={1} style={s.title}>Thông báo</Text><Text style={s.subtitle}>Những cập nhật dành cho bạn trên UniNet.</Text></View>
      <View style={[s.headerActions, narrow && s.mobileActions]}>
        <NotificationCategoryFilter value={category} counts={counts} onChange={setCategory} />
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Chỉ hiện chưa đọc" accessibilityState={{ checked: unreadOnly }} onPress={() => setUnreadOnly(value => !value)} style={s.unreadFilter}>
          <SymbolView name={unreadOnly ? { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' } : { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' }} size={16} tintColor={unreadOnly ? theme.blue : theme.secondary} />
          <Text style={s.filterLabel}>{narrow ? 'Chưa đọc' : 'Chỉ hiện chưa đọc'}</Text>{!narrow && unreadCount > 0 && <Text style={s.unreadCount}>{unreadCount}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả đã đọc" disabled={inbox.busy || unreadCount === 0} onPress={() => { void inbox.readAll(); }} style={({ hovered, pressed }) => [s.readAll, narrow && s.mobileReadAll, (hovered || pressed) && s.hovered, (inbox.busy || unreadCount === 0) && s.disabled]}>
          <SymbolView name={{ ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' }} size={17} tintColor={theme.blue} />{!narrow && <Text style={s.actionText}>Đánh dấu tất cả đã đọc</Text>}
        </Pressable>
      </View>
    </View>
    {!!inbox.actionError && <Text accessibilityRole="alert" style={s.error}>{inbox.actionError}</Text>}
    <ScrollView style={s.scroll} contentContainerStyle={[s.list, narrow && s.mobileList]} keyboardShouldPersistTaps="handled">
      {inbox.loading ? <View style={s.state}><ActivityIndicator color={theme.blue} accessibilityLabel="Đang tải thông báo" /><Text style={s.subtitle}>Đang tải thông báo…</Text></View> : inbox.error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{inbox.error}</Text><Pressable accessibilityRole="button" onPress={() => { void inbox.refresh(); }} style={s.retry}><Text style={s.actionText}>Thử lại</Text></Pressable></View> : <>
        {inbox.items.length === 0 && <View style={s.state}><View style={s.emptyIcon}><SymbolView name={notificationVisuals.default.icon} size={30} tintColor={theme.blue} /></View><Text style={s.emptyTitle}>{unreadOnly ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo'}</Text><Text style={s.emptyCopy}>Các cập nhật mới sẽ xuất hiện tại đây.</Text></View>}
        {groups.map(group => <View key={group.label} testID={'notification-group-' + group.label}>
          <Text accessibilityRole="header" aria-level={2} style={s.groupTitle}>{group.label}</Text>
          {group.items.map(item => <NotificationRow key={item.id} item={item} narrow={narrow} disabled={inbox.busy} onOpen={() => { void inbox.open(item); }} onRead={() => inbox.markRead(item)} />)}
        </View>)}
        {inbox.hasMore && <Pressable accessibilityRole="button" disabled={inbox.loadingMore || inbox.busy} onPress={() => { void inbox.loadMore(); }} style={s.loadMore}>{inbox.loadingMore ? <ActivityIndicator color={theme.blue} /> : <Text style={s.actionText}>Xem thêm thông báo</Text>}</Pressable>}
      </>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  mobileActions: { width: '100%', flexWrap: 'nowrap', gap: 8 }, mobileReadAll: { width: 44, justifyContent: 'center' },
  panel: { flex: 1, minHeight: 0, width: '100%', maxWidth: 960, alignSelf: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, marginVertical: 20, overflow: 'hidden' }, mobilePanel: { marginVertical: 10, borderRadius: 12 },
  heading: { paddingHorizontal: 26, paddingTop: 22, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, mobileHeading: { paddingHorizontal: 16, paddingTop: 18 }, headingCopy: { flex: 1, minWidth: 190, gap: 5 }, title: { fontSize: 26, lineHeight: 34, fontWeight: '800', color: theme.title }, subtitle: { fontSize: 13, lineHeight: 20, color: theme.secondary },
  headerActions: { maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, unreadFilter: { minHeight: Platform.OS === 'web' ? 44 : 48, flexDirection: 'row', gap: 6, alignItems: 'center' }, filterLabel: { fontSize: 12, color: theme.secondary }, unreadCount: { fontSize: 12, fontWeight: '700', color: theme.blue },
  readAll: { minHeight: 44, paddingHorizontal: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }, actionText: { color: theme.blue, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.4 }, hovered: { backgroundColor: theme.hovered },
  scroll: { flex: 1, minHeight: 0 }, list: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 12 }, mobileList: { paddingHorizontal: 6 }, groupTitle: { paddingTop: 14, paddingBottom: 10, paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: theme.title, borderBottomWidth: 1, borderBottomColor: theme.divider },
  state: { flex: 1, minHeight: 250, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.badge, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.title, textAlign: 'center' }, emptyCopy: { fontSize: 13, color: theme.secondary, textAlign: 'center' }, error: { color: theme.error, fontSize: 13, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 12 }, retry: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' }, loadMore: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
