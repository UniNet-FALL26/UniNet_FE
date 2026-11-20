import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/auth.store';
import { messagingService } from '@/services/messaging.service';
import { imageService } from '@/services/image.service';
import { projectHubService } from '@/services/project-hub.service';
import { friendshipService } from '@/services/friendship.service';
import type { FriendPerson } from '@/types/friendship';
import type { HubProject } from '@/types/project-hub';
import type { ChatConversation, ChatMember } from '@/types/messaging';
import { HubAction, HubIcon, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { Field } from '@/components/projects/hub/ProjectHubFields';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { FriendActions } from '@/components/friends/FriendActions';
import { AddChatMembers } from './AddChatMembers';
import { SharedChatFiles } from './SharedChatFiles';

export type ChatSettingsSection = 'add' | 'link' | 'mute' | 'files' | 'name' | 'members' | 'project' | 'friend' | 'role';

export function ChatDetailsModal({ conversation, onClose, onChanged, onLeft, onOpenConversation, section, memberId, onSectionChange }: { conversation: ChatConversation; onClose: () => void; onChanged: () => Promise<void>; onLeft: () => void; onOpenConversation: (id: string) => void; section?: ChatSettingsSection | null; memberId?: string; onSectionChange?: (section: ChatSettingsSection | null, memberId?: string) => void }) {
  const { account } = useAuthStore(); const group = conversation.type === 1; const admin = group && conversation.myRole >= 1;
  const [name, setName] = useState(conversation.name), [avatar, setAvatar] = useState(conversation.avatarUrl), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [localChild, setLocalChild] = useState<ChatSettingsSection | null>(null), [localRoleTarget, setLocalRoleTarget] = useState<ChatMember | null>(null), [friend, setFriend] = useState<FriendPerson | null>(null), [confirmLeave, setConfirmLeave] = useState(false);
  const requestedChild = onSectionChange ? section ?? null : localChild;
  const child = requestedChild && ((['add', 'link', 'name'].includes(requestedChild) && !admin) || (['members', 'project', 'role'].includes(requestedChild) && !group) || (requestedChild === 'friend' && group)) ? null : requestedChild;
  const roleTarget = onSectionChange ? child === 'role' && conversation.myRole === 2 ? conversation.members.find(member => !member.leftAt && member.person.accountId === memberId && member.person.accountId !== account?.id && member.role !== 2) ?? null : null : localRoleTarget;
  const setChild = (next: ChatSettingsSection | null) => { if (onSectionChange) onSectionChange(next); else setLocalChild(next); };
  const setRoleTarget = (member: ChatMember | null) => { if (onSectionChange) onSectionChange(member ? 'role' : null, member?.person.accountId); else setLocalRoleTarget(member); };
  useEffect(() => { if (!group && conversation.peer && account?.role === 0) { const controller = new AbortController(); friendshipService.relationship(conversation.peer.profileId, controller.signal).then(setFriend).catch(() => {}); return () => controller.abort(); } }, [conversation.id, conversation.peer?.profileId, account?.id]);
  async function run(action: () => Promise<unknown>, leave = false) { setBusy(true); setError(''); try { await action(); if (leave) onLeft(); else await onChanged(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Thao tác chưa thành công.'); } finally { setBusy(false); } }
  async function photo() { setBusy(true); setError(''); try { const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 }); if (!picked.canceled) { const url = (await imageService.upload(picked.assets[0])).imageUrl; await messagingService.updateGroup(conversation.id, conversation.name, url); setAvatar(url); await onChanged(); } } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa đổi được ảnh nhóm.'); } finally { setBusy(false); } }
  if (child === 'add') return <AddChatMembers key={`${conversation.id}:${conversation.project?.id || ''}`} conversation={conversation} onClose={() => setChild(null)} onSaved={async () => { await onChanged(); setChild(null); }} />;
  if (child === 'link') return <LinkChatProject conversation={conversation} onClose={() => setChild(null)} onSaved={async () => { await onChanged(); setChild(null); }} onOpenConversation={onOpenConversation} />;
  if (child === 'files') return <SharedChatFiles key={conversation.id} conversation={conversation} onClose={() => setChild(null)} />;
  if (child === 'mute') return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={360} title="Tắt thông báo" icon="clock" onClose={() => setChild(null)}>
    <View style={s.stack}>{[{ hours: 1, label: 'Trong 1 giờ' }, { hours: 8, label: 'Trong 8 giờ' }, { hours: 168, label: 'Trong 1 tuần' }].map(item => <HubAction key={item.hours} style={s.choice} icon="clock" compact title={item.label} disabled={busy} onPress={() => { void run(async () => { await messagingService.settings(conversation.id, conversation.isPinned, new Date(Date.now() + item.hours * 3600000).toISOString()); setChild(null); }); }} />)}<HubAction compact title="Cho đến khi bật lại" disabled={busy} onPress={() => { void run(async () => { await messagingService.settings(conversation.id, conversation.isPinned, '2099-12-31T00:00:00Z'); setChild(null); }); }} /></View>{!!error && <Text role="alert" style={s.error}>{error}</Text>}
  </HubModal>;
  if (roleTarget) return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={360} title="Quyền thành viên" subtitle={roleTarget.person.fullName} icon="people" onClose={() => setRoleTarget(null)}>
    <View style={s.stack}>{[{ role: 0, title: 'Thành viên' }, { role: 1, title: 'Quản trị viên' }, { role: 2, title: 'Chuyển quyền chủ nhóm' }].map(item => <HubAction key={item.role} style={s.choice} icon="person" compact title={item.title} disabled={busy || roleTarget.role === item.role} onPress={() => { void run(async () => { await messagingService.role(conversation.id, roleTarget.person.accountId, item.role); setRoleTarget(null); }); }} />)}</View>{!!error && <Text role="alert" style={s.error}>{error}</Text>}
  </HubModal>;
  const muted = conversation.mutedUntil != null && Date.parse(conversation.mutedUntil) > Date.now();
  const members = conversation.members.filter(member => !member.leftAt);
  const toggleMute = () => { if (muted) void run(() => messagingService.settings(conversation.id, conversation.isPinned, null)); else setChild('mute'); };
  const togglePin = () => { void run(() => messagingService.settings(conversation.id, !conversation.isPinned, conversation.mutedUntil)); };
  if (child === 'name') return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={440} title="Đổi tên nhóm" icon="back" onClose={() => setChild(null)} footer={<HubAction compact title="Lưu thay đổi" busy={busy} disabled={!name.trim()} onPress={() => { void run(async () => { await messagingService.updateGroup(conversation.id, name.trim(), avatar); setChild(null); }); }} />}><Field compact label="Tên nhóm" value={name} onChange={setName} maxLength={150} />{!!error && <Text role="alert" style={s.error}>{error}</Text>}</HubModal>;
  if (child === 'members') return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={480} title="Thành viên nhóm" icon="back" onClose={() => setChild(null)} footer={admin ? <HubAction compact title="Thêm thành viên" icon="invite" onPress={() => setChild('add')} /> : undefined}><View style={s.stack}>
        {conversation.members.filter(member => !member.leftAt).map(member => <View key={member.person.accountId} style={s.member}><PersonAvatar person={member.person} size={31} /><View style={{ flex: 1 }}><Text style={s.memberName}>{member.person.fullName}</Text><Text style={s.muted}>{['Thành viên', 'Quản trị viên', 'Chủ nhóm'][member.role]}</Text></View>{conversation.myRole === 2 && member.person.accountId !== account?.id && <HubAction compact title="Quyền" disabled={busy} onPress={() => setRoleTarget(member)} />}{admin && member.person.accountId !== account?.id && member.role !== 2 && (conversation.myRole === 2 || member.role === 0) && <HubAction compact title="Xóa" variant="quiet" disabled={busy} onPress={() => { void run(() => messagingService.removeMember(conversation.id, member.person.accountId)); }} />}</View>)}
    {!!error && <Text role="alert" style={s.error}>{error}</Text>}
  </View></HubModal>;
  if (child === 'project') return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={480} title="Dự án liên kết" icon="back" onClose={() => setChild(null)}><View style={s.stack}>{conversation.project ? <View style={{ gap: 9 }}><Text style={s.memberName}>{conversation.project.title}</Text><View style={s.buttons}><HubAction compact title="Xem dự án" icon="external" onPress={() => { if (!onSectionChange) onClose(); router.push({ pathname: '/group/[id]', params: { id: conversation.project!.id } }); }} />{admin && <HubAction compact title="Hủy liên kết" disabled={busy} onPress={() => { void run(() => messagingService.linkProject(conversation.id, null)); }} />}</View></View> : <>{admin ? <HubAction compact title="Liên kết dự án" icon="link" onPress={() => setChild('link')} /> : <Text style={s.muted}>Nhóm chưa liên kết dự án.</Text>}</>}{!!error && <Text role="alert" style={s.error}>{error}</Text>}</View></HubModal>;
  if (child === 'friend' && friend) return <FriendActions person={friend} onClose={() => setChild(null)} onChanged={value => { setFriend(value); void onChanged(); }} />;
  return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={group ? 480 : 510} title={group ? 'Thông tin nhóm' : 'Cài đặt trò chuyện'} icon="back" onClose={busy ? () => {} : onClose}>
    <View style={s.details}>
      {group ? <>
        <View style={s.groupIdentity}>
          <View><PersonAvatar person={{ fullName: conversation.name, avatarUrl: avatar }} size={80} />{admin && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh nhóm" disabled={busy} onPress={() => { void photo(); }} style={s.camera}><HubIcon name="camera" size={16} /></Pressable>}</View>
          <View style={s.groupName}><Text style={s.name} numberOfLines={2}>{conversation.name}</Text>{admin && <Pressable accessibilityRole="button" accessibilityLabel="Đổi tên nhóm" disabled={busy} onPress={() => setChild('name')} style={s.editName}><HubIcon name="edit" size={15} /></Pressable>}</View>
          <Text style={s.muted}>Nhóm · {members.length} thành viên</Text>
        </View>
        <View style={s.quickActions}>
          <QuickAction title={conversation.isPinned ? 'Bỏ ghim' : 'Ghim trò chuyện'} icon="flag" disabled={busy} onPress={togglePin} />
          <QuickAction title={muted ? 'Bật thông báo' : 'Tắt thông báo'} icon="clock" disabled={busy} onPress={toggleMute} />
          <QuickAction title="Ảnh, video, file" icon="image" onPress={() => setChild('files')} />
        </View>
        <View style={s.rows}>
          {admin && <DetailRow title="Đổi tên nhóm" icon="edit" disabled={busy} onPress={() => setChild('name')} />}
          {admin && <DetailRow title="Thêm thành viên" icon="invite" disabled={busy} onPress={() => setChild('add')} />}
          <DetailRow title="Xem thành viên" icon="people" value={String(members.length)} onPress={() => setChild('members')} />
          <DetailRow title="Tắt thông báo" icon="clock" checked={muted} disabled={busy} onPress={toggleMute} />
          <DetailRow title="Dự án liên kết" icon="folder" value={conversation.project ? 'Đã liên kết' : undefined} onPress={() => setChild('project')} />
        </View>
        <View style={s.section}>
          {confirmLeave ? <View style={s.stack}><Text style={s.muted}>Bạn sẽ không thể xem hoặc nhận tin mới của nhóm sau khi rời.</Text><HubAction compact title="Xác nhận rời nhóm" variant="danger" busy={busy} onPress={() => { void run(() => messagingService.removeMember(conversation.id, account!.id), true); }} /></View> : <DetailRow title="Rời nhóm" icon="back" danger disabled={busy} onPress={() => setConfirmLeave(true)} />}
          {confirmLeave && conversation.myRole === 2 && <Text style={s.muted}>Chuyển quyền chủ nhóm cho một thành viên trước khi rời.</Text>}
        </View>
      </> : <>
        <View style={s.identity}><PersonAvatar person={{ fullName: conversation.name, avatarUrl: avatar }} size={52} /><View style={s.identityCopy}><Text style={s.name}>{conversation.name}</Text><Text style={s.muted}>{conversation.relationship === 'friends' ? 'Bạn bè' : 'Tin nhắn từ người lạ'}</Text></View></View>
        <View style={s.section}><Text style={s.heading}>Thông báo</Text>
          <DetailRow title="Thông báo tin nhắn" subtitle="Nhận thông báo khi có tin nhắn mới" icon="message" checked={!muted} disabled={busy} onPress={toggleMute} />
          <DetailRow title="Tắt thông báo" subtitle="Không nhận thông báo tin nhắn từ cuộc trò chuyện này" icon="clock" checked={muted} disabled={busy} onPress={toggleMute} />
        </View>
        <View style={s.section}><Text style={s.heading}>Quản lý cuộc trò chuyện</Text>
          <DetailRow title="Ghim cuộc trò chuyện" subtitle="Giữ cuộc trò chuyện ở đầu danh sách" icon="flag" checked={conversation.isPinned} disabled={busy} onPress={togglePin} />
          {conversation.peer && <DetailRow title="Xem hồ sơ" icon="person" onPress={() => { if (!onSectionChange) onClose(); router.push({ pathname: '/profile/view/[id]', params: { id: conversation.peer!.profileId, source: 'community' } }); }} />}
          {friend && <DetailRow title={conversation.relationship === 'friends' ? 'Quản lý bạn bè' : 'Kết bạn'} icon="invite" onPress={() => setChild('friend')} />}
          <DetailRow title="Ảnh, video và tài liệu đã chia sẻ" icon="image" onPress={() => setChild('files')} />
        </View>
        {conversation.peer && <View style={s.section}><Text style={s.heading}>Khác</Text><DetailRow title={conversation.blockedByMe ? 'Bỏ chặn người này' : 'Chặn người này'} icon="person" danger disabled={busy} onPress={() => { void run(() => messagingService.block(conversation.peer!.accountId, !conversation.blockedByMe)); }} /></View>}
      </>}
      {!!error && <Text role="alert" style={s.error}>{error}</Text>}
    </View>
  </HubModal>;
}

type DetailIcon = Parameters<typeof HubIcon>[0]['name'];
function DetailIconView({ icon, danger = false }: { icon: DetailIcon; danger?: boolean }) {
  const tint = danger ? '#E53935' : '#1769FF';
  if (icon === 'clock') return <SymbolView name={{ ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' }} size={19} tintColor={tint} />;
  if (icon === 'message') return <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} size={19} tintColor={tint} />;
  if (icon === 'flag') return <SymbolView name={{ ios: 'pin', android: 'push_pin', web: 'push_pin' }} size={19} tintColor={tint} />;
  if (icon === 'back') return <SymbolView name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} size={19} tintColor={tint} />;
  return <HubIcon name={icon} size={19} color={tint} />;
}
function DetailRow({ title, subtitle, icon, value, checked, danger, disabled, onPress }: { title: string; subtitle?: string; icon: DetailIcon; value?: string; checked?: boolean; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  const content = <><View style={[s.rowIcon, danger && s.dangerIcon]}><DetailIconView icon={icon} danger={danger} /></View><View style={s.rowCopy}><Text style={[s.rowTitle, danger && s.dangerText]}>{title}</Text>{subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}</View>{value && <Text style={s.muted}>{value}</Text>}</>;
  return checked === undefined ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.detailRow, pressed && s.pressed, disabled && s.disabled]}>{content}<HubIcon name="next" size={15} color="#7E8CA4" /></Pressable> : <View style={[s.detailRow, disabled && s.disabled]}>{content}<Switch accessibilityLabel={title} value={checked} disabled={disabled} onValueChange={onPress} trackColor={{ false: '#CBD3DF', true: '#1769FF' }} thumbColor="#FFFFFF" style={s.toggle} /></View>;
}
function QuickAction({ title, icon, disabled, onPress }: { title: string; icon: DetailIcon; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.quickAction, pressed && s.pressed, disabled && s.disabled]}><DetailIconView icon={icon} /><Text style={s.quickText}>{title}</Text></Pressable>;
}

function LinkChatProject({ conversation, onClose, onSaved, onOpenConversation }: { conversation: ChatConversation; onClose: () => void; onSaved: () => Promise<void>; onOpenConversation: (id: string) => void }) {
  const [projects, setProjects] = useState<HubProject[]>([]), [loading, setLoading] = useState(true), [page, setPage] = useState(1), [more, setMore] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [existing, setExisting] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); setLoading(true); projectHubService.mine(page, '', controller.signal).then(result => { setProjects(old => page === 1 ? result.items.filter(p => p.isOwner) : [...old, ...result.items.filter(p => p.isOwner)]); setMore(result.total > page * result.pageSize); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được dự án.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [page]);
  async function link(project: HubProject) { setBusy(true); setError(''); setExisting(null); try { await messagingService.linkProject(conversation.id, project.id); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa liên kết được dự án.'); try { const current = await messagingService.projectChat(project.id); if (current.conversationId && current.canAccess) setExisting(current.conversationId); } catch {} } finally { setBusy(false); } }
  return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={480} title="Liên kết dự án" subtitle="Chọn dự án bạn có quyền quản lý." icon="folder" onClose={onClose}>
    <View style={s.stack}>{projects.map(project => <View key={project.id} style={s.member}><View style={{ flex: 1 }}><Text style={s.memberName}>{project.title}</Text><Text style={s.muted} numberOfLines={2}>{project.description}</Text></View><HubAction compact title="Liên kết" onPress={() => { void link(project); }} disabled={busy} /></View>)}{loading && <ActivityIndicator color="#1769E0" />}{!loading && !projects.length && <Text style={s.muted}>Chưa có dự án phù hợp.</Text>}{more && <HubAction compact title="Tải thêm dự án" disabled={loading} onPress={() => setPage(value => value + 1)} />}{!!error && <Text role="alert" style={s.error}>{error}</Text>}{existing && <HubAction compact title="Mở phòng đã liên kết" variant="primary" onPress={() => onOpenConversation(existing)} />}</View>
  </HubModal>;
}


const s = StyleSheet.create({
  choice: { justifyContent: 'flex-start', minHeight: 44, gap: 10, backgroundColor: '#FFFFFF' },
  details: { gap: 16 }, identityCopy: { flex: 1, gap: 4, minWidth: 0 },
  groupIdentity: { alignItems: 'center', gap: 5, paddingBottom: 4 },
  groupName: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, maxWidth: '100%', paddingTop: 3 },
  camera: { position: 'absolute', right: -3, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' },
  editName: { padding: 4, borderRadius: 6, backgroundColor: '#EAF1FF' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  quickAction: { flexGrow: 1, flexBasis: 110, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, backgroundColor: '#EAF1FF' },
  quickText: { fontSize: 11, color: '#203B63', fontWeight: '500' },
  rows: { borderTopWidth: 1, borderColor: '#E5EBF5', paddingTop: 2 },
  detailRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EDF0F6' },
  rowIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1FF', borderRadius: 9 },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 13, lineHeight: 18, color: '#182D4C', fontWeight: '500' },
  rowSubtitle: { fontSize: 10, lineHeight: 14, color: '#73829A' },
  toggle: { transform: [{ scale: 0.8 }] },
  dangerIcon: { backgroundColor: '#FFF0F0' }, dangerText: { color: '#E53935' },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.5 },
  stack: { gap: 12 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: '#1A3050', fontSize: 16, lineHeight: 23, fontWeight: '700' }, heading: { color: '#263D5F', fontSize: 12, fontWeight: '700' }, muted: { color: '#8190A6', fontSize: 11, lineHeight: 17 }, section: { borderTopWidth: 1, borderColor: '#E5EBF5', paddingTop: 14, gap: 10 }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, member: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#E9EEF6', borderRadius: 12, backgroundColor: '#FFFFFF' }, memberName: { color: '#2D4363', fontSize: 13, lineHeight: 18, fontWeight: '500' }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, error: { color: '#B8324D', fontSize: 12, lineHeight: 18 } });
