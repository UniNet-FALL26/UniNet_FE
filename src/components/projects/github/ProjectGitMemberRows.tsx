import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { HubMember, HubProject } from '@/types/project-hub';
import type { GitIdentity } from '@/types/project-github';
import { projectRoleLabel } from '@/utils/contribution-presentation';
import { usePublishedContribution } from '@/hooks/usePublishedContribution';
import { publishedPercent } from '@/utils/published-contribution';
import { useAuthStore } from '@/store/auth.store';
import { allGitPages, projectGitService as git } from '@/services/project-github.service';
import { gitError, gitIdentitiesFor, gitIdentityForConnection } from '@/utils/project-github';
import { useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { HubAction, HubModal, hubColors as c } from '../hub/ProjectHubUI';
import { PersonAvatar } from '../hub/ProjectCommunityModals';
import { UserDetails } from '../contribution/UserDetails';
import { GitHubAccountPicker } from './GitHubAccountPicker';

type Props = { project: HubProject; members: HubMember[]; management: (member: HubMember) => ReactNode };
export function ProjectGitMemberRows(props: Props) {
  const { account } = useAuthStore();
  return <MemberRows key={`${props.project.id}:${account?.id}`} {...props} />;
}
function MemberRows({ project, members, management }: Props) {
  const { account } = useAuthStore(); const profileId = account?.profile?.id;
  const allowed = !!account && (project.isOwner || project.isMember);
  const [identities, setIdentities] = useState<GitIdentity[]>([]);
  const published = usePublishedContribution(project.id, account?.id);
  const [error, setError] = useState(''), [loading, setLoading] = useState(allowed);
  const [linking, setLinking] = useState(false), [unlinking, setUnlinking] = useState<GitIdentity | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''); const lock = useRef(false);
  const refresh = useGitHubRevalidation(`${project.id}:${account?.id}:identities`, project.id, async signal => {
    try {
      const rows = await allGitPages(page => git.identities(project.id, page, signal));
      if (signal.aborted) return false;
      setIdentities(rows.filter(x => x.projectId === project.id)); setError('');
      return true;
    } catch (cause) {
      if (!signal.aborted) { setIdentities([]); setError(gitError(cause)); }
      throw cause;
    } finally { if (!signal.aborted) setLoading(false); }
  }, allowed && !busy);
  const timedOut = refresh.state === 'timeout';
  const identityLoading = loading && !timedOut;
  const identityError = error || (timedOut ? 'Chưa thể kiểm tra danh tính GitHub. Hãy thử lại.' : '');
  const visibleIdentities = timedOut ? [] : identities;
  const reload = () => { setLoading(true); setError(''); void refresh.check(); };
  const selfIdentities = profileId ? gitIdentitiesFor(visibleIdentities, project.id, profileId) : [];
  const canLinkSelf = allowed && !!profileId && members.some(x => x.userId === profileId && x.status === 0);
  return <>
    {allowed && <View style={s.tools}><View style={{ flex: 1, minWidth: 160 }}><Text style={s.hint}>Liên kết GitHub để xác minh đóng góp của bạn.</Text></View>{!!identityError && <HubAction compact title="Thử lại danh tính GitHub" disabled={identityLoading} onPress={reload} />}</View>}
    {identityLoading && <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải GitHub Identity và Contribution" />}
    {!!identityError && <Text accessibilityRole="alert" style={s.error}>{identityError}</Text>}
    {published.loading ? <Text style={s.hint}>Đang tải điểm đã công bố…</Text> : published.error ? <View><Text accessibilityRole="alert" style={s.hint}>{published.error}</Text><HubAction compact title="Thử lại điểm đóng góp" onPress={() => void published.retry()} /></View> : <Text style={s.hint}>{published.value?.publishedRunId ? `Đóng góp phiên bản ${published.value.version} — Đã công bố.` : 'Điểm đóng góp chưa được công bố.'}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.hint}>{notice}</Text>}
    {members.map(member => {
      const self = member.userId === profileId;
      const memberIdentities = gitIdentitiesFor(visibleIdentities, project.id, member.userId);
      return <View key={member.id} testID="project-member-row" style={s.row}>
        <PersonAvatar person={member} size={32} />
        <View style={s.member}><Text style={s.name}>{member.fullName}{self || (project.isOwner && member.userId === project.creator.id) ? ' (Bạn)' : ''}</Text>
          <Text style={s.hint}>{projectRoleLabel(member.role)}{member.status === 1 ? ' · Đã kết thúc tham gia' : member.status === 2 ? ' · Đã rời dự án' : ''}</Text>
          {allowed && !identityLoading && !identityError && (memberIdentities.length ? memberIdentities.map(identity => <Text key={identity.id} style={[s.identity, { color: c.primary }]}>GitHub: @{identity.externalUsername} · Đã xác minh</Text>) : <Text style={s.identity}>GitHub: Chưa liên kết với dự án</Text>)}
          {self && canLinkSelf && !identityLoading && !identityError && <View style={s.selfActions}>
            {memberIdentities.length > 0 && <UserDetails title="Quản lý GitHub của tôi">{memberIdentities.map(identity => <HubAction key={identity.id} compact title={`Ngắt liên kết @${identity.externalUsername}`} variant="quiet" onPress={() => setUnlinking(identity)} />)}<Text style={s.hint}>Tài khoản mới không thay thế tài khoản đã liên kết. Điểm đã công bố chỉ cập nhật qua quy trình điều chỉnh đóng góp.</Text></UserDetails>}
            <HubAction compact title={memberIdentities.length ? 'Liên kết tài khoản GitHub khác' : 'Liên kết GitHub của tôi'} variant="quiet" onPress={() => setLinking(true)} />
          </View>}
        </View>
        <View style={s.right}><Text accessibilityLabel={`Contribution của ${member.fullName}`} style={s.score}>{published.loading ? 'Đang tải…' : publishedPercent(published.error ? null : published.value, project.id, member.userId)}</Text><Text style={s.scoreCaption}>Tổng đóng góp</Text>{management(member)}</View>
      </View>;
    })}
    {linking && canLinkSelf && <HubModal title="GitHub Identity của tôi" icon="link" onClose={() => { if (!busy) setLinking(false); }}>
      <GitHubAccountPicker projectId={project.id} tab="members" disabled={busy} linkedAccountIds={selfIdentities.map(x => String(x.externalAccountId))} onSelect={async connection => {
        if (lock.current) return; lock.current = true; setBusy(true);
        try {
          const previous = profileId ? gitIdentityForConnection(visibleIdentities, project.id, profileId, connection.providerAccountId) : undefined;
          const value = previous?.status === 1
            ? await git.reactivateIdentity(project.id, previous.id, connection.id)
            : await git.linkIdentity(project.id, connection.id);
          if (value.projectId !== project.id || value.userProfileId !== profileId || value.status !== 0 || String(value.externalAccountId) !== connection.providerAccountId) throw new Error('Identity response mismatch');
          setLinking(false); setNotice('Đã liên kết danh tính GitHub với chính bạn trong dự án.'); reload();
        } finally { lock.current = false; setBusy(false); }
      }} />
    </HubModal>}
    {unlinking && <HubModal title="Ngắt liên kết GitHub Identity" icon="warning" onClose={() => { if (!busy) setUnlinking(null); }} footer={<><HubAction title="Hủy" disabled={busy} onPress={() => setUnlinking(null)} /><HubAction title="Xác nhận ngắt Identity" variant="danger" busy={busy} onPress={() => {
      if (lock.current || unlinking.userProfileId !== profileId || unlinking.projectId !== project.id || !canLinkSelf) return; lock.current = true; setBusy(true);
      void git.unlinkIdentity(project.id, unlinking.id).then(() => { setUnlinking(null); setNotice('Đã ngắt liên kết. Lịch sử danh tính vẫn được giữ lại.'); reload(); }).catch(cause => setError(gitError(cause))).finally(() => { lock.current = false; setBusy(false); });
    }} /></>}><Text style={s.hint}>Ngắt liên kết @{unlinking.externalUsername} khỏi danh tính của bạn trong dự án này? Tài khoản GitHub và lịch sử đóng góp vẫn được giữ lại.</Text>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</HubModal>}
  </>;
}
const s = StyleSheet.create({ tools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line }, member: { flex: 1, minWidth: 0, gap: 4 }, name: { color: c.ink, fontSize: 14, fontWeight: '600' }, hint: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, identity: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, selfActions: { alignItems: 'flex-start', marginTop: 4 }, right: { alignItems: 'flex-end', gap: 5, maxWidth: '32%' }, score: { color: c.ink, fontWeight: '600', fontSize: 14, textAlign: 'right' }, scoreCaption: { color: c.textSecondary, fontSize: 11 }, error: { color: c.error, fontSize: 13, lineHeight: 20 } });
