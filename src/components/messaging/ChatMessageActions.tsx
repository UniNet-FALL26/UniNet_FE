import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { HubAction, HubModal } from '@/components/projects/hub/ProjectHubUI';
import type { ChatMessage } from '@/types/messaging';

export function ChatMessageActions({ message, own, onClose, onReply, onEdit, onRecall, onReact }: { message: ChatMessage; own: boolean; onClose: () => void; onReply: () => void; onEdit: () => void; onRecall: () => Promise<void>; onReact: (reaction: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Thao tác chưa thành công.'); } finally { setBusy(false); } }
  async function copy() { if (Platform.OS === 'web') await navigator.clipboard.writeText(message.content || ''); else { const clipboard = await import('expo-clipboard'); await clipboard.setStringAsync(message.content || ''); } }
  return <HubModal compact wide={false} maxWidth={360} title={confirm ? 'Thu hồi tin nhắn?' : 'Thao tác tin nhắn'} icon="message" onClose={busy ? () => {} : onClose} footer={<HubAction compact title="Đóng" onPress={onClose} disabled={busy} />}>
    {confirm ? <View style={{ gap: 14 }}><Text style={{ fontSize: 12, lineHeight: 19, color: '#6A7B93' }}>Nội dung và file của tin nhắn sẽ không còn được xem trong cuộc trò chuyện.</Text><HubAction compact title="Xác nhận thu hồi" variant="danger" busy={busy} onPress={() => { void run(onRecall); }} /></View> : <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>{['👍', '❤️', '😂', '😮', '😢', '😡'].map(reaction => <Pressable key={reaction} accessibilityRole="button" accessibilityLabel={`Thả ${reaction}`} disabled={busy} onPress={() => { void run(() => onReact(reaction)); }} style={{ padding: 6 }}><Text style={{ fontSize: 23 }}>{reaction}</Text></Pressable>)}</View>
      <HubAction compact title="Trả lời" icon="message" onPress={onReply} disabled={busy} />
      {!!message.content && <HubAction compact title="Sao chép" icon="document" onPress={() => { void run(copy); }} disabled={busy} />}
      {own && <><HubAction compact title="Chỉnh sửa" icon="edit" onPress={onEdit} disabled={busy} /><HubAction compact title="Thu hồi" icon="trash" variant="danger" onPress={() => setConfirm(true)} disabled={busy} /></>}
    </View>}
    {!!error && <Text role="alert" style={{ color: '#B8324D', fontSize: 12, marginTop: 10 }}>{error}</Text>}
  </HubModal>;
}
