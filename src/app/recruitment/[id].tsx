import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { HubPagePresentation } from '@/components/projects/hub/ProjectHubUI';
import { RecruitmentPostDialog } from '@/components/projects/hub/RecruitmentPostDialog';
import { useAuthStore } from '@/store/auth.store';

export default function RecruitmentPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const phone = useWindowDimensions().width < 600;
  const { isAuthenticated, isLoading } = useAuthStore();
  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <HubPagePresentation.Provider value={phone}>
    <RecruitmentPostDialog projectId={id} onClose={() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/find-teammates');
    }} />
  </HubPagePresentation.Provider>;
}
