import { Redirect } from 'expo-router';
import AppTabs from '@/components/app-tabs';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <AppTabs />;
}
