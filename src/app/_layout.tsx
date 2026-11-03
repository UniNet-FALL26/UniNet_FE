import '@/global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStore, useAuthStore } from '@/store/auth.store';
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider';
import { tokenStorage } from '@/utils/storage';
import { View } from 'react-native';
import { ToastHost } from '@/components/ui/ToastHost';

export default function RootLayout() {
  const { account, isAuthenticated } = useAuthStore();
  useEffect(() => { void authStore.restoreSession(); }, []);
  return <SafeAreaProvider><View style={{ flex: 1 }}><NotificationsProvider key={isAuthenticated ? `${account?.id}:${tokenStorage.getSession()?.generation}` : 'anonymous'}><Stack key={isAuthenticated ? account?.id : 'anonymous'} screenOptions={{ headerShown: false }} /></NotificationsProvider><ToastHost /></View></SafeAreaProvider>;
}
