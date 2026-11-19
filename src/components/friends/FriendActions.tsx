import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { FriendPerson } from '@/types/friendship';
import { friendshipService } from '@/services/friendship.service';
import { HubAction, HubModal, ui } from '@/components/projects/hub/ProjectHubUI';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { FriendOverflowMenu } from './FriendOverflowMenu';

export function FriendActions({ person, onChanged, list = false }: { person: FriendPerson; onChanged: (value: FriendPerson) => void; list?: boolean }) {
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
  return <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {person.relationship === 'none' && <HubAction compact title="Kết bạn" icon="invite" variant="primary" busy={busy} onPress={() => void act('send')} />}
    {person.relationship === 'outgoing' && <HubAction compact title="Hủy lời mời" busy={busy} onPress={() => void act('cancel')} />}
    {person.relationship === 'incoming' && <><HubAction compact title={list ? 'Xác nhận' : 'Chấp nhận'} icon={list ? undefined : 'check'} variant="primary" busy={busy} style={list ? { minHeight: 44, minWidth: 88 } : undefined} onPress={() => void act('accept')} /><HubAction compact title={list ? 'Xóa' : 'Từ chối'} disabled={busy} style={list ? { minHeight: 44, minWidth: 64, backgroundColor: '#EDF3FF', borderColor: 'transparent' } : undefined} onPress={() => void act('reject')} /></>}
    {person.relationship === 'friends' && (list ? <FriendOverflowMenu name={person.fullName} disabled={busy} onRemove={() => setConfirming(true)} /> : <HubAction compact title="Hủy kết bạn" icon="people" disabled={busy} onPress={() => setConfirming(true)} />)}
  </View>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {confirming && <HubModal compact wide={false} icon="people" title="Hủy kết bạn?" onClose={() => { if (!lock.current) setConfirming(false); }} footer={<><HubAction compact title="Giữ kết bạn" disabled={busy} onPress={() => setConfirming(false)} /><HubAction compact title="Xác nhận hủy kết bạn" variant="danger" busy={busy} onPress={() => void act('remove')} /></>}><Text style={ui.muted}>Bạn muốn hủy kết bạn với {person.fullName}?</Text>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}</HubModal>}
  </View>;
}
