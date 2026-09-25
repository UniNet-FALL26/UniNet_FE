import { Redirect } from 'expo-router';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';

export default function EntryRoute() {
  const { isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href="/(tabs)" />;
}
