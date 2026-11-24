import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import type { GitCredential, GitRepository, GitSyncState } from '@/types/project-github';
import { ApiError } from '@/services/api';
import { allGitPages, projectGitService as git } from '@/services/project-github.service';
import { useAuthStore } from '@/store/auth.store';
import { gitError } from '@/utils/project-github';
import { githubLinkStatus } from '@/utils/github-link-status';
import { useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { HubAction, HubIcon, HubModal, hubColors as c } from '../hub/ProjectHubUI';
import { GitRepositoryLinkDialog } from './GitRepositoryLinkDialog';

type Data = { rows: GitRepository[]; credentials: GitCredential[]; canManage: boolean; sync: GitSyncState[] | null };
export function ProjectGitRepositoryPanel({ project }: { project: HubProject }) {
  const { account } = useAuthStore();
  return <RepositoryPanel key={`${project.id}:${account?.id}`} project={project} />;
}
function RepositoryPanel({ project }: { project: HubProject }) {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [linking, setLinking] = useState(false), [menu, setMenu] = useState<GitRepository | null>(null), [details, setDetails] = useState<GitRepository | null>(null);
  const [unlinking, setUnlinking] = useState<GitRepository | null>(null), [busy, setBusy] = useState(false); const lock = useRef(false);
  const read = async (signal: AbortSignal) => {
    try {
      const [rows, rights, sync] = await Promise.all([
        allGitPages(page => git.repositories(project.id, page, signal)),
        git.credentials(project.id, signal).then(value => ({ canManage: true, value })).catch(cause => {
          if (cause instanceof ApiError && cause.status === 403) return { canManage: false, value: [] as GitCredential[] }; throw cause;
        }),
        git.syncStatus(project.id, signal).then(x => x.items).catch(() => null),
      ]);
      if (signal.aborted) return false;
      if (rows.some(row => row.projectId !== project.id)) throw new Error('Project response mismatch');
      setData({ rows, credentials: rights.value, canManage: rights.canManage, sync }); setError(''); return true;
    } catch (cause) {
      if (!signal.aborted) { setError(gitError(cause)); if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) { setData(null); setDetails(null); setMenu(null); } }
      throw cause;
    }
  };
  const refresh = useGitHubRevalidation(project.id, project.id, read, !linking && !unlinking);
  const unavailable = !!error || refresh.state === 'timeout';
  const canManage = !!data?.canManage && !unavailable;
  const rows = data?.rows ?? [];
  const loading = !data && !unavailable;
  async function unlink() {
    if (!unlinking || lock.current || !canManage) return; lock.current = true; setBusy(true); setError('');
    try { await git.unlinkRepository(project.id, unlinking.id); setUnlinking(null); setNotice('Đã ngắt liên kết repository. Lịch sử vẫn được giữ lại.'); }
    catch (cause) { setError(gitError(cause)); } finally { lock.current = false; setBusy(false); }
  }
  return <View accessibilityLabel="GitHub Repository" style={s.section}>
    <View style={s.heading}><HubIcon name="code" /><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.title}>GitHub Repository</Text><Text style={s.copy}>Liên kết mã nguồn với dự án của bạn.</Text></View>
      {refresh.state === 'refreshing' && data && <ActivityIndicator size="small" color={c.primary} accessibilityLabel="Đang cập nhật trạng thái GitHub" />}
    </View>
    {loading && <ActivityIndicator accessibilityLabel="Đang tải repository GitHub" color={c.primary} />}
    {unavailable && <View style={s.alert}><Text accessibilityRole="alert" style={s.error}>Không thể kiểm tra trạng thái. {error || 'Yêu cầu mất quá nhiều thời gian.'}</Text><HubAction compact title="Thử lại" onPress={() => void refresh.check()} /></View>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
    {!loading && !unavailable && !rows.length && <View style={s.empty}><HubIcon name="folder" size={27} color={c.textSecondary} /><Text style={s.copy}>Chưa có repository GitHub được liên kết.</Text></View>}
    {rows.map(repo => {
      const status = githubLinkStatus(repo, data?.sync?.find(x => x.projectGitRepositoryId === repo.id), unavailable);
      return <View key={repo.id} style={s.repository}>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}><Text style={s.name}>{repo.repository.fullName}</Text>
          <View style={s.badges}><Text style={s.badge}>{repo.repository.isPrivate ? 'Riêng tư' : 'Công khai'}</Text><Text style={[s.badge, status.warning && { color: c.error }]}>{status.link}</Text></View>
          {(status.warning || repo.accessStatus !== 1) && <Text style={[s.copy, status.warning && { color: c.error }]}>{status.authorization}</Text>}
          <Text style={s.copy}>{data?.sync === null && !repo.syncPaused ? 'Chưa thể kiểm tra đồng bộ' : status.sync}</Text>
          {data?.sync?.find(x => x.projectGitRepositoryId === repo.id)?.lastSuccessfulSyncAt && <Text style={s.hint}>Đồng bộ thành công: {new Date(data.sync.find(x => x.projectGitRepositoryId === repo.id)!.lastSuccessfulSyncAt!).toLocaleString('vi-VN')}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Tùy chọn ${repo.repository.fullName}`} onPress={() => setMenu(repo)} style={s.menuButton}><HubIcon name="more" size={22} color={c.textSecondary} /></Pressable>
      </View>;
    })}
    {canManage && <View style={s.actions}><HubAction compact title={rows.some(x => !x.unlinkedAt) ? 'Thêm repository' : 'Liên kết GitHub Repository'} icon="plus" variant="primary" onPress={() => setLinking(true)} /></View>}
    {!canManage && !loading && !unavailable && <Text style={s.hint}>Chỉ chủ dự án hoặc quản lý Git được ủy quyền có thể chỉnh sửa liên kết.</Text>}
    {linking && canManage && <GitRepositoryLinkDialog projectId={project.id} projectName={project.title} linkedRepositoryIds={rows.filter(x => !x.unlinkedAt).map(x => x.repository.providerRepositoryId)} credentials={data?.credentials ?? []} onClose={() => setLinking(false)} onLinked={() => { setLinking(false); setNotice('Đã liên kết repository với dự án.'); }} />}
    {menu && <HubModal title="Tùy chọn repository" icon="code" onClose={() => setMenu(null)}>
      <Text style={s.name}>{menu.repository.fullName}</Text>
      <View style={{ gap: 12, marginTop: 16 }}><HubAction title="Chi tiết trạng thái" onPress={() => { setDetails(data?.rows.find(x => x.id === menu.id) ?? menu); setMenu(null); }} />
      {canManage && !menu.unlinkedAt && <HubAction title="Ngắt liên kết" variant="danger" onPress={() => { setUnlinking(menu); setMenu(null); }} />}</View>
    </HubModal>}
    {details && <HubModal title="Chi tiết trạng thái" icon="info" onClose={() => setDetails(null)}>
      <Text style={s.name}>{details.repository.fullName}</Text>
      <Text style={s.copy}>{githubLinkStatus(details, data?.sync?.find(x => x.projectGitRepositoryId === details.id), unavailable).authorization}</Text>
      <Text style={s.copy}>{githubLinkStatus(details, data?.sync?.find(x => x.projectGitRepositoryId === details.id), unavailable).sync}</Text>
      <Text style={s.hint}>Liên kết repository không đồng nghĩa dữ liệu đã được đồng bộ hoặc điểm đã được công bố.</Text>
    </HubModal>}
    {unlinking && <HubModal title="Ngắt liên kết repository" icon="warning" onClose={() => { if (!busy) setUnlinking(null); }} footer={<><HubAction title="Hủy" disabled={busy} onPress={() => setUnlinking(null)} /><HubAction title="Xác nhận ngắt liên kết" variant="danger" busy={busy} onPress={() => void unlink()} /></>}>
      <Text style={s.copy}>Ngắt liên kết {unlinking.repository.fullName} khỏi dự án? Dự án sẽ không đồng bộ qua liên kết này. Lịch sử đóng góp vẫn được giữ lại.</Text>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </HubModal>}
  </View>;
}
const s = StyleSheet.create({ section: { padding: 20, gap: 16, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { color: c.ink, fontSize: 17, fontWeight: '600' }, copy: { color: c.textSecondary, fontSize: 13, lineHeight: 20 }, hint: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, name: { color: c.ink, fontSize: 14, fontWeight: '600' }, empty: { alignItems: 'center', padding: 16, gap: 10 }, repository: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, alignItems: 'flex-start' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, badge: { color: c.primary, fontSize: 12, backgroundColor: c.canvas, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 }, menuButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, alert: { gap: 10 }, error: { color: c.error, fontSize: 13, lineHeight: 20 }, success: { color: c.primary, fontSize: 13, lineHeight: 20 } });
