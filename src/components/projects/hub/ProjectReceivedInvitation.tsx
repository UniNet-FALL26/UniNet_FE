import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { canInviteProjectFriends } from '@/utils/project-invitations';
import type { HubProject, HubRequest } from '@/types/project-hub';
import { HubAction, HubPanel, ui } from './ProjectHubUI';
import { messageOf } from './ProjectHubFields';

export function ProjectReceivedInvitation({ project, onChanged }: { project: HubProject; onChanged: () => void }) {
  const { account } = useAuthStore();
  const [invitation, setInvitation] = useState<HubRequest | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const locked = useRef(false), generation = useRef(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    generation.current++; setInvitation(null); setError(''); setBusy(false); locked.current = false;
    if (!account?.profile?.id || project.isOwner || project.isMember || !canInviteProjectFriends(project)) return () => controller.abort();
    projectHubService.mineRequests(project.id, controller.signal).then(result => {
      if (!controller.signal.aborted) setInvitation(result.items.find(r => r.projectId === project.id && r.userId === account.profile!.id && r.requestType === 1 && r.status === 0) ?? null);
    }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); });
    return () => { controller.abort(); generation.current++; };
  }, [account?.id, account?.profile?.id, project.id, project.isOwner, project.isMember, project.status, attempt]));
  async function decide(decision: 'accept' | 'reject') {
    if (!invitation || locked.current) return;
    const request = generation.current, session = tokenStorage.getSession()?.generation;
    const active = () => generation.current === request && tokenStorage.getSession()?.generation === session;
    locked.current = true; setBusy(true); setError('');
    try {
      await projectHubService.decide(invitation.id, decision);
      if (active()) { setInvitation(null); onChanged(); }
    } catch (cause) { if (active()) setError(messageOf(cause)); }
    finally { if (active()) { locked.current = false; setBusy(false); } }
  }
  if (!invitation && !error) return null;
  return <HubPanel compact title="Lời mời tham gia dự án" icon="invite">
    {invitation && <><Text style={ui.muted}>Bạn được mời tham gia với vị trí: {invitation.role}.</Text>
      {!!invitation.message && <Text style={ui.muted}>{invitation.message}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <HubAction compact title="Chấp nhận lời mời" variant="primary" busy={busy} onPress={() => void decide('accept')} />
        <HubAction compact title="Từ chối lời mời" disabled={busy} onPress={() => void decide('reject')} />
      </View></>}
    {!!error && <><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Tải lại lời mời" disabled={busy} onPress={() => setAttempt(v => v + 1)} /></>}
  </HubPanel>;
}
