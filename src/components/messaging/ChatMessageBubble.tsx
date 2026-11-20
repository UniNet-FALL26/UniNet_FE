import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '@/types/messaging';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { ChatAttachment } from './ChatAttachment';

export function ChatMessageBubble({ message, own, first, last, readNames, onActions, onReact }: { message: ChatMessage; own: boolean; first: boolean; last: boolean; readNames: string[]; onActions: () => void; onReact: (reaction: string) => void }) {
  if (message.type === 2) return <Text style={s.system}>{message.content}</Text>;
  const mediaOnly = !message.recalledAt && !message.content && !message.replyTo && message.attachments.length > 0 && message.attachments.every(file => file.fileType !== 2);
  const reactions = [...new Set(message.reactions.map(r => r.reactionType))].map(type => ({ type, count: message.reactions.filter(r => r.reactionType === type).length }));
  return <View testID={`chat-message-${message.id}`} style={[s.row, own && s.rowOwn, first && { marginTop: 13 }]}>
    {!own && <View style={s.avatar}>{last && <PersonAvatar person={message.sender} size={27} />}</View>}
    <View style={[s.content, own && { alignItems: 'flex-end' }]}>
      {!own && first && <Text style={s.sender}>{message.sender.fullName}</Text>}
      <View style={[s.bubbleRow, own && { flexDirection: 'row-reverse' }]}>
        <Pressable accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} role={Platform.OS === 'web' ? 'group' : undefined} accessibilityLabel={`Tùy chọn tin nhắn ${message.recalledAt ? 'đã thu hồi' : (message.content || 'đính kèm').slice(0, 80)}`} onLongPress={onActions} style={[s.bubble, own && s.ownBubble, mediaOnly && s.imageOnly, message.recalledAt != null && s.recalled]}>
          {message.replyTo && <View style={[s.quote, own && s.ownQuote]}><Text style={[s.quoteName, own && s.ownMuted]}>{message.replyTo.senderName}</Text><Text numberOfLines={2} style={[s.quoteText, own && s.ownMuted]}>{message.replyTo.recalled ? 'Tin nhắn đã thu hồi' : message.replyTo.content || 'File đính kèm'}</Text></View>}
          {message.recalledAt ? <Text style={s.recallText}>Tin nhắn đã được thu hồi</Text> : <>
            {!!message.content && <Text selectable style={[s.text, own && s.ownText]}>{message.content}</Text>}
            {message.attachments.length > 0 && <View style={s.attachments}>{message.attachments.map(file => <ChatAttachment key={file.id} file={file} />)}</View>}
          </>}
        </Pressable>
      </View>
      {reactions.length > 0 && <View style={s.reactions}>{reactions.map(reaction => <Pressable key={reaction.type} accessibilityRole="button" accessibilityLabel={`${reaction.type} ${reaction.count} cảm xúc`} onPress={() => onReact(reaction.type)} style={s.reaction}><Text style={s.reactionEmoji}>{reaction.type}</Text><Text style={s.reactionCount}>{reaction.count}</Text></Pressable>)}</View>}
      {last && <Text style={s.time}>{new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{message.editedAt && !message.recalledAt ? ' · Đã chỉnh sửa' : ''}{own && readNames.length > 0 ? ' · Đã xem' : ''}</Text>}
    </View>
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 3 }, rowOwn: { justifyContent: 'flex-end' }, avatar: { width: 27, marginBottom: 18 }, content: { maxWidth: '85%', minWidth: 0, gap: 3, alignItems: 'flex-start' }, sender: { fontSize: 10, color: '#8190A6', paddingLeft: 10, marginBottom: 2 }, bubbleRow: { flexDirection: 'row', gap: 5, alignItems: 'center', maxWidth: '100%' }, bubble: { flexShrink: 1, backgroundColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, gap: 6 }, ownBubble: { backgroundColor: '#1769E0' }, imageOnly: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, borderRadius: 0 }, text: { color: '#203653', fontSize: 15, lineHeight: 22 }, ownText: { color: '#FFFFFF' }, time: { color: '#93A0B3', fontSize: 9, lineHeight: 14, paddingHorizontal: 4, marginTop: 2 }, recalled: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DFE6F0' }, recallText: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', color: '#8997AD' }, quote: { borderLeftWidth: 2, borderColor: '#A9BAD1', backgroundColor: '#E6ECF5', padding: 8, borderRadius: 7, gap: 3 }, ownQuote: { backgroundColor: '#337FEA', borderColor: '#B9D6FF' }, quoteName: { color: '#415878', fontSize: 10, fontWeight: '600' }, quoteText: { color: '#6E8099', fontSize: 11, lineHeight: 16 }, ownMuted: { color: '#E8F1FF' }, attachments: { gap: 6, flexShrink: 1, maxWidth: '100%' }, reactions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignSelf: 'flex-end', gap: 4, marginTop: -12, marginRight: 3, zIndex: 1 }, reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 27, borderWidth: 1, borderColor: '#D6E0EE', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 7, paddingVertical: 2, boxShadow: '0 3px 8px rgba(24,49,90,0.14)' }, reactionEmoji: { fontSize: 17, lineHeight: 22 }, reactionCount: { color: '#1D293D', fontSize: 13, lineHeight: 20, fontWeight: '600' }, system: { color: '#8A98AD', fontSize: 11, textAlign: 'center', paddingVertical: 10 } });
