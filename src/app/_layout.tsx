import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStore, useAuthStore } from '@/store/auth.store';
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider';
import { tokenStorage } from '@/utils/storage';

export default function RootLayout() {
  const { account, isAuthenticated } = useAuthStore();
  useEffect(() => { void authStore.restoreSession(); }, []);
  return <SafeAreaProvider><NotificationsProvider key={isAuthenticated ? `${account?.id}:${tokenStorage.getSession()?.generation}` : 'anonymous'}><Stack key={isAuthenticated ? account?.id : 'anonymous'} screenOptions={{ headerShown: false }} /></NotificationsProvider></SafeAreaProvider>;
}
