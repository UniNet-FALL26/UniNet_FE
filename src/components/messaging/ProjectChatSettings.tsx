import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { useAuthStore } from '@/store/auth.store';
import { messagingService } from '@/services/messaging.service';
import { messageRoute } from '@/messaging/device';
import { HubAction, HubIcon, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { Field } from '@/components/projects/hub/ProjectHubFields';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';

export function ProjectChatSettings({ project }: { project: HubProject }) {
  const { account } = useAuthStore();
  const [chat, setChat] = useState<{ conversationId: string | null; canAccess: boolean } | null>(null);
  const [open, setOpen] = useState(false), [name, setName] = useState(project.title), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''); const lock = useRef(false);
  useFocusEffect(useCallback(() => { const controller = new AbortController(); setError(''); messagingService.projectChat(project.id, controller.signal).then(value => { if (!controller.signal.aborted) setChat(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được nhóm dự án.'); }); return () => controller.abort(); }, [project.id]));
  const members = project.members.filter(member => member.status === 0 && member.userId !== account?.profile?.id);
  const go = (id: string) => router.push({ pathname: messageRoute(account?.role), params: { conversationId: id } });
  async function create() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const group = await messagingService.createGroup({ name, avatarUrl: project.logoUrl, accountIds: [], memberProfileIds: selected, projectId: project.id }); setChat({ conversationId: group.id, canAccess: true }); setOpen(false); go(group.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tạo được nhóm.'); try { setChat(await messagingService.projectChat(project.id)); } catch {} }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={s.section} accessibilityLabel="Nhóm chat dự án">
    <View style={s.row}><View style={s.icon}><HubIcon name="message" size={20} /></View><View style={s.copy}><Text style={s.title}>Nhóm chat dự án</Text><Text style={s.hint}>Trao đổi cùng những thành viên được chọn vào nhóm.</Text></View></View>
    {chat?.conversationId ? <View style={s.row}><Text style={[s.hint, s.copy]}>{chat.canAccess ? 'Dự án đã liên kết với một nhóm chat.' : 'Dự án đã có nhóm chat. Quản trị viên nhóm cần thêm bạn trước khi bạn có thể xem.'}</Text>{chat.canAccess && <HubAction compact title="Mở nhóm chat" icon="message" variant="primary" onPress={() => go(chat.conversationId!)} />}</View> : project.isOwner && <HubAction compact title="Tạo nhóm chat" icon="plus" onPress={() => { setSelected([]); setName(project.title); setError(''); setOpen(true); }} disabled={!chat} />}
    {!!error && !open && <Text role="alert" style={s.error}>{error}</Text>}
    {open && <HubModal appearance="chat" compact wide={false} maxWidth={480} title="Tạo nhóm chat dự án" icon="message" onClose={busy ? () => {} : () => setOpen(false)} footer={<><HubAction compact title="Hủy" disabled={busy} onPress={() => setOpen(false)} /><HubAction compact title="Tạo nhóm" variant="primary" busy={busy} disabled={!name.trim() || !selected.length || !!chat?.conversationId} onPress={() => { void create(); }} /></>}>
      <Field compact label="Tên nhóm" value={name} onChange={setName} maxLength={150} />
      <Text style={[s.hint, { marginVertical: 12 }]}>Bạn là chủ nhóm. Chọn ít nhất 1 thành viên; thành viên dự án và nhóm chat được quản lý riêng.</Text>
      {members.map(member => <Pressable key={member.userId} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(member.userId), disabled: busy }} disabled={busy} onPress={() => setSelected(old => old.includes(member.userId) ? old.filter(id => id !== member.userId) : [...old, member.userId])} style={s.person}><PersonAvatar person={member} size={34} /><Text style={[s.copy, s.personName]}>{member.fullName}</Text><HubIcon name={selected.includes(member.userId) ? 'check' : 'plus'} size={17} /></Pressable>)}
      {!members.length && <Text style={s.hint}>Dự án cần có thêm ít nhất một thành viên.</Text>}
      {!!error && <Text role="alert" style={s.error}>{error}</Text>}
      {chat?.conversationId && chat.canAccess && <HubAction compact title="Mở nhóm đã liên kết" onPress={() => { setOpen(false); go(chat.conversationId!); }} />}
    </HubModal>}
  </View>;
}
const s = StyleSheet.create({ section: { borderWidth: 1, borderColor: '#E7ECF7', backgroundColor: '#FFF', borderRadius: 12, padding: 18, gap: 14, alignItems: 'flex-start' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', flexWrap: 'wrap' }, icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDF4FF', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 120, gap: 4 }, title: { fontSize: 14, fontWeight: '700', color: '#183251' }, hint: { fontSize: 11, lineHeight: 18, color: '#71829C' }, error: { color: '#B8324D', fontSize: 12, lineHeight: 18 }, person: { paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 }, personName: { fontSize: 12, color: '#183251' } });
