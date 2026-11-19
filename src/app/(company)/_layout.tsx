import { CompanyShell } from '@/components/navigation/CompanyShell';
import { accountHome } from '@/utils/role-navigation';
import { Redirect, type Href } from 'expo-router';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';

export default function CompanyLayout() {
  const { isLoading, isAuthenticated, account } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (isAuthenticated && account?.role !== ACCOUNT_ROLE.PARTNER) return <Redirect href={accountHome(account?.role) as Href} />;
  return <CompanyShell />;
}
