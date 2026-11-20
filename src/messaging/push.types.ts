import type { ChatPushPayload } from '@/types/messaging';
export type PushCallbacks = { foreground: (payload: ChatPushPayload) => void; opened: (payload: ChatPushPayload) => void; token: (token: string) => void };
export function parseChatPush(data: Record<string, unknown> | undefined): ChatPushPayload | null {
  if (!data || data.type !== 'chat_message' || typeof data.conversationId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.conversationId) || typeof data.messageId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.messageId)) return null;
  return { type: 'chat_message', conversationId: data.conversationId, messageId: data.messageId, conversationType: String(data.conversationType) === '1' ? 1 : 0,
    senderAccountId: String(data.senderAccountId || ''), senderName: String(data.senderName || 'UniNet'), senderAvatarUrl: typeof data.senderAvatarUrl === 'string' ? data.senderAvatarUrl : null,
    conversationName: String(data.conversationName || 'Tin nhắn mới'), conversationAvatarUrl: typeof data.conversationAvatarUrl === 'string' ? data.conversationAvatarUrl : null,
    messagePreview: String(data.messagePreview || 'Bạn có tin nhắn mới.'), deepLink: `/messages?conversationId=${data.conversationId}&messageId=${data.messageId}` };
}
