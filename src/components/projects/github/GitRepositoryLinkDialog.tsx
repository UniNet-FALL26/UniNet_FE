import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { GitCredential, GitInstallationRepository } from '@/types/project-github';
import { projectGitService as git } from '@/services/project-github.service';
import { gitError } from '@/utils/project-github';
import { beginGitHubAppAuthorization, openGitHubAppAuthorization } from '@/utils/github-oauth';
import { githubInstallationConfiguration, readGitHubLinkOptions, type GitHubLinkChoice, type GitHubLinkOptions } from '@/utils/github-repository-access';
import { useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { ApiError } from '@/services/api';
import { HubAction, HubModal, hubColors as c } from '../hub/ProjectHubUI';
import { GitHubAccountPicker } from './GitHubAccountPicker';

type Props = { projectId: string; projectName: string; linkedRepositoryIds: number[]; credentials: GitCredential[]; onClose: () => void; onLinked: () => void };
const signature = (value: GitHubLinkOptions) => JSON.stringify([value.credentials.map(x => [x.credentialId, x.requiresReauthorization]), value.installation?.installationId, value.installation?.status, value.repositories?.items.map(x => [x.repositoryId, x.eligible]), value.repositories?.hasMore]);
export function GitRepositoryLinkDialog({ projectId, projectName, onClose, onLinked }: Props) {
  const [choice, setChoice] = useState<GitHubLinkChoice | null>(null), [chooseAccount, setChooseAccount] = useState(true), [chooseInstallation, setChooseInstallation] = useState(false);
  const scope = `${projectId}:${choice?.account.id}:${choice?.credentialId ?? ''}:${choice?.installationId ?? ''}:${choice?.installationPage}:${choice?.repositoryPage}`;
  const [result, setResult] = useState<{ scope: string; value: GitHubLinkOptions } | null>(null);
  const [problem, setProblem] = useState<{ scope: string; message: string; code?: string } | null>(null), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<{ scope: string; repo: GitInstallationRepository } | null>(null), [fallback, setFallback] = useState<{ url: string; expiresAt: string } | null>(null);
  const [actionError, setActionError] = useState(''); const lock = useRef(false), baseline = useRef('');
  const data = result?.scope === scope ? result.value : null;
  const error = problem?.scope === scope ? problem.message : '';
  const read = async (signal: AbortSignal): Promise<boolean> => {
    if (!choice) return false;
    try {
      const fresh = await readGitHubLinkOptions(projectId, choice, signal);
      if (signal.aborted) return false;
      setResult({ scope, value: fresh }); setProblem(null);
      setSelected(old => old?.scope === scope && !fresh.repositories?.items.some(x => x.repositoryId === old.repo.repositoryId && x.eligible && !fresh.linkedIds.includes(x.repositoryId)) ? null : old);
      return baseline.current !== '' && baseline.current !== signature(fresh);
    } catch (cause) {
      if (!signal.aborted) {
        setProblem({ scope, message: gitError(cause), code: cause instanceof ApiError ? cause.code : undefined });
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) setResult(null);
      }
      throw cause;
    }
  };
  const refresh = useGitHubRevalidation(scope, projectId, read, !!choice);
  const busy = refresh.state === 'refreshing';
  const repository = selected?.scope === scope ? data?.repositories?.items.find(x => x.repositoryId === selected.repo.repositoryId) : undefined;
  const canLink = !!repository?.eligible && !!data?.credential && !!data.installation && !data.linkedIds.includes(repository.repositoryId) && !error && !busy && !saving;
  const retry = () => { baseline.current = data ? signature(data) : ''; refresh.wait(); void refresh.check(); };
  function waitForGitHub() { setSelected(null); baseline.current = data ? signature(data) : ''; refresh.wait(); }
  async function authorize() {
    if (!choice || lock.current) return; lock.current = true; waitForGitHub(); setSaving(true); setActionError('');
    try {
      const flow = await beginGitHubAppAuthorization(projectId, choice.account.id);
      if (!flow.opened) setFallback({ url: flow.authorizationUrl, expiresAt: flow.expiresAt });
      baseline.current = data ? signature(data) : '';
    } catch (cause) { refresh.stopWaiting(); setActionError(gitError(cause)); }
    finally { lock.current = false; setSaving(false); }
  }
  async function confirm() {
    if (!canLink || !data?.credential || !data.installation || !repository || lock.current) return;
    lock.current = true; refresh.stopWaiting(); setSaving(true); setActionError('');
    try {
      const response = await git.linkRepository(projectId, data.credential.credentialId, data.installation.installationId, repository.repositoryId);
      if (!response.projectGitRepositoryId || response.repositoryId !== repository.repositoryId) throw new Error('Repository response mismatch');
      onLinked();
    } catch (cause) { setActionError(gitError(cause)); }
    finally { lock.current = false; setSaving(false); }
  }
  return <HubModal title="Liên kết GitHub Repository" icon="link" onClose={() => { if (!saving) onClose(); }} footer={<>
    <HubAction title="Đóng" disabled={saving} onPress={onClose} />
    <HubAction title="Xác nhận liên kết" variant="primary" busy={saving} disabled={!canLink} onPress={() => void confirm()} />
  </>}>
    <View style={s.content}>
      <Text style={s.copy}>Chọn mã nguồn cho {projectName}. Chỉ repository bạn xác nhận mới được liên kết.</Text>
      {(!choice || chooseAccount) ? <GitHubAccountPicker projectId={projectId} tab="settings" selectedId={choice?.account.id} disabled={saving} onSelect={async account => {
        setChoice({ account, installationPage: 1, repositoryPage: 1 }); setChooseAccount(false); setChooseInstallation(false); setSelected(null); setFallback(null); setActionError(''); baseline.current = '';
      }} /> : <View style={s.context}><View style={{ flex: 1 }}><Text style={s.heading}>GitHub: @{choice.account.login}</Text><Text style={s.copy}>Tài khoản đã xác minh</Text></View><HubAction compact title="Thay đổi tài khoản" variant="quiet" disabled={saving} onPress={() => setChooseAccount(true)} /></View>}
      {choice && !data && !error && <Text accessibilityLiveRegion="polite" style={s.copy}>Đang kiểm tra quyền và tải repository…</Text>}
      {(error || actionError || refresh.state === 'timeout') && <View style={s.alert}><Text accessibilityRole="alert" style={s.error}>{error || actionError || 'Chưa xác nhận được thay đổi quyền trong thời gian chờ. Kiểm tra App, chủ sở hữu và repository trên GitHub rồi thử lại.'}</Text><HubAction compact title="Kiểm tra lại" disabled={busy || saving} onPress={retry} /></View>}
      {(refresh.state === 'waiting' || (busy && data)) && <Text accessibilityLiveRegion="polite" style={s.copy}>{busy ? 'Đang kiểm tra quyền…' : 'Đang chờ thay đổi quyền. Khi quay lại từ GitHub, danh sách sẽ tự cập nhật.'}</Text>}
      {data && !data.credential && data.credentials.filter(x => !x.requiresReauthorization).length > 1 && <View style={{ gap: 10 }}><Text style={s.heading}>Chọn tài khoản đã cấp quyền</Text>{data.credentials.filter(x => !x.requiresReauthorization).map(x => <HubAction key={x.credentialId} title={`Tài khoản @${x.login}`} onPress={() => { setChoice(old => old ? { ...old, credentialId: x.credentialId } : old); setSelected(null); }} />)}</View>}
      {choice && problem?.code !== 'FORBIDDEN' && ((!!data && (!data.credential || data.installations?.items.length === 0) && !busy) || !!error) && <View style={s.access}>
        <Text style={s.heading}>Cấp quyền truy cập repository</Text><Text style={s.copy}>Cho phép GitHub App truy cập những repository bạn chọn. Không cần cấp quyền cho toàn bộ tài khoản.</Text>
        <HubAction title="Tiếp tục trên GitHub" variant="primary" busy={saving} onPress={() => void authorize()} />
      </View>}
      {fallback && <View style={s.alert}><Text style={s.copy}>Trình duyệt chưa mở được tab GitHub. Nhấn nút dưới đây để tiếp tục, sau đó quay lại UniNet.</Text><HubAction title="Mở GitHub" onPress={() => {
        if (Date.parse(fallback.expiresAt) <= Date.now()) { setActionError('Yêu cầu hết hạn. Hãy bắt đầu cấp quyền lại.'); return; }
        waitForGitHub(); void openGitHubAppAuthorization(fallback.url).catch(cause => setActionError(gitError(cause)));
      }} /></View>}
      {data?.installations && (!data.installation || chooseInstallation) && <View style={{ gap: 10 }}><Text style={s.heading}>Chọn nơi lưu repository</Text>
        {!data.installations.items.length && <Text style={s.copy}>Chưa tìm thấy installation. Cài đặt hoặc cấp quyền cho App trên đúng tài khoản/tổ chức GitHub rồi quay lại UniNet.</Text>}
        {data.installations.items.map(item => <HubAction key={item.installationId} title={`${item.ownerLogin} · ${item.status === 'Active' ? 'Hoạt động' : 'Không khả dụng'}`} disabled={item.status !== 'Active' || saving} onPress={() => { setChoice(old => old ? { ...old, installationId: item.installationId, repositoryPage: 1 } : old); setChooseInstallation(false); setSelected(null); }} />)}
        {(data.installations.hasMore || data.installations.page > 1) && <View style={s.row}><HubAction compact title="Trang trước" disabled={data.installations.page <= 1 || busy} onPress={() => setChoice(old => old ? { ...old, installationId: undefined, installationPage: old.installationPage - 1 } : old)} /><HubAction compact title="Trang tiếp" disabled={!data.installations.hasMore || busy} onPress={() => setChoice(old => old ? { ...old, installationId: undefined, installationPage: old.installationPage + 1 } : old)} /></View>}
      </View>}
      {data?.installation && <View style={s.context}><Text style={[s.copy, { flex: 1 }]}>Repository của {data.installation.ownerLogin}</Text>{data.installations && (data.installations.items.length > 1 || data.installations.hasMore || data.installations.page > 1) && <HubAction compact title="Đổi tài khoản quản lý" variant="quiet" onPress={() => setChooseInstallation(true)} />}</View>}
      {data?.repositories && <View style={{ gap: 10 }}>
        {!data.repositories.items.length && <Text style={s.copy}>Chưa có repository được cấp quyền trong danh sách này.</Text>}
        {data.repositories.items.map(repo => {
          const linked = data.linkedIds.includes(repo.repositoryId);
          return <View key={repo.repositoryId} style={s.repo}><HubAction title={repo.fullName} variant={repository?.repositoryId === repo.repositoryId ? 'primary' : 'secondary'} disabled={!repo.eligible || linked || saving} onPress={() => { setSelected({ scope, repo }); refresh.stopWaiting(); setActionError(''); }} />
            <Text style={s.copy}>{repo.isPrivate ? 'Riêng tư' : 'Công khai'} · {linked ? 'Đã liên kết với dự án này' : repo.eligible ? 'Có thể liên kết' : 'Chưa đủ quyền quản trị để liên kết'}</Text>
          </View>;
        })}
        {(data.repositories.hasMore || data.repositories.page > 1) && <View style={s.row}><HubAction compact title="Repository trước" disabled={data.repositories.page <= 1 || busy || saving} onPress={() => { setChoice(old => old ? { ...old, repositoryPage: old.repositoryPage - 1 } : old); setSelected(null); }} /><Text style={s.copy}>Trang {data.repositories.page}</Text><HubAction compact title="Repository tiếp" disabled={!data.repositories.hasMore || busy || saving} onPress={() => { setChoice(old => old ? { ...old, repositoryPage: old.repositoryPage + 1 } : old); setSelected(null); }} /></View>}
      </View>}
      {data?.installation && <View style={s.help}><Text style={s.copy}>Không thấy repository? Chọn Only select repositories trên GitHub, thêm repository cần thiết và Save. Quay lại đây, danh sách sẽ tự kiểm tra.</Text><HubAction compact title="Cấp quyền thêm repository" variant="quiet" disabled={saving} onPress={() => {
        waitForGitHub(); void Linking.openURL(githubInstallationConfiguration(data.installation!).url).catch(cause => setActionError(gitError(cause)));
      }} /></View>}
      {repository && <View style={s.access}><Text style={s.heading}>Sẽ liên kết vào {projectName}</Text><Text style={s.copy}>@{choice?.account.login} · {data?.installation?.ownerLogin}{'\n'}{repository.fullName}{'\n'}Quyền sẽ được kiểm tra lại khi bạn xác nhận.</Text></View>}
    </View>
  </HubModal>;
}
const s = StyleSheet.create({ content: { gap: 18 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, context: { flexDirection: 'row', alignItems: 'center', gap: 10 }, access: { backgroundColor: c.canvas, padding: 14, borderRadius: 8, gap: 12 }, help: { gap: 8, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 14 }, repo: { gap: 5 }, alert: { gap: 10 }, heading: { color: c.ink, fontSize: 14, fontWeight: '600' }, copy: { color: c.textSecondary, fontSize: 13, lineHeight: 20 }, error: { color: c.error, fontSize: 13, lineHeight: 20 } });
