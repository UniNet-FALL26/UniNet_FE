import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { projectHubService } from '@/services/project-hub.service';
import type { HubPage, HubProject } from '@/types/project-hub';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectInboxModal } from './ProjectInboxModal';
import { HubAction, HubIcon, HubStatus, HubTags, ProjectCover, hubColors, ui } from './ProjectHubUI';

export function ProfileProjectsPanel({ initialCreate = false }: { initialCreate?: boolean }) {
  const { account } = useAuthStore();
  const [result, setResult] = useState<{ accountId: string; page: HubPage } | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(initialCreate);
  const [inbox, setInbox] = useState(false);
  const { width } = useWindowDimensions();
  const close = useCallback(() => { setCreating(false); router.setParams({ new: undefined }); }, []);
  useEffect(() => { if (initialCreate) setCreating(true); }, [initialCreate]);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!account?.id) return;
    const abort = new AbortController(); const accountId = account.id;
    setLoading(true); setError('');
    projectHubService.mine(page, query, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ accountId, page: data }); })
      .catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được danh sách dự án.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [account?.id, page, query, attempt]);
  const data = result?.accountId === account?.id ? result?.page : null;
  const created = (project: HubProject) => {
    setCreating(false); setAttempt(value => value + 1); router.setParams({ new: undefined });
    router.push({ pathname: '/group/[id]', params: { id: project.id } });
  };
  return <View role="tabpanel" aria-label="Dự án" testID="profile-projects-panel" style={[styles.root, width < 600 && { paddingHorizontal: 16 }]}>
    <View style={styles.headingRow}><View style={{ flex: 1, minWidth: 180 }}><View style={styles.eyebrow}><HubIcon name="folder" size={17} /><Text style={styles.eyebrowText}>KHÔNG GIAN DỰ ÁN</Text></View><Text accessibilityRole="header" style={styles.title}>Dự án của tôi</Text><Text style={styles.subtitle}>Từ ý tưởng đầu tiên đến những điều bạn đã làm được.</Text></View><HubAction title="Thêm dự án" icon="plus" variant="primary" onPress={() => setCreating(true)} testID="profile-add-project" /></View>
    <View style={styles.toolbar}><Text style={styles.total}>Tất cả dự án{data ? ` (${data.total})` : ''}</Text><View style={styles.search}><HubIcon name="search" size={19} color={hubColors.textMuted} /><TextInput accessibilityLabel="Tìm dự án của tôi" placeholder="Tìm theo tên dự án…" placeholderTextColor={hubColors.textMuted} value={search} onChangeText={setSearch} style={styles.searchInput} />{search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setSearch('')} style={{ padding: 5 }}><HubIcon name="close" size={16} color={hubColors.textSecondary} /></Pressable>}</View><HubAction title="Lời mời & ứng tuyển" icon="invite" onPress={() => setInbox(true)} /></View>
    {loading ? <View style={styles.state}><ActivityIndicator color={hubColors.primary} accessibilityLabel="Đang tải dự án" /><Text style={ui.muted}>Đang tải dự án của bạn…</Text></View>
      : error ? <View style={styles.state}><HubIcon name="warning" size={32} color={hubColors.error} /><Text accessibilityRole="alert" style={[ui.error, { textAlign: 'center' }]}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data?.items.length ? <View style={styles.empty}><View style={styles.emptyIcon}><HubIcon name="folder" size={38} /></View><Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>{query ? 'Chưa tìm thấy dự án phù hợp' : 'Mọi dự án đều bắt đầu từ một ý tưởng'}</Text><Text style={styles.emptyText}>{query ? 'Thử một tên khác hoặc xóa từ khóa tìm kiếm.' : 'Lưu lại dự án bạn đã thực hiện, hoặc bắt đầu một điều mới. Bạn có thể thêm chi tiết và mời mọi người cùng tham gia sau.'}</Text><HubAction title={query ? 'Xóa tìm kiếm' : 'Thêm dự án đầu tiên'} icon={query ? 'close' : 'plus'} variant="primary" onPress={() => query ? setSearch('') : setCreating(true)} /></View>
      : <><View style={styles.grid}>{data.items.map(project => <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`Xem dự án ${project.title}`} onPress={() => router.push({ pathname: '/group/[id]', params: { id: project.id } })} style={({ pressed }) => [styles.card, { width: width >= 1300 ? '31.8%' : width >= 750 ? '48.5%' : '100%' }, pressed && { opacity: 0.8 }]}>
        <ProjectCover url={project.logoUrl} title={project.title} height={174} style={{ borderRadius: 0 }} /><View style={styles.cardBody}><View style={styles.cardMeta}><View style={[styles.mode, project.mode === 'community' && { backgroundColor: '#EAF1FF' }]}><HubIcon name={project.mode === 'community' ? 'people' : 'person'} size={13} color={project.mode === 'community' ? hubColors.primary : hubColors.textSecondary} /><Text style={[styles.modeText, project.mode === 'community' && { color: hubColors.primary }]}>{project.mode === 'community' ? 'Cộng đồng' : 'Cá nhân'}</Text></View><Text style={styles.origin}>{project.origin === 1 ? 'Bên ngoài UniNet' : 'Trên UniNet'}</Text></View>
          <Text numberOfLines={2} style={styles.cardTitle}>{project.title}</Text><Text numberOfLines={2} style={[ui.muted, { minHeight: 42 }]}>{project.description}</Text><HubTags values={project.technologies.slice(0, 4)} /><View style={styles.cardFoot}><HubStatus status={project.status} /><Text style={styles.owner}>{project.isOwner ? 'Chủ dự án' : 'Thành viên'}</Text></View>
        </View></Pressable>)}</View>{data.total > data.pageSize && <View style={styles.pagination}><HubAction title="Trang trước" icon="back" disabled={page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={ui.muted}>{page} / {Math.ceil(data.total / data.pageSize)}</Text><HubAction title="Trang sau" icon="next" disabled={page * data.pageSize >= data.total} onPress={() => setPage(value => value + 1)} /></View>}</>}
    {creating && <CreateProjectModal onClose={close} onCreated={created} />}
    {inbox && <ProjectInboxModal onClose={() => setInbox(false)} onChanged={projectId => { setAttempt(value => value + 1); if (projectId) { setInbox(false); router.push({ pathname: '/group/[id]', params: { id: projectId } }); } }} />}
  </View>;
}
const styles = StyleSheet.create({
  root: { width: '100%', maxWidth: 1260, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 30, paddingBottom: 48 }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 30 }, eyebrow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }, eyebrowText: { fontSize: 11, letterSpacing: 1.5, fontWeight: '600', color: hubColors.primary }, title: { fontSize: 29, fontWeight: '700', color: hubColors.ink, letterSpacing: -0.5 }, subtitle: { color: hubColors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottomWidth: 1, borderColor: hubColors.line, paddingBottom: 19, marginBottom: 24 }, total: { fontSize: 15, fontWeight: '600', color: hubColors.ink }, search: { minWidth: 230, maxWidth: 360, flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: hubColors.line, borderRadius: 9, paddingHorizontal: 12, backgroundColor: '#FFFFFF' }, searchInput: { flex: 1, minWidth: 0, minHeight: 43, paddingHorizontal: 9, fontSize: 13, color: hubColors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 21 }, card: { overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: hubColors.line, backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(22,39,75,0.03)' }, cardBody: { padding: 20, gap: 13 }, cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, mode: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 5, backgroundColor: '#F2F4F8', paddingHorizontal: 7, paddingVertical: 4 }, modeText: { fontSize: 11, fontWeight: '500', color: hubColors.textSecondary }, origin: { fontSize: 10, color: hubColors.textMuted }, cardTitle: { fontSize: 19, fontWeight: '700', color: hubColors.ink }, cardFoot: { paddingTop: 14, borderTopWidth: 1, borderColor: '#EFF2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }, owner: { color: hubColors.textMuted, fontSize: 11 },
  state: { minHeight: 330, alignItems: 'center', justifyContent: 'center', gap: 15, padding: 28 }, empty: { minHeight: 385, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 17, borderWidth: 1, borderColor: hubColors.line, backgroundColor: '#FFFFFF', borderRadius: 15 }, emptyIcon: { width: 86, height: 86, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF3FF', marginBottom: 4 }, emptyTitle: { fontSize: 21, fontWeight: '600', color: hubColors.ink, textAlign: 'center' }, emptyText: { maxWidth: 470, color: hubColors.textSecondary, fontSize: 14, lineHeight: 23, textAlign: 'center', marginBottom: 4 }, pagination: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
});
