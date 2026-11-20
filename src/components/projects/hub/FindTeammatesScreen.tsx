import { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { useAuthStore } from '@/store/auth.store';
import type { HubPage } from '@/types/project-hub';
import { HubAction, HubIcon, hubColors as c, ui } from './ProjectHubUI';
import { messageOf } from './ProjectHubFields';
import { RecruitmentPostCard } from './RecruitmentPostCard';
import { RecruitmentPostDialog } from './RecruitmentPostDialog';

export function FindTeammatesScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const phone = width < 600;
  const { account } = useAuthStore();
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  useFocusEffect(useCallback(() => {
    if (!account?.id) return;
    const controller = new AbortController();
    skillService.getSkills(controller.signal)
      .then(items => { if (!controller.signal.aborted) setCatalog(items); })
      .catch(() => { if (!controller.signal.aborted) setCatalog([]); });
    return () => controller.abort();
  }, [account?.id]));
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
  const cardWidth = gridWidth || '100%' as const;
  const find = () => { setPage(1); setSearch(query.trim()); };
  const openRecruitment = (id: string) => {
    if (phone) router.push({ pathname: '/recruitment/[id]', params: { id } } as Href);
    else setSelected(id);
  };
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.page}>
        <View testID="collaboration-banner" style={[s.banner, compact && s.bannerCompact]}>
          {!compact && <Image pointerEvents="none" aria-hidden source={require('../../../../assets/images/friends-banner-illustration.png')} contentFit="contain" contentPosition="right bottom" style={s.bannerArt} />}
          <View style={[s.bannerContent, compact && s.bannerContentCompact]}>
            <View style={s.heading}><View style={[s.emblem, compact && s.emblemCompact]}><HubIcon name="people" size={compact ? 24 : 28} /></View><View style={s.headingCopy}>
              <Text accessibilityRole="header" aria-level={1} style={[s.title, compact && s.titleCompact]}>Tìm đồng đội</Text>
              <Text style={s.bannerSubtitle}>Khám phá các dự án đang tuyển thành viên và cùng nhau tạo nên những sản phẩm, ý tưởng mới.</Text>
            </View></View>
            <View style={[s.searchRow, compact && s.searchRowCompact]}><View style={s.search}><HubIcon name="search" size={17} /><TextInput accessibilityLabel="Tìm tên hoặc mô tả dự án" placeholder="Tìm tên hoặc mô tả dự án…" placeholderTextColor="#7A8AA6" value={query} onChangeText={setQuery} maxLength={200} onSubmitEditing={find} returnKeyType="search" style={s.input} /><HubAction compact title="Tìm kiếm" variant="primary" onPress={find} style={s.searchButton} /></View></View>
          </View>
        </View>
        {!phone && <View style={s.resultsHead}><Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>Dự án đang tuyển thành viên</Text>{!loading && !error && data && <Text role="status" style={s.subtitle}>{data.total} bài tuyển</Text>}</View>}
        {loading ? <View style={s.state}><ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bài tuyển" /><Text style={ui.muted}>Đang tìm đồng đội cho bạn…</Text></View>
          : error ? <View style={s.state}><HubIcon name="warning" size={30} color={c.error} /><Text role="alert" style={ui.error}>{error}</Text><HubAction title="Thử lại" onPress={() => setAttempt(n => n + 1)} /></View>
          : !data?.items.length ? <View style={s.state}><HubIcon name="people" size={36} /><Text accessibilityRole="header" aria-level={3} style={s.sectionTitle}>Chưa tìm thấy bài tuyển phù hợp</Text><Text style={s.emptyText}>{search ? 'Thử tìm với tên hoặc mô tả khác để khám phá thêm dự án.' : 'Các dự án đang mở tuyển sẽ xuất hiện tại đây. Hãy quay lại sau nhé.'}</Text></View>
          : <><View style={s.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>{data.items.map(project => <RecruitmentPostCard key={project.id} project={project} catalog={catalog} width={cardWidth} onOpen={() => openRecruitment(project.id)} />)}</View>
            {data.total > data.pageSize && <View style={s.pagination}><HubAction title="Trang trước" icon="back" disabled={page <= 1} onPress={() => setPage(n => n - 1)} /><Text style={ui.muted}>{data.page} / {Math.ceil(data.total / data.pageSize)}</Text><HubAction title="Trang sau" icon="next" disabled={page * data.pageSize >= data.total} onPress={() => setPage(n => n + 1)} /></View>}
          </>}
      </View>
    </ScrollView>
    {selected && <RecruitmentPostDialog key={`${account?.id}:${selected}`} projectId={selected} onClose={() => setSelected(null)} />}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas }, scroll: { flexGrow: 1, paddingBottom: 32 }, page: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  banner: { minHeight: 184, paddingHorizontal: 28, paddingVertical: 22, justifyContent: 'center', borderWidth: 1, borderColor: '#E1E9FC', borderRadius: 18, overflow: 'hidden', backgroundColor: '#EAF1FF', experimental_backgroundImage: 'linear-gradient(115deg, #F5F7FF 0%, #E6EEFF 55%, #D6E7FF 100%)' },
  bannerCompact: { padding: 16, minHeight: 0 }, bannerArt: { position: 'absolute', right: -14, bottom: -40, width: '100%', height: '150%' },
  bannerContent: { width: '58%', maxWidth: 620, gap: 16 }, bannerContentCompact: { width: '100%', maxWidth: '100%', gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, headingCopy: { flex: 1, minWidth: 0, gap: 5 }, emblem: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, emblemCompact: { width: 42, height: 42, borderRadius: 12 },
  title: { color: '#101D40', fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.6 }, titleCompact: { fontSize: 23, lineHeight: 30 }, bannerSubtitle: { color: '#253759', fontSize: 12, lineHeight: 19, maxWidth: 430 }, subtitle: { color: c.textSecondary, fontSize: 13, lineHeight: 21 },
  searchRow: { marginLeft: 64 }, searchRowCompact: { marginLeft: 0 }, search: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#CEDDFA', borderRadius: 10, paddingLeft: 11, paddingRight: 4, paddingVertical: 4, backgroundColor: '#FFFFFF', boxShadow: '0 3px 10px rgba(44, 85, 167, 0.05)' },
  input: { flex: 1, minWidth: 0, minHeight: 32, fontSize: 12, paddingVertical: 6, color: c.ink }, searchButton: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  resultsHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: c.ink, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 20 }, state: { paddingVertical: 64, alignItems: 'center', gap: 16 }, emptyText: { color: c.textSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 420 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
