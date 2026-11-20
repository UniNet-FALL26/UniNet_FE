import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ChatMessage } from '@/types/messaging';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { ChatAttachment } from './ChatAttachment';

export function ChatMessageBubble({ message, own, first, last, readNames, onActions, onReact }: { message: ChatMessage; own: boolean; first: boolean; last: boolean; readNames: string[]; onActions: () => void; onReact: (reaction: string) => void }) {
  if (message.type === 2) return <Text style={s.system}>{message.content}</Text>;
  const reactions = [...new Set(message.reactions.map(r => r.reactionType))].map(type => ({ type, count: message.reactions.filter(r => r.reactionType === type).length }));
  return <View testID={`chat-message-${message.id}`} style={[s.row, own && s.rowOwn, first && { marginTop: 13 }]}>
    {!own && <View style={s.avatar}>{last && <PersonAvatar person={message.sender} size={27} />}</View>}
    <View style={[s.content, own && { alignItems: 'flex-end' }]}>
      {!own && first && <Text style={s.sender}>{message.sender.fullName}</Text>}
      <View style={[s.bubbleRow, own && { flexDirection: 'row-reverse' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Tùy chọn tin nhắn ${message.recalledAt ? 'đã thu hồi' : (message.content || 'đính kèm').slice(0, 80)}`} onLongPress={onActions} style={[s.bubble, own && s.ownBubble, message.recalledAt != null && s.recalled]}>
          {message.replyTo && <View style={[s.quote, own && s.ownQuote]}><Text style={[s.quoteName, own && s.ownMuted]}>{message.replyTo.senderName}</Text><Text numberOfLines={2} style={[s.quoteText, own && s.ownMuted]}>{message.replyTo.recalled ? 'Tin nhắn đã thu hồi' : message.replyTo.content || 'File đính kèm'}</Text></View>}
          {message.recalledAt ? <Text style={s.recallText}>Tin nhắn đã được thu hồi</Text> : <>
            {!!message.content && <Text selectable style={[s.text, own && s.ownText]}>{message.content}</Text>}
            {message.attachments.length > 0 && <View style={s.attachments}>{message.attachments.map(file => <ChatAttachment key={file.id} file={file} />)}</View>}
          </>}
        </Pressable>
        {!message.recalledAt && <Pressable accessibilityRole="button" accessibilityLabel={`Thao tác tin nhắn ${message.id}`} onPress={onActions} hitSlop={6} style={s.more}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} size={16} tintColor="#91A0B5" /></Pressable>}
      </View>
      {reactions.length > 0 && <View style={s.reactions}>{reactions.map(reaction => <Pressable key={reaction.type} accessibilityRole="button" accessibilityLabel={`${reaction.type} ${reaction.count} cảm xúc`} onPress={() => onReact(reaction.type)} style={s.reaction}><Text style={{ fontSize: 12 }}>{reaction.type} {reaction.count > 1 ? reaction.count : ''}</Text></Pressable>)}</View>}
      {last && <Text style={s.time}>{new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{message.editedAt && !message.recalledAt ? ' · Đã chỉnh sửa' : ''}{own && readNames.length > 0 ? ' · Đã xem' : ''}</Text>}
    </View>
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 3 }, rowOwn: { justifyContent: 'flex-end' }, avatar: { width: 27, marginBottom: 18 }, content: { maxWidth: '85%', minWidth: 0, gap: 3, alignItems: 'flex-start' }, sender: { fontSize: 10, color: '#8190A6', paddingLeft: 10, marginBottom: 2 }, bubbleRow: { flexDirection: 'row', gap: 5, alignItems: 'center', maxWidth: '100%' }, bubble: { flexShrink: 1, backgroundColor: '#F0F4FA', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, gap: 6 }, ownBubble: { backgroundColor: '#1769E0' }, text: { color: '#203653', fontSize: 13, lineHeight: 20 }, ownText: { color: '#FFFFFF' }, more: { width: 23, height: 28, alignItems: 'center', justifyContent: 'center' }, time: { color: '#93A0B3', fontSize: 9, lineHeight: 14, paddingHorizontal: 4, marginTop: 2 }, recalled: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DFE6F0' }, recallText: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', color: '#8997AD' }, quote: { borderLeftWidth: 2, borderColor: '#A9BAD1', backgroundColor: '#E6ECF5', padding: 8, borderRadius: 7, gap: 3 }, ownQuote: { backgroundColor: '#337FEA', borderColor: '#B9D6FF' }, quoteName: { color: '#415878', fontSize: 10, fontWeight: '600' }, quoteText: { color: '#6E8099', fontSize: 11, lineHeight: 16 }, ownMuted: { color: '#E8F1FF' }, attachments: { gap: 6, flexShrink: 1, maxWidth: '100%' }, reactions: { flexDirection: 'row', gap: 4, marginTop: -1 }, reaction: { borderWidth: 1, borderColor: '#DEE7F5', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2 }, system: { color: '#8A98AD', fontSize: 11, textAlign: 'center', paddingVertical: 10 } });
