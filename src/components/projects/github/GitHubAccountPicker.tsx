import { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { projectGitService } from '@/services/project-github.service';
import type { GitHubConnection } from '@/types/project-github';
import { useAuthStore } from '@/store/auth.store';
import { beginGitHubOAuth } from '@/utils/github-oauth';
import { gitError } from '@/utils/project-github';
import { useGitHubRevalidation } from '@/hooks/useGitHubRevalidation';
import { HubAction, hubColors as c } from '../hub/ProjectHubUI';

export function GitHubAccountPicker({ projectId, tab, onSelect, selectedId, disabled = false }: { projectId: string; tab: 'members' | 'settings'; onSelect: (connection: GitHubConnection) => Promise<void>; selectedId?: string; disabled?: boolean }) {
  const { account } = useAuthStore();
  const [connections, setConnections] = useState<GitHubConnection[]>([]), [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refresh = useGitHubRevalidation(`${projectId}:${account?.id}:connections`, projectId, async signal => {
    try { const value = await projectGitService.connections(signal); if (signal.aborted) return false; setConnections(value); setError(''); setLoaded(true); return true; }
    catch (cause) { if (!signal.aborted) { setError(gitError(cause)); setLoaded(true); } throw cause; }
  }, !disabled);
  const loading = !loaded && !error;
  async function run(action: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(gitError(cause)); } finally { lock.current = false; setBusy(false); }
  }
  return <View style={s.root}>
    <Text style={s.copy}>{tab === 'members' ? 'Chọn tài khoản GitHub của bạn để xác minh đóng góp trong dự án.' : 'Chọn tài khoản GitHub để tìm repository bạn muốn liên kết.'}</Text>
    {loading && <ActivityIndicator accessibilityLabel="Đang tải tài khoản GitHub" color={c.primary} />}
    {!loading && !connections.length && <Text style={s.copy}>Chưa có tài khoản GitHub được xác minh.</Text>}
    {connections.map(connection => <View key={connection.id} style={s.row}>
      {!!connection.avatarUrl && <Image source={{ uri: connection.avatarUrl }} accessibilityLabel={`Ảnh GitHub ${connection.login}`} style={{ width: 32, height: 32, borderRadius: 16 }} />}
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.name}>@{connection.login}</Text><Text style={s.copy}>{connection.status === 0 ? 'Đã xác minh' : 'Cần xác thực lại'}</Text></View>
      {connection.status === 0 && <HubAction compact title={tab === 'members' ? `Liên kết @${connection.login} với tôi` : `Dùng @${connection.login}`} variant={selectedId === connection.id ? 'primary' : 'secondary'} disabled={busy || disabled} onPress={() => void run(() => onSelect(connection))} />}
    </View>)}
    {(!!error || refresh.state === 'timeout') && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={s.error}>{error || 'Chưa thể kiểm tra tài khoản GitHub.'}</Text><HubAction compact title="Thử lại tài khoản" onPress={() => void refresh.check()} /></View>}
    <View style={s.row}><HubAction compact title={tab === 'settings' ? 'Liên kết tài khoản GitHub khác' : 'Xác minh tài khoản GitHub'} variant="primary" busy={busy} disabled={loading || disabled || !account} onPress={() => account && void run(() => beginGitHubOAuth(account.id, projectId, tab))} />
    </View>
  </View>;
}
const s = StyleSheet.create({ root: { gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, name: { color: c.ink, fontWeight: '600', fontSize: 14 }, copy: { color: c.textSecondary, fontSize: 13, lineHeight: 20 }, error: { color: c.error, fontSize: 13, lineHeight: 20 } });
