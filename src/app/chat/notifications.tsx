import { Redirect, router } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { HubPagePresentation } from '@/components/projects/hub/ProjectHubUI';
import { PushSettings } from '@/components/messaging/MessagingScreen';
import { messageRoute } from '@/messaging/device';
import { useAuthStore } from '@/store/auth.store';

export default function ChatNotificationsScreen() {
  const page = useWindowDimensions().width < 800;
  const { account, isAuthenticated, isLoading } = useAuthStore();
  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <HubPagePresentation.Provider value={page}><PushSettings onClose={() => {
    if (router.canGoBack()) router.back();
    else router.replace(messageRoute(account?.role));
  }} /></HubPagePresentation.Provider>;
}
