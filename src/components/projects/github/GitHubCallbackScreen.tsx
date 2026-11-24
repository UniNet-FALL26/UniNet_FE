import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { projectGitService } from '@/services/project-github.service';
import { clearGitHubFlow, readGitHubFlow, type GitHubPendingFlow } from '@/utils/github-oauth';
import { gitError } from '@/utils/project-github';
import { notifyGitHubChanged } from '@/hooks/useGitHubRevalidation';
import { HubAction, HubIcon, hubColors as c } from '../hub/ProjectHubUI';

export function GitHubCallbackScreen() {
  const params = useLocalSearchParams<{ githubFlowId?: string; githubStatus?: string; githubAppFlowId?: string; githubAppStatus?: string }>();
  const { account, isLoading } = useAuthStore(); const router = useRouter(); const started = useRef(false);
  const [pending, setPending] = useState<GitHubPendingFlow | null>(null), [error, setError] = useState(''), [done, setDone] = useState(false);
  useEffect(() => {
    if (isLoading || !account || started.current) return;
    started.current = true;
    void (async () => {
      try {
        if (params.githubAppFlowId) { setError('Đã quay lại từ GitHub. Hãy mở Cài đặt dự án; quyền truy cập sẽ được kiểm tra lại.'); return; }
        const flow = await readGitHubFlow();
        if (!flow || flow.accountId !== account.id || flow.flowId !== params.githubFlowId) { setError('Phiên xác minh không khớp tài khoản hoặc đã hết hạn. Hãy quay lại dự án và bắt đầu lại.'); return; }
        setPending(flow);
        if (params.githubStatus !== 'ready') { setError('Chưa xác nhận được quyền GitHub. Hãy quay lại dự án và thử liên kết lại.'); return; }
        await projectGitService.completeOAuth(flow.flowId);
        notifyGitHubChanged(flow.projectId);
        await clearGitHubFlow(); setDone(true);
      } catch (cause) { setError(gitError(cause)); }
    })();
  }, [account, isLoading, params.githubFlowId, params.githubStatus, params.githubAppFlowId]);
  return <View style={s.page}><View style={s.card}>
    <HubIcon name={done ? 'check' : 'link'} size={32} />
    <Text accessibilityRole="header" style={s.title}>{done ? 'Tài khoản GitHub đã được xác minh' : 'Xác minh tài khoản GitHub'}</Text>
    {(!account && !isLoading) ? <><Text style={s.copy}>Đăng nhập lại bằng đúng tài khoản đã bắt đầu xác minh, sau đó mở lại trang này.</Text><HubAction title="Đăng nhập" onPress={() => router.push('/login' as never)} /></> : !done && !error ? <ActivityIndicator accessibilityLabel="Đang hoàn tất xác minh GitHub" color={c.primary} /> : null}
    {done && <Text style={s.copy}>Tài khoản đã được xác minh. Quay lại dự án để tiếp tục liên kết GitHub.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <HubAction title={pending ? 'Quay lại dự án' : 'Về dự án của tôi'} variant="primary" onPress={() => router.replace(pending ? { pathname: '/group/[id]', params: { id: pending.projectId, tab: pending.tab } } : '/profile/projects' as never)} />
  </View></View>;
}
const s = StyleSheet.create({ page: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: c.canvas }, card: { width: '100%', maxWidth: 520, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', gap: 18 }, title: { color: c.ink, fontWeight: '600', fontSize: 20 }, copy: { color: c.textSecondary, fontSize: 14, lineHeight: 22 }, error: { color: c.error, fontSize: 14, lineHeight: 22 } });
