import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HubAction, HubIcon, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { projectHubService } from '@/services/project-hub.service';
import { messagingService } from '@/services/messaging.service';
import type { HubMember } from '@/types/project-hub';
import type { ChatConversation, ChatPerson } from '@/types/messaging';
import { ChatPeoplePicker } from './ChatPeoplePicker';

type SelectedPerson = Pick<ChatPerson, 'profileId' | 'fullName' | 'avatarUrl'>;
export function AddChatMembers({ conversation, onClose, onSaved }: { conversation: ChatConversation; onClose: () => void; onSaved: () => Promise<void> }) {
  const project = conversation.project;
  const [source, setSource] = useState<'project' | 'friends'>(project ? 'project' : 'friends');
  const [members, setMembers] = useState<HubMember[]>([]), [selected, setSelected] = useState<SelectedPerson[]>([]);
  const [loading, setLoading] = useState(!!project), [loadError, setLoadError] = useState(''), [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''); const lock = useRef(false);
  useEffect(() => {
    if (!project) return;
    const controller = new AbortController();
    projectHubService.get(project.id, controller.signal).then(value => { if (!controller.signal.aborted) setMembers(value.members); })
      .catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chưa tải được thành viên dự án.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [project?.id, attempt]);
  const current = conversation.members.filter(member => !member.leftAt);
  const candidates = members.filter(member => member.status === 0 && !current.some(existing => existing.person.profileId === member.userId));
  const selectedIds = selected.map(person => person.profileId);
  function toggle(person: SelectedPerson) {
    if (lock.current) return;
    setError('');
    if (selectedIds.includes(person.profileId)) setSelected(old => old.filter(existing => existing.profileId !== person.profileId));
    else if (selected.length < 50) setSelected(old => [...old, person]);
    else setError('Mỗi lần thêm tối đa 50 người.');
  }
  async function save() {
    if (lock.current || !selected.length) return;
    lock.current = true; setBusy(true); setError('');
    try { await messagingService.addMembers(conversation.id, [], selectedIds); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa thêm được thành viên.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={520} title="Thêm thành viên" icon="invite" onClose={() => { if (!lock.current) onClose(); }} footer={<HubAction compact title={selected.length ? `Thêm vào nhóm (${selected.length})` : 'Thêm vào nhóm'} variant="primary" disabled={!selected.length} busy={busy} onPress={() => { void save(); }} />}>
    {project && <View accessibilityRole="tablist" accessibilityLabel="Nguồn thành viên" style={s.tabs}>{([{ id: 'project', title: 'Thành viên dự án' }, { id: 'friends', title: 'Bạn bè' }] as const).map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.title} aria-selected={source === tab.id} disabled={busy} onPress={() => setSource(tab.id)} style={[s.tab, source === tab.id && s.active]}><Text style={[s.tabText, source === tab.id && s.activeText]}>{tab.title}</Text></Pressable>)}</View>}
    {project && source === 'project' ? <View style={s.list}>
      <View style={s.project}><HubIcon name="folder" size={19} /><View style={s.copy}><Text style={s.projectName}>{project.title}</Text><Text style={s.hint}>Chọn thành viên đã được duyệt vào dự án để thêm vào nhóm chat. Không cần kết bạn trước.</Text></View></View>
      {loading ? <ActivityIndicator accessibilityLabel="Đang tải thành viên dự án" color="#1769FF" style={s.loading} /> : loadError ? <View style={s.errorBox}><Text role="alert" style={s.error}>{loadError}</Text><HubAction compact title="Tải lại thành viên" disabled={busy} onPress={() => { setLoading(true); setLoadError(''); setAttempt(value => value + 1); }} /></View> : candidates.length ? candidates.map(member => {
        const checked = selectedIds.includes(member.userId);
        return <Pressable key={member.userId} accessibilityRole="checkbox" accessibilityLabel={member.fullName} accessibilityState={{ checked, disabled: busy }} disabled={busy} onPress={() => toggle({ profileId: member.userId, fullName: member.fullName, avatarUrl: member.avatarUrl })} style={[s.person, checked && s.checked]}><PersonAvatar person={member} size={36} /><View style={s.copy}><Text style={s.name}>{member.fullName}</Text><Text style={s.hint}>{member.role}</Text></View><HubIcon name={checked ? 'check' : 'plus'} size={19} /></Pressable>;
      }) : <Text style={s.empty}>Chưa có thành viên dự án nào cần thêm vào nhóm chat.</Text>}
    </View> : <ChatPeoplePicker friendsOnly selected={[]} selectedProfileIds={selectedIds} disabled={busy} exclude={current.map(member => member.person.accountId)} onSelect={toggle} />}
    {!!selected.length && <View style={s.selection}><Text style={s.selectionTitle}>Đã chọn {selected.length} người</Text><View style={s.chips}>{selected.map(person => <Pressable key={person.profileId} accessibilityRole="button" accessibilityLabel={`Bỏ chọn ${person.fullName}`} disabled={busy} onPress={() => toggle(person)} style={s.chip}><Text style={s.chipName} numberOfLines={1}>{person.fullName}</Text><HubIcon name="close" size={13} /></Pressable>)}</View></View>}
    {!!error && <Text role="alert" style={s.error}>{error}</Text>}
  </HubModal>;
}
const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#F0F4FA', borderRadius: 11, padding: 4, gap: 4, marginBottom: 16 }, tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, active: { backgroundColor: '#FFFFFF' }, tabText: { fontSize: 13, color: '#6B7D98', fontWeight: '600' }, activeText: { color: '#1769FF' },
  list: { gap: 9 }, project: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 11, backgroundColor: '#F4F8FF', marginBottom: 5 }, copy: { flex: 1, minWidth: 0, gap: 3 }, projectName: { fontSize: 13, fontWeight: '600', color: '#203653' }, hint: { fontSize: 11, lineHeight: 17, color: '#7B8BA3' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: '#E6EDF7', borderRadius: 11 }, checked: { backgroundColor: '#EFF5FF', borderColor: '#B5CEFF' }, name: { fontSize: 13, color: '#203653', fontWeight: '500' }, loading: { margin: 20 }, empty: { color: '#8190A6', fontSize: 12, lineHeight: 19, textAlign: 'center', padding: 20 },
  errorBox: { padding: 12, gap: 10, borderRadius: 10, backgroundColor: '#FFF5F5' }, error: { color: '#B8324D', fontSize: 12, lineHeight: 18 }, selection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#E8EDF5', gap: 8 }, selectionTitle: { fontSize: 12, color: '#526986', fontWeight: '600' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: '#EAF2FF' }, chipName: { fontSize: 11, color: '#1769FF', flexShrink: 1 },
});
