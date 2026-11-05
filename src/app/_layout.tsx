import '@/global.css';
import { useEffect, type ComponentProps } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStore, useAuthStore } from '@/store/auth.store';
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider';
import { tokenStorage } from '@/utils/storage';
import { View } from 'react-native';
import { ToastHost } from '@/components/ui/ToastHost';
import { AccountShell } from '@/components/navigation/AccountShell';

const screenLayout: NonNullable<ComponentProps<typeof Stack>['screenLayout']> = ({ children, route }) => <AccountShell routeName={route.name}>{children}</AccountShell>;

export default function RootLayout() {
  const { account, isAuthenticated } = useAuthStore();
  useEffect(() => { void authStore.restoreSession(); }, []);
  return <SafeAreaProvider><View style={{ flex: 1 }}><NotificationsProvider key={isAuthenticated ? `${account?.id}:${tokenStorage.getSession()?.generation}` : 'anonymous'}><Stack key={isAuthenticated ? account?.id : 'anonymous'} screenOptions={{ headerShown: false }} screenLayout={screenLayout} /></NotificationsProvider><ToastHost /></View></SafeAreaProvider>;
}
