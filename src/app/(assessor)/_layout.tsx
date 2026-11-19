import { Redirect, type Href } from 'expo-router';
import { Loading } from '@/components/ui/Loading';
import { AssessorShell } from '@/components/assessor/AssessorShell';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { accountHome } from '@/utils/role-navigation';
export default function AssessorLayout() {
  const { account, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (account?.role !== ACCOUNT_ROLE.ASSESSOR) return <Redirect href={accountHome(account?.role) as Href} />;
  return <AssessorShell />;
}
