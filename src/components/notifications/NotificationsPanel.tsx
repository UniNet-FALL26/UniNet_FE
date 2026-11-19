import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { notificationTheme as theme, notificationVisuals } from '@/constants/notification-presentation';
import { useNotificationsInbox } from '@/hooks/useNotificationsInbox';
import { groupNotifications } from '@/utils/notifications';
import { NotificationRow } from './NotificationRow';
import { useNotificationUpdates } from './NotificationsProvider';

const tabs = [{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: 'Chưa đọc' }, { value: 'read', label: 'Đã đọc' }] as const;

export function NotificationsPanel({ description = 'Những cập nhật dành cho bạn trên UniNet.' }: { description?: string } = {}) {
  const [status, setStatus] = useState<'all' | 'unread' | 'read'>('all');
  const inbox = useNotificationsInbox({ unreadOnly: status === 'unread', readOnly: status === 'read' });
  const { unreadCount } = useNotificationUpdates();
  const narrow = useWindowDimensions().width < 640;
  const groups = groupNotifications(inbox.items);
  return <View style={[s.panel, narrow && s.mobilePanel]} testID="notifications-page" accessibilityLabel={`Thông báo. ${description}`}>
    <View style={[s.toolbar, narrow && s.mobileToolbar]}>
      <View accessibilityRole="tablist" accessibilityLabel="Trạng thái thông báo" style={s.tabs}>
        {tabs.map(tab => {
          const selected = status === tab.value;
          return <Pressable key={tab.value} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={() => setStatus(tab.value)} style={({ hovered, pressed }) => [s.tab, narrow && s.mobileTab, selected && s.selectedTab, (hovered || pressed) && s.hovered]}>
            <Text style={[s.tabLabel, selected && s.selectedLabel]}>{tab.label}</Text>
          </Pressable>;
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả đã đọc" disabled={inbox.busy || unreadCount === 0} onPress={() => { void inbox.readAll(); }} style={({ hovered, pressed }) => [s.readAll, narrow && s.mobileReadAll, (hovered || pressed) && s.hovered, (inbox.busy || unreadCount === 0) && s.disabled]}>
        <SymbolView name={{ ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' }} size={18} tintColor={theme.blue} />
        {!narrow && <Text style={s.actionText}>Đánh dấu tất cả đã đọc</Text>}
      </Pressable>
    </View>
    {!!inbox.actionError && <Text accessibilityRole="alert" style={s.error}>{inbox.actionError}</Text>}
    <ScrollView style={s.scroll} contentContainerStyle={[s.list, narrow && s.mobileList]} keyboardShouldPersistTaps="handled">
      {inbox.loading ? <View style={s.state}><ActivityIndicator color={theme.blue} accessibilityLabel="Đang tải thông báo" /><Text style={s.emptyCopy}>Đang tải thông báo…</Text></View> : inbox.error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{inbox.error}</Text><Pressable accessibilityRole="button" onPress={() => { void inbox.refresh(); }} style={s.retry}><Text style={s.actionText}>Thử lại</Text></Pressable></View> : <>
        {inbox.items.length === 0 && <View style={s.state}><View style={s.emptyIcon}><SymbolView name={notificationVisuals.default.icon} size={28} tintColor={theme.blue} /></View><Text style={s.emptyTitle}>{status === 'unread' ? 'Bạn đã đọc hết thông báo' : status === 'read' ? 'Chưa có thông báo đã đọc' : 'Chưa có thông báo'}</Text><Text style={s.emptyCopy}>Các cập nhật mới sẽ xuất hiện tại đây.</Text></View>}
        {groups.map(group => <View key={group.label} testID={'notification-group-' + group.label}>
          <Text accessibilityRole="header" aria-level={2} style={s.groupTitle}>{group.label}</Text>
          {group.items.map(item => <NotificationRow key={item.id} item={item} narrow={narrow} disabled={inbox.busy} onOpen={() => { void inbox.open(item); }} />)}
        </View>)}
        {inbox.hasMore && <Pressable accessibilityRole="button" disabled={inbox.loadingMore || inbox.busy} onPress={() => { void inbox.loadMore(); }} style={s.loadMore}>{inbox.loadingMore ? <ActivityIndicator color={theme.blue} /> : <Text style={s.actionText}>Xem thêm thông báo</Text>}</Pressable>}
      </>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  panel: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1080, alignSelf: 'center', backgroundColor: '#FAFCFF', borderWidth: 1, borderColor: theme.border, borderRadius: 20, marginVertical: 20, overflow: 'hidden', paddingHorizontal: 18, paddingBottom: 14 },
  mobilePanel: { marginVertical: 10, borderRadius: 16, paddingHorizontal: 10, paddingBottom: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.divider, minHeight: 58, gap: 12 }, mobileToolbar: { gap: 2 },
  tabs: { flexDirection: 'row', alignItems: 'stretch', minWidth: 0 }, tab: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 2, borderBottomColor: 'transparent' }, mobileTab: { paddingHorizontal: 8, gap: 5 }, selectedTab: { borderBottomColor: theme.active },
  tabLabel: { fontSize: 14, fontWeight: '700', color: theme.title }, selectedLabel: { color: theme.blue },
  readAll: { minHeight: 44, paddingHorizontal: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }, mobileReadAll: { width: 36, justifyContent: 'center', paddingHorizontal: 0 }, actionText: { color: theme.blue, fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.4 }, hovered: { backgroundColor: theme.hovered },
  scroll: { flex: 1, minHeight: 0 }, list: { flexGrow: 1, paddingBottom: 10 }, mobileList: { paddingBottom: 4 }, groupTitle: { paddingTop: 16, paddingBottom: 9, fontSize: 14, fontWeight: '700', color: theme.title },
  state: { flex: 1, minHeight: 240, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: theme.badge, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.title, textAlign: 'center' }, emptyCopy: { fontSize: 13, color: theme.secondary, textAlign: 'center' }, error: { color: theme.error, fontSize: 13, lineHeight: 20, padding: 12 }, retry: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' }, loadMore: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
