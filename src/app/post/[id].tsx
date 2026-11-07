import { Loading } from '@/components/ui/Loading';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  const pathname = account?.role === ACCOUNT_ROLE.PARTNER ? '/(company)/company-community'
    : account?.role === ACCOUNT_ROLE.ASSESSOR ? '/(assessor)/assessor-community' : '/(tabs)/community';
  return <Redirect href={{ pathname, params: { postId: id } }} />;
}
