import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';

export default function SettingsScreen() {
  const { account, isAuthenticated } = useAuthStore();
  const { account: openAccount } = useLocalSearchParams<{ account?: string }>();
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web' && width >= 1200 && isAuthenticated && account?.role === ACCOUNT_ROLE.STUDENT && openAccount === '1') {
    return <Redirect href={{ pathname: '/(tabs)/profile', params: { account: '1' } }} />;
  }
  return <SettingsPanel />;
}
