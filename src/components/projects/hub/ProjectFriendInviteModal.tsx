import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { friendshipService } from '@/services/friendship.service';
import { projectHubService } from '@/services/project-hub.service';
import type { FriendPage, FriendPerson } from '@/types/friendship';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { PersonAvatar } from './PersonAvatar';
import { messageOf } from './ProjectHubFields';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { canInviteProjectFriends } from '@/utils/project-invitations';

export function ProjectFriendInviteModal({ project, onClose, onInvited }: { project: HubProject; onClose: () => void; onInvited: () => void }) {
  const { account } = useAuthStore();
  const currentAccount = useRef(account?.id); currentAccount.current = account?.id;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canInvite = project.isOwner && canInviteProjectFriends(project);
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [data, setData] = useState<FriendPage | null>(null);
  const [selected, setSelected] = useState<FriendPerson | null>(null), [role, setRole] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loadError, setLoadError] = useState(''), [attempt, setAttempt] = useState(0);
  const lock = useRef(false), generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(), request = ++generation.current;
    setLoading(true); setLoadError('');
    if (!canInvite) { setLoading(false); setData(null); return () => controller.abort(); }
    const timer = setTimeout(() => friendshipService.list('friends', query.trim(), page, controller.signal, project.id).then(result => { if (!controller.signal.aborted && request === generation.current) { const last = Math.max(1, Math.ceil(result.total / 20)); if (page > last) setPage(last); else setData(result); } }).catch(cause => { if (!controller.signal.aborted) setLoadError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), query ? 250 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, page, project.id, attempt, canInvite, account?.id]);
  const close = () => { if (!lock.current) onClose(); };
  async function invite() {
    if (lock.current || !selected || !canInvite) return;
    if (!role.trim()) { setError('Vui lòng nhập vị trí mời tham gia.'); return; }
    const actor = currentAccount.current, session = tokenStorage.getSession()?.generation;
    const active = () => mounted.current && currentAccount.current === actor && tokenStorage.getSession()?.generation === session;
    lock.current = true; setBusy(true); setError('');
    try {
      await projectHubService.sendRequest(project.id, { requestType: 1, invitedUserId: selected.profileId, role: role.trim() });
      if (active()) { onInvited(); onClose(); }
    } catch (cause) { if (active()) setError(messageOf(cause));
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <HubModal compact wide={false} icon="invite" title="Mời thành viên" subtitle="Chọn một người bạn và nhập vị trí muốn mời tham gia dự án." onClose={close}
    footer={<><HubAction compact title="Hủy" disabled={busy} onPress={close} /><HubAction compact title="Gửi lời mời" icon="invite" variant="primary" busy={busy} disabled={!selected || !role.trim() || !canInvite} onPress={() => void invite()} /></>}>
    {!canInvite && <Text style={ui.muted}>Dự án hiện không nhận lời mời thành viên.</Text>}
    <View style={s.search}><HubIcon name="search" size={18} /><TextInput accessibilityLabel="Tìm kiếm bạn bè" value={query} editable={!busy} onChangeText={value => { setQuery(value); setPage(1); }} placeholder="Tìm bạn bè theo tên hoặc nickname…" maxLength={100} style={s.input} /></View>
    <Text style={s.hint}>Bạn bè có thể mời</Text>
    {loading ? <ActivityIndicator color={c.primary} /> : <View style={{ gap: 8 }}>{data?.items.map(person => {
      const checked = selected?.profileId === person.profileId;
      return <Pressable key={person.accountId} accessibilityRole="radio" accessibilityLabel={person.fullName} accessibilityState={{ checked, disabled: busy }} aria-checked={checked} disabled={busy} onPress={() => setSelected(person)} style={[s.person, checked && s.chosen]}><PersonAvatar person={person} size={34} /><View style={{ flex: 1, minWidth: 0 }}><Text style={s.name}>{person.fullName}</Text><Text style={s.hint}>@{person.nickname}{person.relationship === 'friends' ? ' · Bạn bè' : ''}</Text></View><HubIcon name={checked ? 'check' : 'plus'} size={18} /></Pressable>;
    })}{canInvite && !data?.items.length && !loadError && <Text style={s.hint}>{query.trim() ? 'Không có bạn bè phù hợp để mời.' : 'Chưa có bạn bè có thể mời. Thành viên hiện tại và lời mời đang chờ đã được ẩn.'}</Text>}</View>}
    {!!data && data.total > 20 && <View style={s.row}><HubAction compact title="Trang trước" disabled={busy || page === 1} onPress={() => setPage(v => v - 1)} /><Text style={s.hint}>{page} / {Math.ceil(data.total / 20)}</Text><HubAction compact title="Trang sau" disabled={busy || page * 20 >= data.total} onPress={() => setPage(v => v + 1)} /></View>}
    {selected && <View style={s.selection}>
      <Text style={s.name}>Mời {selected.fullName}</Text>
      <Text style={s.hint}>Vị trí trong dự án</Text>
      <TextInput accessibilityLabel="Vị trí mời tham gia" value={role} onChangeText={setRole} editable={!busy} maxLength={150} placeholder="Ví dụ: Backend developer" style={ui.input} />
    </View>}
    {!!error && <View style={{ gap: 8, marginTop: 12 }}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Tải lại danh sách" disabled={busy} onPress={() => setAttempt(v => v + 1)} /></View>}
    {!!loadError && <View style={{ gap: 8, marginTop: 12 }}><Text accessibilityRole="alert" style={ui.error}>{loadError}</Text><HubAction compact title="Thử tải lại bạn bè" disabled={busy} onPress={() => setAttempt(v => v + 1)} /></View>}
  </HubModal>;
}
const s = StyleSheet.create({ search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: '#FFFFFF', marginBottom: 10 }, input: { flex: 1, minWidth: 0, paddingVertical: 11, color: c.ink, fontSize: 13 }, hint: { color: c.textSecondary, fontSize: 11, lineHeight: 18, marginBottom: 8 }, person: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 10 }, chosen: { borderColor: '#90B1FF', backgroundColor: c.blueWash }, name: { fontSize: 13, fontWeight: '600', color: c.ink }, row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginVertical: 8 }, selection: { borderWidth: 1, borderColor: '#CCD9F5', backgroundColor: '#F6F8FF', borderRadius: 12, padding: 12, marginTop: 14, gap: 8 }, position: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: c.line, padding: 10, borderRadius: 8 } });
