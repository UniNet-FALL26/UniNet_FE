import { Redirect } from 'expo-router';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { accountHome } from '@/utils/role-navigation';
import type { Href } from 'expo-router';

export default function EntryRoute() {
  const { isLoading, isAuthenticated, account } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href={accountHome(account?.role) as Href} />;
}
