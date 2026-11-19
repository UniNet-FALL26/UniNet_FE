import { Redirect } from 'expo-router';
import ProfileScreen from '../(tabs)/profile';
import { useAuthStore } from '@/store/auth.store';
import { Loading } from '@/components/ui/Loading';
import { ACCOUNT_ROLE } from '@/constants/roles';

export default function ProfileFriendsScreen() {
  const { account, isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (account?.role !== ACCOUNT_ROLE.STUDENT) return <Redirect href="/(tabs)/profile" />;
  return <ProfileScreen initialTab="friends" />;
}
