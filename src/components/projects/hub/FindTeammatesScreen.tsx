import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { useAuthStore } from '@/store/auth.store';
import type { HubPage } from '@/types/project-hub';
import { HubAction, HubIcon, hubColors as c, ui } from './ProjectHubUI';
import { messageOf } from './ProjectHubFields';
import { RecruitmentPostCard } from './RecruitmentPostCard';
import { RecruitmentPostDialog } from './RecruitmentPostDialog';

export function FindTeammatesScreen() {
  const { account } = useAuthStore();
  const [query, setQuery] = useState(''), [search, setSearch] = useState('');
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: HubPage } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null), [gridWidth, setGridWidth] = useState(0);
  const key = `${account?.id}:${page}:${search}`;
  useFocusEffect(useCallback(() => {
    if (!account?.id) return;
    const controller = new AbortController(); setLoading(true); setError('');
    projectHubService.discover(page, search, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [account?.id, page, search, key, attempt]));
  const data = result?.key === key ? result.data : null;
  const columns = gridWidth >= 760 ? 2 : 1;
  const cardWidth = gridWidth ? (gridWidth - 20 * (columns - 1)) / columns : '100%' as const;
  const find = () => { setPage(1); setSearch(query.trim()); };
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.page}>
        <View style={s.heading}><View style={s.emblem}><HubIcon name="people" size={25} /></View><View style={{ flex: 1, gap: 6 }}>
          <Text accessibilityRole="header" aria-level={1} style={s.title}>Tìm đồng đội</Text>
          <Text style={s.subtitle}>Khám phá dự án đang tuyển thành viên và cùng nhau tạo nên điều mới.</Text>
        </View></View>
        <View style={s.searchRow}><View style={s.search}><HubIcon name="search" size={19} /><TextInput accessibilityLabel="Tìm tên hoặc mô tả dự án" placeholder="Tìm tên hoặc mô tả dự án…" value={query} onChangeText={setQuery} maxLength={200} onSubmitEditing={find} returnKeyType="search" style={s.input} /></View>
          <HubAction title="Tìm kiếm" variant="primary" onPress={find} />
        </View>
        <View style={s.resultsHead}><Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>Dự án đang tuyển thành viên</Text>{!loading && !error && data && <Text role="status" style={s.subtitle}>{data.total} bài tuyển</Text>}</View>
        {loading ? <View style={s.state}><ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bài tuyển" /><Text style={ui.muted}>Đang tìm đồng đội cho bạn…</Text></View>
          : error ? <View style={s.state}><HubIcon name="warning" size={30} color={c.error} /><Text role="alert" style={ui.error}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(n => n + 1)} /></View>
          : !data?.items.length ? <View style={s.state}><HubIcon name="people" size={36} /><Text accessibilityRole="header" aria-level={3} style={s.sectionTitle}>Chưa tìm thấy bài tuyển phù hợp</Text><Text style={s.emptyText}>{search ? 'Thử tìm với tên hoặc mô tả khác để khám phá thêm dự án.' : 'Các dự án đang mở tuyển sẽ xuất hiện tại đây. Hãy quay lại sau nhé.'}</Text></View>
          : <><View style={s.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>{data.items.map(project => <RecruitmentPostCard key={project.id} project={project} width={cardWidth} onOpen={() => setSelected(project.id)} />)}</View>
            {data.total > data.pageSize && <View style={s.pagination}><HubAction title="Trang trước" icon="back" disabled={page <= 1} onPress={() => setPage(n => n - 1)} /><Text style={ui.muted}>{data.page} / {Math.ceil(data.total / data.pageSize)}</Text><HubAction title="Trang sau" icon="next" disabled={page * data.pageSize >= data.total} onPress={() => setPage(n => n + 1)} /></View>}
          </>}
      </View>
    </ScrollView>
    {selected && <RecruitmentPostDialog key={`${account?.id}:${selected}`} projectId={selected} onClose={() => setSelected(null)} />}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas }, scroll: { flexGrow: 1, paddingBottom: 32 }, page: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 28, gap: 24 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14 }, emblem: { width: 50, height: 50, borderRadius: 14, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.ink, fontSize: 26, lineHeight: 34, fontWeight: '700' }, subtitle: { color: c.textSecondary, fontSize: 13, lineHeight: 21 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, search: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 9, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  input: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 14, paddingVertical: 10, color: c.ink },
  resultsHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: c.ink, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 20 }, state: { paddingVertical: 64, alignItems: 'center', gap: 16 }, emptyText: { color: c.textSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 420 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
