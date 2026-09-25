import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStore } from '@/store/auth.store';

export default function RootLayout() {
  useEffect(() => { void authStore.restoreSession(); }, []);
  return <SafeAreaProvider><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}
