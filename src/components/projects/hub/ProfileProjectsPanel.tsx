import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { projectHubService } from '@/services/project-hub.service';
import type { HubPage, HubProject } from '@/types/project-hub';
import { CreateProjectModal } from './CreateProjectModal';
import { HubAction, HubIcon, hubColors, ui } from './ProjectHubUI';
import { ProjectListCard } from './ProjectListCard';

export function ProfileProjectsPanel({ initialCreate = false }: { initialCreate?: boolean }) {
  const { account } = useAuthStore();
  const [result, setResult] = useState<{ accountId: string; page: HubPage } | null>(null);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(initialCreate);
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridWidth >= 810 ? 3 : gridWidth >= 540 ? 2 : 1;
  const cardWidth = gridWidth ? (gridWidth - 20 * (columns - 1)) / columns : '100%' as const;
  const close = useCallback(() => { setCreating(false); router.setParams({ new: undefined }); }, []);
  useEffect(() => { if (initialCreate) setCreating(true); }, [initialCreate]);
  useFocusEffect(useCallback(() => {
    if (!account?.id) return;
    const abort = new AbortController(); const accountId = account.id;
    setLoading(true); setError('');
    projectHubService.mine(page, '', abort.signal).then(data => { if (!abort.signal.aborted) setResult({ accountId, page: data }); })
      .catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được danh sách dự án.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [account?.id, page, attempt]));
  const data = result?.accountId === account?.id ? result?.page : null;
  const created = (project: HubProject) => {
    setCreating(false); setAttempt(value => value + 1); router.setParams({ new: undefined });
    router.push({ pathname: '/group/[id]', params: { id: project.id } });
  };
  return <View role="tabpanel" aria-label="Dự án" testID="profile-projects-panel" style={[styles.root, width < 600 && { paddingHorizontal: 16 }]}>
    <View style={styles.headingRow}><View style={{ flex: 1, minWidth: 180 }}><Text accessibilityRole="header" style={styles.title}>Dự án của tôi</Text><Text style={styles.subtitle}>Quản lý tất cả dự án bạn đã tạo hoặc đang tham gia.</Text></View><HubAction compact title="Thêm dự án" icon="plus" variant="primary" onPress={() => setCreating(true)} testID="profile-add-project" /></View>
    {loading ? <View style={styles.state}><ActivityIndicator color={hubColors.primary} accessibilityLabel="Đang tải dự án" /><Text style={ui.muted}>Đang tải dự án của bạn…</Text></View>
      : error ? <View style={styles.state}><HubIcon name="warning" size={32} color={hubColors.error} /><Text accessibilityRole="alert" style={[ui.error, { textAlign: 'center' }]}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data?.items.length ? <View style={styles.empty}><View style={styles.emptyIcon}><HubIcon name="folder" size={38} /></View><Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>Mọi dự án đều bắt đầu từ một ý tưởng</Text><Text style={styles.emptyText}>Lưu lại dự án bạn đã thực hiện, hoặc bắt đầu một điều mới. Bạn có thể thêm chi tiết và mời mọi người cùng tham gia sau.</Text><HubAction title="Thêm dự án đầu tiên" icon="plus" variant="primary" onPress={() => setCreating(true)} /></View>
      : <><View style={styles.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>{data.items.map(project => <ProjectListCard key={project.id} project={project} width={cardWidth} />)}</View>{data.total > data.pageSize && <View style={styles.pagination}><HubAction title="Trang trước" icon="back" disabled={page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={ui.muted}>{page} / {Math.ceil(data.total / data.pageSize)}</Text><HubAction title="Trang sau" icon="next" disabled={page * data.pageSize >= data.total} onPress={() => setPage(value => value + 1)} /></View>}</>}
    {creating && <CreateProjectModal onClose={close} onCreated={created} />}
  </View>;
}
const styles = StyleSheet.create({
  root: { width: '100%', maxWidth: 1260, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: hubColors.ink }, subtitle: { color: hubColors.ink, fontSize: 13, lineHeight: 21, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  state: { minHeight: 330, alignItems: 'center', justifyContent: 'center', gap: 15, padding: 28 }, empty: { minHeight: 385, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 17, borderWidth: 1, borderColor: hubColors.line, backgroundColor: '#FFFFFF', borderRadius: 15 }, emptyIcon: { width: 86, height: 86, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF3FF', marginBottom: 4 }, emptyTitle: { fontSize: 21, fontWeight: '600', color: hubColors.ink, textAlign: 'center' }, emptyText: { maxWidth: 470, color: hubColors.textSecondary, fontSize: 14, lineHeight: 23, textAlign: 'center', marginBottom: 4 }, pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
});
