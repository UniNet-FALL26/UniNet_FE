import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationUpdates } from './NotificationsProvider';

export function NotificationBell() {
  const { account } = useAuthStore();
  const { unreadCount, synchronize } = useNotificationUpdates();
  const openInbox = () => {
    synchronize();
    router.navigate(account?.role === ACCOUNT_ROLE.PARTNER ? '/(company)/company-notifications' : '/(tabs)/notifications');
  };
  return <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" accessibilityHint={unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo chưa đọc'} onPress={openInbox} style={({ pressed }) => [s.bell, pressed && s.pressed]}>
    <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} size={24} tintColor={colors.textSecondary} />
    {unreadCount > 0 && <View testID="notification-unread-badge" style={s.badge}><Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  bell: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, badge: { position: 'absolute', top: 3, right: 1, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: colors.surface, fontWeight: '800', fontSize: 10 }, pressed: { opacity: 0.65 },
});
