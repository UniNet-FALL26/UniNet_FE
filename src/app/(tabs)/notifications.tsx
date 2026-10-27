import { StyleSheet, View } from 'react-native';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { notificationTheme } from '@/constants/notification-presentation';

export default function NotificationsScreen() {
  return <View style={styles.page}><NotificationsPanel /></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, minHeight: 0, paddingHorizontal: 10, backgroundColor: notificationTheme.page } });
