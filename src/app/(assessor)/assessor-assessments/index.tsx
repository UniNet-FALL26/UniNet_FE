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
  return <View style={local.image}>{uri && !failed ? <Image accessibilityLabel="Ảnh dự án" source={{ uri }} onError={() => setFailed(true)} style={local.imageFill} resizeMode="cover" /> : <Icon name="assignment" size={28} />}</View>;
}
function DateInfo({ label, value, icon }: { label: string; value: string | null; icon: 'event' | 'schedule' | 'group' }) {
  return <View style={local.dateInfo}><Icon name={icon} size={18} /><View style={local.dateCopy}><Text style={local.dateLabel}>{label}</Text><Text style={local.dateValue}>{date(value)}</Text></View></View>;
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
      <View style={local.heading}><View style={local.headingIcon}><Icon name="assignment" size={26} /></View><View style={local.headingCopy}><Text style={local.eyebrow}>Thẩm định & Đánh giá</Text><Text role="heading" aria-level={1} style={[local.title, narrow && local.mobileTitle]}>Danh sách thẩm định</Text><Text style={s.muted}>Theo dõi, quản lý và đánh giá các dự án của bạn.</Text></View></View>
      <View style={[local.actions, narrow && local.mobileActions]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tải lại danh sách thẩm định" onPress={() => setAttempt(v => v + 1)} style={local.refresh}><Icon name="refresh" /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(assessor)/assessor-availability' as Href)} style={local.button}><Icon name="event" size={18} /><Text style={s.link}>Lịch làm việc</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(v => !v)} style={[local.button, local.primaryButton]}><SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }} size={19} tintColor="white" /><Text style={local.primaryText}>Bộ lọc{status !== undefined ? ' • 1' : ''}</Text></Pressable>
      </View>
    </View>
    {showFilters && <View style={local.filterPanel}><Text style={local.filterLabel}>Trạng thái thẩm định</Text><View style={local.filters}>{filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }} onPress={() => { setStatus(filter.value); setPage(1); }} style={[local.filter, status === filter.value && local.selected]}><Text style={[s.muted, status === filter.value && local.primaryText]}>{filter.label}</Text></Pressable>)}</View></View>}
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data ? <AssessorState loading /> : <>
      {!data.assignments.length ? <AssessorState empty={status === undefined ? 'Chưa có công việc thẩm định' : 'Không có công việc ở trạng thái này'} /> : <View style={local.list}>{data.assignments.map(row => {
        const project = projects[row.id];
        const title = project?.title || `Phiên thẩm định #${row.id.slice(0, 8).toUpperCase()}`;
        return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Xem thẩm định ${title}`} onPress={() => router.push(`/(assessor)/assessor-assessments/${row.id}` as Href)} style={({ pressed, hovered }) => [local.card, desktop && local.desktopCard, hovered && local.hovered, pressed && { opacity: 0.75 }]}>
          <View style={[local.projectSection, desktop && local.desktopProject]}><ProjectImage key={`${row.id}:${project?.imageUrl}`} uri={project?.imageUrl} /><View style={local.projectCopy}><Text numberOfLines={desktop ? 2 : 3} style={local.projectTitle}>{title}</Text><View style={local.field}><SymbolView name={{ ios: 'building.2', android: 'business', web: 'business' }} size={16} tintColor={colors.textSecondary} /><Text style={local.fieldText}>{project?.projectField || 'Chưa cập nhật lĩnh vực'}</Text></View></View>{!desktop && <View style={local.mobileStatus}><AssignmentStatus status={row.status} /></View>}</View>
          <View style={[local.dates, desktop && local.desktopDates]}><DateInfo label="Lịch thẩm định" value={row.scheduledStartAt} icon="event" /><DateInfo label="Hạn báo cáo" value={row.reportDueAt} icon="schedule" /><DateInfo label="Ngày phân công" value={row.assignedAt} icon="group" /></View>
          <View style={[local.rowEnd, desktop && local.desktopEnd]}>{desktop && <AssignmentStatus status={row.status} />}<View style={local.details}><Text style={local.detailText}>Xem chi tiết →</Text></View></View>
        </Pressable>;
      })}</View>}
      <View style={[local.footer, narrow && local.mobileFooter]}><Text style={local.summary}>Hiển thị {data.totalItems ? (data.page - 1) * data.pageSize + 1 : 0} – {Math.min((data.page - 1) * data.pageSize + data.assignments.length, data.totalItems)} trên {data.totalItems} nhiệm vụ</Text><View style={local.pagination}><Pressable accessibilityRole="button" accessibilityLabel="Trang trước" disabled={page <= 1} onPress={() => setPage(v => v - 1)} style={[local.pageButton, page <= 1 && local.disabled]}><Icon name="chevron_left" size={18} /></Pressable>{pages.map((p, index) => <View key={p} style={local.pageGroup}>{index > 0 && p - pages[index - 1] > 1 && <Text style={local.ellipsis}>…</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`Trang ${p}`} accessibilityState={{ selected: page === p }} onPress={() => setPage(p)} style={[local.pageButton, page === p && local.selected]}><Text style={[local.pageText, page === p && local.primaryText]}>{p}</Text></Pressable></View>)}<Pressable accessibilityRole="button" accessibilityLabel="Trang sau" disabled={page >= totalPages} onPress={() => setPage(v => v + 1)} style={[local.pageButton, page >= totalPages && local.disabled]}><Icon name="chevron_right" size={18} /></Pressable></View></View>
    </>}
  </ScrollView></View>;
}
const local = StyleSheet.create({
  page: { backgroundColor: '#F4F7FF' }, content: { paddingTop: 32, gap: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }, mobileHeader: { alignItems: 'stretch', gap: 22 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 250 }, headingIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, headingCopy: { flex: 1, gap: 4 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700' }, title: { fontSize: 27, lineHeight: 35, fontWeight: '800', color: '#0C173D', letterSpacing: -0.6 }, mobileTitle: { fontSize: 23, lineHeight: 30 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' }, mobileActions: { width: '100%', justifyContent: 'flex-end', gap: 8 }, button: { minHeight: 44, paddingHorizontal: 15, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 10px rgba(30, 68, 130, 0.04)' }, refresh: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, primaryButton: { backgroundColor: '#075CF5' }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  filterPanel: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, gap: 12 }, filterLabel: { color: colors.navy, fontSize: 13, fontWeight: '600' }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filter: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background }, selected: { backgroundColor: '#075CF5' },
  imageFill: { width: '100%', height: '100%' }, list: { gap: 12 }, card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 20, borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0px 4px 18px rgba(32, 62, 120, 0.035)' }, desktopCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 18, minHeight: 100 }, hovered: { borderColor: '#BFD5FF', backgroundColor: '#FCFDFF' }, projectSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }, desktopProject: { flex: 1.3, minWidth: 0, alignItems: 'center', flexWrap: 'nowrap' }, image: { width: 58, height: 58, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center' }, projectCopy: { flex: 1, minWidth: 100, gap: 7 }, projectTitle: { color: '#0C173D', fontSize: 15, lineHeight: 22, fontWeight: '800' }, field: { flexDirection: 'row', alignItems: 'center', gap: 6 }, fieldText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, mobileStatus: { width: '100%', alignItems: 'flex-end' },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderTopWidth: 1, borderTopColor: '#F0F3FA', paddingTop: 16 }, desktopDates: { flex: 1.8, flexWrap: 'nowrap', borderTopWidth: 0, paddingTop: 0, gap: 12 }, dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, minWidth: 130 }, dateCopy: { gap: 5 }, dateLabel: { fontSize: 11, color: colors.textSecondary }, dateValue: { fontSize: 12, lineHeight: 18, color: '#172744', fontVariant: ['tabular-nums'] },
  rowEnd: { alignItems: 'flex-end' }, desktopEnd: { flexDirection: 'row', alignItems: 'center', gap: 12 }, details: { backgroundColor: '#F0F6FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, detailText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, mobileFooter: { justifyContent: 'center' }, summary: { fontSize: 12, color: colors.navy }, pagination: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }, pageGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 }, pageButton: { width: 36, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, pageText: { fontSize: 13, fontWeight: '600', color: colors.navy }, ellipsis: { color: colors.textSecondary, paddingHorizontal: 3 }, disabled: { opacity: 0.35 },
});
