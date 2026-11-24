import { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { assessorService, type AssignmentPage, type AssessorProject } from '@/services/assessor.service';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/constants/colors';
import { AssignmentStatus, AssessorState, assessorStyles as s } from '@/components/assessor/assessor-ui';

const filters = [{ label: 'Tất cả', value: undefined }, { label: 'Đang thẩm định', value: 0 }, { label: 'Quá hạn', value: 2 }, { label: 'Hoàn thành', value: 1 }, { label: 'Đã hủy', value: 3 }];
const date = (value: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Chưa cập nhật';
  const d = new Date(value), pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
function Icon({ name, size = 20 }: { name: 'refresh' | 'event' | 'filter_list' | 'assignment' | 'business' | 'schedule' | 'group' | 'chevron_left' | 'chevron_right'; size?: number }) {
  const ios = { refresh: 'arrow.clockwise', event: 'calendar', filter_list: 'line.3.horizontal.decrease', assignment: 'doc.text', business: 'building.2', schedule: 'clock', group: 'person.2', chevron_left: 'chevron.left', chevron_right: 'chevron.right' } as const;
  return <SymbolView name={{ ios: ios[name], android: name, web: name }} size={size} tintColor={colors.primary} />;
}
function ProjectImage({ uri }: { uri?: string | null }) {
  const [failed, setFailed] = useState(false);
  return <View style={local.image}>{uri && !failed ? <Image accessibilityLabel="Ảnh dự án" source={{ uri }} onError={() => setFailed(true)} style={local.imageFill} resizeMode="cover" /> : <Icon name="assignment" size={22} />}</View>;
}
function DateInfo({ label, value }: { label: string; value: string | null }) {
  return <View style={local.dateInfo}><View style={local.dateCopy}><Text style={local.dateLabel}>{label}</Text><Text style={local.dateValue}>{date(value)}</Text></View></View>;
}
export default function AssessorAssignmentsScreen() {
  const { account } = useAuthStore();
  const width = useWindowDimensions().width, narrow = width < 700, desktop = width >= 1100;
  const [status, setStatus] = useState<number | undefined>(), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [showFilters, setShowFilters] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; result: AssignmentPage } | null>(null), [projects, setProjects] = useState<Record<string, AssessorProject>>({}), [error, setError] = useState('');
  const key = `${account?.id}:${status}:${page}:${attempt}`, data = loaded?.key === key ? loaded.result : null;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError(''); setProjects({});
    assessorService.list(page, status, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLoaded({ key, result });
      void Promise.allSettled(result.assignments.map(async row => {
        const detail = await assessorService.detail(row.id, controller.signal);
        if (!controller.signal.aborted) setProjects(previous => ({ ...previous, [row.id]: detail.project }));
      }));
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách thẩm định.'); });
    return () => controller.abort();
  }, [key, page, status]));
  const totalPages = Math.max(data?.totalPages || 0, 1);
  const pages = Array.from(new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), totalPages].filter(p => p >= 1 && p <= totalPages))).sort((a, b) => a - b);
  return <View style={[s.page, local.page]}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, local.content, narrow && s.mobileContent]}>
    <View style={[local.header, narrow && local.mobileHeader]}>
      <View style={local.heading}><View style={local.headingCopy}><Text role="heading" aria-level={1} style={local.title}>Danh sách thẩm định</Text><Text style={local.subtitle}>Theo dõi lịch hẹn, tiến độ và kết quả thẩm định.</Text></View></View>
      <View style={[local.actions, narrow && local.mobileActions]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tải lại danh sách thẩm định" onPress={() => setAttempt(v => v + 1)} style={[local.refresh, narrow && local.mobileControl]}><Icon name="refresh" size={17} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bộ lọc" accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(v => !v)} style={[local.button, narrow && local.mobileControl, (showFilters || status !== undefined) && local.filterActive]}><Icon name="filter_list" size={16} /><Text style={local.buttonText}>Bộ lọc{status !== undefined ? ' • 1' : ''}</Text></Pressable>
      </View>
    </View>
    {showFilters && <View style={local.filterPanel}><Text style={local.filterLabel}>Trạng thái thẩm định</Text><View style={local.filters}>{filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }} onPress={() => { setStatus(filter.value); setPage(1); }} style={[local.filter, narrow && local.mobileControl, status === filter.value && local.selected]}><Text style={[local.filterText, status === filter.value && local.primaryText]}>{filter.label}</Text></Pressable>)}</View></View>}
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data ? <AssessorState loading /> : <>
      {!data.assignments.length ? <AssessorState empty={status === undefined ? 'Chưa có công việc thẩm định' : 'Không có công việc ở trạng thái này'} /> : <View role="region" accessibilityLabel="Danh sách hồ sơ thẩm định" style={local.list}>{data.assignments.map((row, index) => {
        const project = projects[row.id];
        const title = project?.title || `Phiên thẩm định #${row.id.slice(0, 8).toUpperCase()}`;
        return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Xem thẩm định ${title}`} onPress={() => router.push(`/(assessor)/assessor-assessments/${row.id}` as Href)} style={({ pressed, hovered }) => [local.card, desktop && local.desktopCard, index === data.assignments.length - 1 && local.lastRow, hovered && local.hovered, pressed && { opacity: 0.75 }]}>
          <View style={[local.projectSection, desktop && local.desktopProject]}><ProjectImage key={`${row.id}:${project?.imageUrl}`} uri={project?.imageUrl} /><View style={local.projectCopy}><Text numberOfLines={desktop ? 2 : 3} style={local.projectTitle}>{title}</Text><Text style={local.fieldText}>{project?.projectField || 'Chưa cập nhật lĩnh vực'}</Text>{!desktop && <View style={local.mobileStatus}><AssignmentStatus status={row.status} compact /></View>}</View></View>
          <View style={[local.dates, desktop && local.desktopDates]}><DateInfo label="Lịch thẩm định" value={row.scheduledStartAt} /><DateInfo label="Hạn báo cáo" value={row.reportDueAt} /><DateInfo label="Ngày phân công" value={row.assignedAt} /></View>
          <View style={[local.rowEnd, desktop && local.desktopEnd]}>{desktop && <AssignmentStatus status={row.status} compact />}<View style={local.details}><Text style={local.detailText}>Xem chi tiết</Text><Icon name="chevron_right" size={14} /></View></View>
        </Pressable>;
      })}</View>}
      <View style={[local.footer, narrow && local.mobileFooter]}><Text style={local.summary}>Hiển thị {data.totalItems ? (data.page - 1) * data.pageSize + 1 : 0} – {Math.min((data.page - 1) * data.pageSize + data.assignments.length, data.totalItems)} trên {data.totalItems} nhiệm vụ</Text><View style={local.pagination}><Pressable accessibilityRole="button" accessibilityLabel="Trang trước" disabled={page <= 1} onPress={() => setPage(v => v - 1)} style={[local.pageButton, narrow && local.mobileControl, page <= 1 && local.disabled]}><Icon name="chevron_left" size={16} /></Pressable>{pages.map((p, index) => <View key={p} style={local.pageGroup}>{index > 0 && p - pages[index - 1] > 1 && <Text style={local.ellipsis}>…</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`Trang ${p}`} accessibilityState={{ selected: page === p }} onPress={() => setPage(p)} style={[local.pageButton, narrow && local.mobileControl, page === p && local.selected]}><Text style={[local.pageText, page === p && local.primaryText]}>{p}</Text></Pressable></View>)}<Pressable accessibilityRole="button" accessibilityLabel="Trang sau" disabled={page >= totalPages} onPress={() => setPage(v => v + 1)} style={[local.pageButton, narrow && local.mobileControl, page >= totalPages && local.disabled]}><Icon name="chevron_right" size={16} /></Pressable></View></View>
    </>}
  </ScrollView></View>;
}
const local = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { maxWidth: 1280, padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  mobileHeader: { gap: 12 }, heading: { flex: 1, minWidth: 200 }, headingCopy: { gap: 4 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.textPrimary }, subtitle: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' }, mobileActions: { width: '100%', justifyContent: 'flex-end' },
  button: { minHeight: 34, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  refresh: { width: 34, minHeight: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, mobileControl: { minHeight: 44, minWidth: 44 },
  buttonText: { fontSize: 12, fontWeight: '500', color: colors.textPrimary }, filterActive: { backgroundColor: colors.primaryLight }, primaryText: { color: colors.surface, fontSize: 12, fontWeight: '600' },
  filterPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8, gap: 10 }, filterLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5, backgroundColor: colors.background, justifyContent: 'center' }, filterText: { fontSize: 12, color: colors.textSecondary }, selected: { backgroundColor: colors.primary },
  imageFill: { width: '100%', height: '100%' }, list: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, overflow: 'hidden' },
  card: { backgroundColor: colors.surface, padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, lastRow: { borderBottomWidth: 0 },
  desktopCard: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 76 }, hovered: { backgroundColor: '#FAFBFD' },
  projectSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, desktopProject: { flex: 1.4, minWidth: 0, alignItems: 'center' },
  image: { width: 36, height: 36, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, projectCopy: { flex: 1, minWidth: 0, gap: 3 },
  projectTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 19, fontWeight: '600' }, fieldText: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 }, mobileStatus: { marginTop: 4, alignItems: 'flex-start' },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }, desktopDates: { flex: 1.8, flexWrap: 'nowrap', borderTopWidth: 0, paddingTop: 0, gap: 12 },
  dateInfo: { flexGrow: 1, minWidth: 120 }, dateCopy: { gap: 3 }, dateLabel: { fontSize: 11, color: colors.textSecondary }, dateValue: { fontSize: 12, lineHeight: 18, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowEnd: { alignItems: 'flex-end' }, desktopEnd: { flexDirection: 'row', alignItems: 'center', gap: 16 }, details: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 }, detailText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, mobileFooter: { justifyContent: 'center' }, summary: { fontSize: 11, color: colors.textSecondary },
  pagination: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }, pageGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageButton: { width: 32, minHeight: 32, borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, pageText: { fontSize: 12, fontWeight: '500', color: colors.textPrimary }, ellipsis: { color: colors.textSecondary, paddingHorizontal: 3 }, disabled: { opacity: 0.35 },
});
