import { Redirect } from 'expo-router';
import AppTabs from '@/components/app-tabs';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
export default function TabsLayout() {
  const { isLoading, isAuthenticated, account } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (account?.role === ACCOUNT_ROLE.PARTNER) return <Redirect href="/(company)" />;
  return <AppTabs />;
}
