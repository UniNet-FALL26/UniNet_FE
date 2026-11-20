import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { notificationTheme } from '@/constants/notification-presentation';

export default function NotificationsScreen() {
  const phone = useWindowDimensions().width < 600;
  return <View style={[styles.page, phone && styles.phonePage]}><NotificationsPanel /></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, minHeight: 0, paddingHorizontal: 10, backgroundColor: notificationTheme.page }, phonePage: { paddingHorizontal: 0 } });
