import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStore, useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const { account, isAuthenticated } = useAuthStore();
  useEffect(() => { void authStore.restoreSession(); }, []);
  return <SafeAreaProvider><Stack key={isAuthenticated ? account?.id : 'anonymous'} screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}
