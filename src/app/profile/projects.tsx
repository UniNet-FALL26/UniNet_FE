import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Loading } from '@/components/ui/Loading';

export default function ProfileProjectsScreen() {
  const params = useLocalSearchParams();
  const { isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Redirect href={{ pathname: '/(tabs)/profile', params: { ...params, tab: 'projects' } }} />;
}
