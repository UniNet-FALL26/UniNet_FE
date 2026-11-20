export type ChatPerson = { accountId: string; profileId: string; fullName: string; avatarUrl: string | null };
export type ChatMember = { person: ChatPerson; role: 0 | 1 | 2; joinedAt: string; leftAt: string | null; lastReadMessageId: string | null };
export type ChatAttachment = { id: string; fileType: 0 | 1 | 2; fileName: string; fileUrl: string; fileSize: number; mimeType: string };
export type ChatMessage = {
  id: string; conversationId: string; sender: ChatPerson; content: string | null; type: 0 | 1 | 2; number: number;
  clientMessageId: string; createdAt: string; editedAt: string | null; recalledAt: string | null;
  replyTo: { id: string; content: string | null; senderName: string; recalled: boolean } | null;
  attachments: ChatAttachment[]; reactions: { accountId: string; reactionType: string }[];
};
export type ChatProject = { id: string; title: string; logoUrl: string | null; description: string };
export type ChatConversation = {
  id: string; type: 0 | 1; name: string; avatarUrl: string | null; peer: ChatPerson | null;
  relationship: 'friends' | 'strangers' | 'group'; isBlocked: boolean; blockedByMe: boolean; myRole: 0 | 1 | 2; isPinned: boolean;
  mutedUntil: string | null; unreadCount: number; createdAt: string; lastMessageAt: string | null;
  lastMessage: ChatMessage | null; project: ChatProject | null; members: ChatMember[];
};
export type ChatPage<T> = { items: T[]; hasMore: boolean; nextCursor: number | null };
export type DirectChat = { conversationId: string | null; peer: ChatPerson; isBlocked: boolean };
export type ChatPushPayload = { type: 'chat_message'; conversationId: string; messageId: string; conversationType: 0 | 1; senderAccountId: string; senderName: string; senderAvatarUrl: string | null; conversationName: string; conversationAvatarUrl: string | null; messagePreview: string; deepLink: string };
export type ChatEvent = { kind: string; conversationId: string; messageId: string | null; message: ChatMessage | null; notification: ChatPushPayload | null; notify: boolean; occurredAt: string };
export type ChatFileInput = { uri: string; name: string; mimeType?: string; size?: number; file?: File };
export type ChatGroupInput = { name: string; avatarUrl: string | null; accountIds: string[]; projectId?: string | null; memberProfileIds?: string[] };
