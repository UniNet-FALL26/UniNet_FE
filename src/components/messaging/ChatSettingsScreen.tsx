import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View, useWindowDimensions } from 'react-native';
import { HubAction, HubModal, HubPagePresentation } from '@/components/projects/hub/ProjectHubUI';
import { useAuthStore } from '@/store/auth.store';
import { messagingService } from '@/services/messaging.service';
import { messageRoute } from '@/messaging/device';
import type { ChatConversation } from '@/types/messaging';
import { ChatDetailsModal, type ChatSettingsSection } from './ChatDetailsModal';
import { useChat } from './ChatProvider';

const sections: readonly string[] = ['add', 'link', 'mute', 'files', 'name', 'members', 'project', 'friend', 'role'];

export function ChatSettingsScreen() {
  const { id, section: requestedSection, memberId } = useLocalSearchParams<{ id: string; section?: string; memberId?: string }>();
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const chat = useChat();
  const page = useWindowDimensions().width < 800;
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const section = requestedSection && sections.includes(requestedSection) ? requestedSection as ChatSettingsSection : null;
  const messages = messageRoute(account?.role);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: messages, params: { conversationId: id } });
  };

  useFocusEffect(useCallback(() => {
    if (!isAuthenticated || !id) return;
    const controller = new AbortController();
    setError('');
    messagingService.get(id, controller.signal).then(value => {
      if (!controller.signal.aborted) setConversation(value);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được thông tin trò chuyện.');
    });
    return () => controller.abort();
  // Retry clicks and realtime revisions intentionally restart the focused read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, attempt, chat.revision]));

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <HubPagePresentation.Provider value={page}>
    {conversation && conversation.id === id && !error ? <ChatDetailsModal
      conversation={conversation}
      section={section}
      memberId={memberId}
      onSectionChange={(next, targetMemberId) => {
        if (!next) { goBack(); return; }
        router.push({ pathname: '/chat/[id]/settings', params: { id, section: next, memberId: targetMemberId || '' } });
      }}
      onClose={goBack}
      onChanged={async () => { setConversation(await messagingService.get(id)); chat.refresh(); }}
      onLeft={() => { chat.refresh(); router.dismissTo(messages); }}
      onOpenConversation={conversationId => router.dismissTo({ pathname: messages, params: { conversationId } })}
    /> : <HubModal title="Thông tin trò chuyện" appearance="chat" dismissControl="back" onClose={goBack}>
      {error ? <View style={{ gap: 16 }}><Text accessibilityRole="alert" style={{ color: '#B8324D' }}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : <ActivityIndicator accessibilityLabel="Đang tải thông tin trò chuyện" color="#1769E0" />}
    </HubModal>}
  </HubPagePresentation.Provider>;
}
