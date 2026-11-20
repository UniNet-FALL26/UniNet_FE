import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { HubAction, HubModal } from '@/components/projects/hub/ProjectHubUI';
import type { ChatMessage } from '@/types/messaging';

export function ChatMessageActions({ message, own, onClose, onReply, onEdit, onRecall, onReact }: { message: ChatMessage; own: boolean; onClose: () => void; onReply: () => void; onEdit: () => void; onRecall: () => Promise<void>; onReact: (reaction: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Thao tác chưa thành công.'); } finally { setBusy(false); } }
  async function copy() { if (Platform.OS === 'web') await navigator.clipboard.writeText(message.content || ''); else { const clipboard = await import('expo-clipboard'); await clipboard.setStringAsync(message.content || ''); } }
  return <HubModal appearance="chat" compact wide={false} maxWidth={400} title={confirm ? 'Thu hồi tin nhắn?' : 'Thao tác tin nhắn'} icon="message" onClose={busy ? () => {} : onClose} footer={<HubAction compact title="Đóng" onPress={onClose} disabled={busy} style={s.close} />}>
    {confirm ? <View style={{ gap: 14 }}><Text style={{ fontSize: 12, lineHeight: 19, color: '#6A7B93' }}>Nội dung và file của tin nhắn sẽ không còn được xem trong cuộc trò chuyện.</Text><HubAction compact title="Xác nhận thu hồi" variant="danger" busy={busy} onPress={() => { void run(onRecall); }} /></View> : <View style={s.actions}>
      <View style={s.reactionSection}><View style={s.reactionBar}>{['👍', '❤️', '😂', '😮', '😢', '😡'].map(reaction => <Pressable key={reaction} accessibilityRole="button" accessibilityLabel={`Thả ${reaction}`} disabled={busy} onPress={() => { void run(() => onReact(reaction)); }} style={({ pressed }) => [s.reaction, pressed && s.reactionPressed, busy && { opacity: 0.5 }]}><Text style={s.emoji}>{reaction}</Text></Pressable>)}</View></View>
      <HubAction compact title="Trả lời" icon="back" style={s.action} onPress={onReply} disabled={busy} />
      {!!message.content && <HubAction compact title="Sao chép" icon="document" style={s.action} onPress={() => { void run(copy); }} disabled={busy} />}
      {own && <><HubAction compact title="Chỉnh sửa" icon="edit" style={s.action} onPress={onEdit} disabled={busy} /><HubAction compact title="Thu hồi" icon="trash" style={s.action} variant="danger" onPress={() => setConfirm(true)} disabled={busy} /></>}
    </View>}
    {!!error && <Text role="alert" style={{ color: '#B8324D', fontSize: 12, marginTop: 10 }}>{error}</Text>}
  </HubModal>;
}

const s = StyleSheet.create({
  actions: { gap: 8 },
  reactionSection: { paddingBottom: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E9EDF5' },
  reactionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EDF2FC', borderRadius: 28, padding: 5 },
  reaction: { flex: 1, minHeight: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reactionPressed: { backgroundColor: '#DCE9FF' },
  emoji: { fontSize: 26, lineHeight: 34 },
  action: { justifyContent: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderColor: '#E1E7F0' },
  close: { minWidth: 78, backgroundColor: '#DCE9FF', borderColor: '#DCE9FF' },
});
