import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { friendshipService } from '@/services/friendship.service';
import type { FriendPerson } from '@/types/friendship';
import { HubAction, hubColors as c, ui } from '@/components/projects/hub/ProjectHubUI';
import { FriendActions } from './FriendActions';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { messageRoute } from '@/messaging/device';

export function FriendProfileActions({ profileId, profileRole }: { profileId: string; profileRole: number }) {
  const { account } = useAuthStore();
  const studentFriendship = account?.role === ACCOUNT_ROLE.STUDENT && profileRole === ACCOUNT_ROLE.STUDENT;
  const { revision } = useNotificationUpdates();
  const [person, setPerson] = useState<FriendPerson | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    const controller = new AbortController(); setPerson(null); setError('');
    if (studentFriendship && account?.profile?.id !== profileId) friendshipService.relationship(profileId, controller.signal).then(value => { if (!controller.signal.aborted) setPerson(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được quan hệ kết bạn.'); });
    return () => controller.abort();
  }, [account?.id, account?.profile?.id, profileId, studentFriendship, attempt, revision]);
  if (!account || account.profile?.id === profileId) return null;
  if (!studentFriendship) return <HubAction compact title="Nhắn tin" icon="message" onPress={() => router.push({ pathname: messageRoute(account.role), params: { profileId } })} />;
  return <View style={{ gap: 8, alignItems: 'flex-end', maxWidth: '100%' }}>{error ? <><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Tải lại quan hệ" onPress={() => setAttempt(value => value + 1)} /></> : person ? <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
    <HubAction compact title="Nhắn tin" icon="message" onPress={() => router.push({ pathname: messageRoute(account.role), params: { profileId: person.profileId } })} />
    <FriendActions person={person} onChanged={setPerson} />
  </View> : <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải quan hệ kết bạn" />}</View>;
}
