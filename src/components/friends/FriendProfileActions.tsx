import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { friendshipService } from '@/services/friendship.service';
import type { FriendPerson } from '@/types/friendship';
import { HubAction, hubColors as c, ui } from '@/components/projects/hub/ProjectHubUI';
import { FriendActions } from './FriendActions';
import { ACCOUNT_ROLE } from '@/constants/roles';

export function FriendProfileActions({ profileId }: { profileId: string }) {
  const { account } = useAuthStore();
  const { revision } = useNotificationUpdates();
  const [person, setPerson] = useState<FriendPerson | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    const controller = new AbortController(); setPerson(null); setError('');
    if (account?.role === ACCOUNT_ROLE.STUDENT && account.profile?.id !== profileId) friendshipService.relationship(profileId, controller.signal).then(value => { if (!controller.signal.aborted) setPerson(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được quan hệ kết bạn.'); });
    return () => controller.abort();
  }, [account?.id, account?.role, account?.profile?.id, profileId, attempt, revision]);
  if (account?.role !== ACCOUNT_ROLE.STUDENT || account.profile?.id === profileId) return null;
  return <View style={{ gap: 8, padding: 16, alignItems: 'flex-end' }}>{error ? <><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Tải lại quan hệ" onPress={() => setAttempt(value => value + 1)} /></> : person ? <FriendActions person={person} onChanged={setPerson} /> : <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải quan hệ kết bạn" />}</View>;
}
