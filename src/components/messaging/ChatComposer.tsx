import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';
import { ChatDraftAttachment } from './ChatDraftAttachment';
import type { ChatFileInput, ChatMessage } from '@/types/messaging';

export function ChatComposer({ blocked, busy, reply, editing, onCancel, onSend, onEdit, onTyping }: {
  blocked: boolean; busy: boolean; reply: ChatMessage | null; editing: ChatMessage | null; onCancel: () => void;
  onSend: (content: string, files: ChatFileInput[], clientMessageId: string) => Promise<void>; onEdit: (content: string) => Promise<void>; onTyping: (value: boolean) => void;
}) {
  const [text, setText] = useState(''), [files, setFiles] = useState<ChatFileInput[]>([]), [emoji, setEmoji] = useState(false), [error, setError] = useState('');
  const latestText = useRef(text); latestText.current = text; const oldDraft = useRef(''); const wasEditing = useRef(false);
  const retry = useRef<{ signature: string; id: string } | null>(null); const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (editing) { if (!wasEditing.current) oldDraft.current = latestText.current; wasEditing.current = true; setText(editing.content || ''); }
    else if (wasEditing.current) { wasEditing.current = false; setText(oldDraft.current); }
  }, [editing?.id]);
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);
  function change(value: string) { setText(value); onTyping(value.length > 0); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => onTyping(false), 1800); }
  async function attach() {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'] });
      if (result.canceled) return;
      const combined = [...files, ...result.assets.map(asset => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size, file: asset.file }))];
      if (combined.length > 6 || combined.reduce((total, file) => total + (file.size || 0), 0) > 50 * 1024 * 1024) { setError('Mỗi tin nhắn tối đa 6 file, tổng dung lượng 50 MB.'); return; }
      setFiles(combined);
    } catch { setError('Chưa chọn được file. Vui lòng thử lại.'); }
  }
  async function send() {
    if (busy || blocked || (!text.trim() && !files.length)) return;
    setError('');
    try {
      if (editing) await onEdit(text);
      else { const signature = JSON.stringify([text, files.map(f => [f.uri, f.name]), reply?.id]); if (retry.current?.signature !== signature) retry.current = { signature, id: randomUUID() }; await onSend(text, files, retry.current.id); retry.current = null; setText(''); setFiles([]); }
      onTyping(false); setEmoji(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa gửi được tin nhắn. Bạn có thể thử gửi lại.'); }
  }
  return <View style={s.frame}>
    {(reply || editing) && <View style={s.context}><View style={{ flex: 1, gap: 2 }}><Text style={s.contextTitle}>{editing ? 'Chỉnh sửa tin nhắn' : `Trả lời ${reply!.sender.fullName}`}</Text><Text style={s.fileName} numberOfLines={1}>{(editing || reply)?.recalledAt ? 'Tin nhắn đã thu hồi' : (editing || reply)?.content || 'File đính kèm'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Hủy trả lời hoặc chỉnh sửa" onPress={onCancel} style={s.small}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor="#74849B" /></Pressable></View>}
    {files.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.files}>{files.map((file, index) => <ChatDraftAttachment key={`${file.uri}:${index}`} file={file} disabled={busy} onRemove={() => setFiles(old => old.filter((_, i) => i !== index))} />)}</ScrollView>}
    {emoji && <View style={s.emojis}>{['😀', '😊', '😂', '❤️', '👍', '🎉', '🚀', '🙏', '😮', '😢'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Chèn ${value}`} onPress={() => change(text + value)} style={s.emoji}><Text style={{ fontSize: 22 }}>{value}</Text></Pressable>)}</View>}
    {!!error && <Text role="alert" style={s.error}>{error}</Text>}
    {blocked ? <Text style={s.blocked}>Không thể gửi tin nhắn do quan hệ chặn.</Text> : <View style={s.row}>
      {!editing && <Pressable accessibilityRole="button" accessibilityLabel="Đính kèm ảnh, video hoặc tài liệu" onPress={() => { void attach(); }} disabled={busy} style={s.small}><SymbolView name={{ ios: 'plus.circle', android: 'add_circle_outline', web: 'add_circle_outline' }} size={23} tintColor="#1769E0" /></Pressable>}
      <View style={s.inputFrame}><TextInput accessibilityLabel="Nhập tin nhắn" placeholder={editing ? 'Chỉnh sửa tin nhắn…' : 'Nhắn tin…'} placeholderTextColor="#8997AD" value={text} onChangeText={change} multiline maxLength={8000} editable={!busy} style={s.input}
        onKeyPress={event => { const key = event.nativeEvent as unknown as { key: string; shiftKey?: boolean; isComposing?: boolean }; if (Platform.OS === 'web' && key.key === 'Enter' && !key.shiftKey && !key.isComposing) { event.preventDefault(); void send(); } }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn biểu tượng cảm xúc" onPress={() => setEmoji(value => !value)} disabled={busy} style={s.small}><SymbolView name={{ ios: 'face.smiling', android: 'sentiment_satisfied', web: 'sentiment_satisfied' }} size={21} tintColor="#74849B" /></Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Lưu tin nhắn' : 'Gửi tin nhắn'} disabled={busy || (!text.trim() && !files.length)} onPress={() => { void send(); }} style={[s.send, (busy || (!text.trim() && !files.length)) && { opacity: 0.45 }]}>{busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <SymbolView name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={20} tintColor="#FFFFFF" />}</Pressable>
    </View>}
  </View>;
}
const s = StyleSheet.create({ frame: { padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#E9EEF6', backgroundColor: '#FFFFFF' }, row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, small: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }, inputFrame: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F3F6FA', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 3 }, input: { flex: 1, minWidth: 0, minHeight: 36, maxHeight: 120, fontSize: 13, lineHeight: 20, paddingVertical: 7, color: '#182B49' }, send: { width: 36, height: 36, marginBottom: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#1769E0' }, context: { paddingHorizontal: 12, paddingVertical: 8, borderLeftWidth: 3, borderColor: '#1769E0', backgroundColor: '#F4F7FD', borderRadius: 7, flexDirection: 'row', alignItems: 'center' }, contextTitle: { color: '#1769E0', fontSize: 11, fontWeight: '600' }, files: { gap: 8, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 }, fileName: { fontSize: 11, lineHeight: 17, color: '#6A7C94', flexShrink: 1 }, emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, emoji: { padding: 7 }, error: { color: '#B8324D', fontSize: 12, lineHeight: 18 }, blocked: { color: '#74849B', fontSize: 12, padding: 12, textAlign: 'center' } });
