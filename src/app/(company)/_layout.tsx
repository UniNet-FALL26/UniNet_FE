import { Redirect, Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyTabBar } from '@/components/company/company-ui';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';

export default function CompanyLayout() {
  const { isLoading, isAuthenticated, account } = useAuthStore();
  if (isLoading) return <Loading />;
  if (isAuthenticated && account?.role !== ACCOUNT_ROLE.PARTNER) return <Redirect href="/(tabs)" />;
  return <SafeAreaView edges={['top']} style={{ flex: 1 }}><Slot /><CompanyTabBar /></SafeAreaView>;
}
