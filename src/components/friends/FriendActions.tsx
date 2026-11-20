import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FriendPerson } from '@/types/friendship';
import { friendshipService } from '@/services/friendship.service';
import { HubAction, HubIcon, HubModal, ui } from '@/components/projects/hub/ProjectHubUI';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { FriendOverflowMenu } from './FriendOverflowMenu';

export function FriendActions({ person, onChanged, list = false, onClose }: { person: FriendPerson; onChanged: (value: FriendPerson) => void; list?: boolean; onClose?: () => void }) {
  const { account } = useAuthStore();
  const [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  async function act(action: 'send' | 'accept' | 'reject' | 'cancel' | 'remove') {
    if (lock.current || account?.role !== ACCOUNT_ROLE.STUDENT || person.role !== ACCOUNT_ROLE.STUDENT) return;
    lock.current = true; setBusy(true); setError('');
    try { const result = await (action === 'send' ? friendshipService.send(person.accountId) : friendshipService.decide(person, action)); setConfirming(false); onChanged(result); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa thể cập nhật quan hệ.');
      try {
        const current = await friendshipService.relationship(person.profileId);
        if (current.relationship !== person.relationship || current.friendshipVersion !== person.friendshipVersion) onChanged(current);
      } catch { /* Keep the error and existing state until explicit retry. */ }
    } finally { lock.current = false; setBusy(false); }
  }
  if (person.relationship === 'self' || account?.role !== ACCOUNT_ROLE.STUDENT || person.role !== ACCOUNT_ROLE.STUDENT) return null;
  if (onClose) {
    const connected = person.relationship === 'friends';
    const copy = {
      none: ['Gửi lời mời kết bạn?', 'Kết nối để nhắn tin, chia sẻ và cùng tương tác.'],
      friends: ['Các bạn đã là bạn bè', 'Bạn có thể nhắn tin, gọi và chia sẻ với nhau.'],
      incoming: ['Bạn có lời mời kết bạn', `${person.fullName} muốn kết nối với bạn.`],
      outgoing: ['Đã gửi lời mời kết bạn', 'Lời mời đang chờ được chấp nhận.'],
    }[person.relationship];
    return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={520} title="Kết nối bạn bè" icon="back" onClose={() => { if (!lock.current) onClose(); }} footer={connected ? undefined : <>
      {person.relationship === 'none' && <HubAction compact title="Gửi lời mời" icon="invite" variant="primary" busy={busy} onPress={() => void act('send')} style={s.button} />}
      {person.relationship === 'outgoing' && <HubAction compact title="Hủy lời mời" busy={busy} onPress={() => void act('cancel')} style={s.button} />}
      {person.relationship === 'incoming' && <><HubAction compact title="Từ chối" disabled={busy} onPress={() => void act('reject')} style={s.button} /><HubAction compact title="Chấp nhận" icon="check" variant="primary" busy={busy} onPress={() => void act('accept')} style={s.button} /></>}
    </>}>
      <View style={s.connection}><View style={[s.connectionIcon, connected && s.connectedIcon]}><HubIcon name="people" size={31} color={connected ? '#328238' : '#1769FF'} /><View style={[s.badge, connected && s.connectedBadge]}><HubIcon name={connected ? 'check' : 'plus'} size={15} color="#FFFFFF" /></View></View><View style={s.copy}><Text style={s.title}>{copy[0]}</Text><Text style={s.subtitle}>{copy[1]}</Text></View></View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    </HubModal>;
  }
  return <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {person.relationship === 'none' && <HubAction compact title="Kết bạn" icon="invite" variant="primary" busy={busy} onPress={() => void act('send')} />}
    {person.relationship === 'outgoing' && <HubAction compact title="Hủy lời mời" busy={busy} onPress={() => void act('cancel')} />}
    {person.relationship === 'incoming' && <><HubAction compact title={list ? 'Xác nhận' : 'Chấp nhận'} icon={list ? undefined : 'check'} variant="primary" busy={busy} style={list ? { minHeight: 32, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 7 } : undefined} onPress={() => void act('accept')} /><HubAction compact title={list ? 'Xóa' : 'Từ chối'} disabled={busy} style={list ? { minHeight: 32, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 7, backgroundColor: '#EDF3FF', borderColor: 'transparent' } : undefined} onPress={() => void act('reject')} /></>}
    {person.relationship === 'friends' && (list ? <FriendOverflowMenu name={person.fullName} disabled={busy} onRemove={() => setConfirming(true)} /> : <HubAction compact title="Hủy kết bạn" icon="people" disabled={busy} onPress={() => setConfirming(true)} />)}
  </View>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {confirming && <HubModal compact wide={false} icon="people" title="Hủy kết bạn?" onClose={() => { if (!lock.current) setConfirming(false); }} footer={<><HubAction compact title="Giữ kết bạn" disabled={busy} onPress={() => setConfirming(false)} /><HubAction compact title="Xác nhận hủy kết bạn" variant="danger" busy={busy} onPress={() => void act('remove')} /></>}><Text style={ui.muted}>Bạn muốn hủy kết bạn với {person.fullName}?</Text>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}</HubModal>}
  </View>;
}
const s = StyleSheet.create({
  connection: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 1, paddingHorizontal: 6 },
  connectionIcon: { width: 56, height: 56, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF' },
  connectedIcon: { backgroundColor: '#E8F7EE' },
  badge: { position: 'absolute', right: 7, bottom: 8, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#EAF2FF', backgroundColor: '#1769FF', alignItems: 'center', justifyContent: 'center' },
  connectedBadge: { backgroundColor: '#328238', borderColor: '#E8F7EE' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: '#192B45' },
  subtitle: { fontSize: 13, lineHeight: 20, color: '#718098' },
  button: { minHeight: 38, paddingHorizontal: 18, borderRadius: 10 },
});
