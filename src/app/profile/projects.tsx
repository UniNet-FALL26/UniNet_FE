import { Redirect } from 'expo-router';
import ProfileScreen from '../(tabs)/profile';
import { useAuthStore } from '@/store/auth.store';
import { Loading } from '@/components/ui/Loading';

export default function ProfileProjectsScreen() {
  const { isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <ProfileScreen initialTab="projects" />;
}
