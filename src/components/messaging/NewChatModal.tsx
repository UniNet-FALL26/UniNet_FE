import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { imageService } from '@/services/image.service';
import { messagingService } from '@/services/messaging.service';
import type { ChatConversation, ChatPerson } from '@/types/messaging';
import { HubAction, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { Field } from '@/components/projects/hub/ProjectHubFields';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { ChatPeoplePicker } from './ChatPeoplePicker';

export function NewChatModal({ onClose, onPerson, onGroup }: { onClose: () => void; onPerson: (person: ChatPerson) => void; onGroup: (conversation: ChatConversation) => void }) {
  const [mode, setMode] = useState<'direct' | 'group'>('direct'), [selected, setSelected] = useState<ChatPerson[]>([]), [name, setName] = useState(''), [avatar, setAvatar] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  function select(person: ChatPerson) { if (mode === 'direct') { onPerson(person); return; } setSelected(old => old.some(item => item.accountId === person.accountId) ? old.filter(item => item.accountId !== person.accountId) : [...old, person]); }
  async function photo() { setBusy(true); setError(''); try { const image = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 }); if (!image.canceled) setAvatar((await imageService.upload(image.assets[0])).imageUrl); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa đổi được ảnh nhóm.'); } finally { setBusy(false); } }
  async function create() { setBusy(true); setError(''); try { const group = await messagingService.createGroup({ name, avatarUrl: avatar, accountIds: selected.map(p => p.accountId) }); onGroup(group); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tạo được nhóm.'); } finally { setBusy(false); } }
  return <HubModal appearance="chat" compact wide={false} maxWidth={480} title="Tạo cuộc trò chuyện" icon="message" onClose={busy ? () => {} : onClose} footer={<><HubAction compact title="Đóng" onPress={onClose} disabled={busy} />{mode === 'group' && <HubAction compact title="Tạo nhóm" variant="primary" onPress={() => { void create(); }} busy={busy} disabled={selected.length < 2} />}</>}>
    <View style={s.tabs}>{([{ value: 'direct', label: 'Nhắn tin' }, { value: 'group', label: 'Tạo nhóm' }] as const).map(tab => <Pressable key={tab.value} accessibilityRole="tab" aria-selected={mode === tab.value} onPress={() => { setMode(tab.value); setSelected([]); setError(''); }} style={[s.tab, mode === tab.value && s.active]}><Text style={[s.tabText, mode === tab.value && { color: '#1769E0' }]}>{tab.label}</Text></Pressable>)}</View>
    {mode === 'group' && <><View style={s.groupHead}><PersonAvatar person={{ fullName: name || 'Nhóm', avatarUrl: avatar }} size={46} /><HubAction compact title="Ảnh nhóm" icon="camera" disabled={busy} onPress={() => { void photo(); }} /></View><Field compact label="Tên nhóm" value={name} onChange={setName} maxLength={150} placeholder="Ví dụ: Nhóm phát triển UniNet" /><Text style={s.hint}>Chọn ít nhất 2 người bạn. Bạn sẽ là chủ nhóm.</Text></>}
    <ChatPeoplePicker key={mode} friendsOnly={mode === 'group'} selected={selected} onSelect={select} />
    {!!error && <Text role="alert" style={s.error}>{error}</Text>}
  </HubModal>;
}
const s = StyleSheet.create({ tabs: { flexDirection: 'row', backgroundColor: '#F0F4FA', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9 }, active: { backgroundColor: '#FFFFFF', boxShadow: '0 2px 5px rgba(27,48,79,0.08)' }, tabText: { color: '#6A7B93', fontSize: 13, fontWeight: '600' }, groupHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18, padding: 14, borderRadius: 12, backgroundColor: '#F7F9FD' }, hint: { color: '#8190A6', fontSize: 12, lineHeight: 19, marginBottom: 14, marginTop: 8 }, error: { fontSize: 12, color: '#B8324D', lineHeight: 18, marginTop: 10 } });
