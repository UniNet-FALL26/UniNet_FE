import { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { assessorService, type AssignmentPage } from '@/services/assessor.service';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/constants/colors';
import { AssignmentStatus, AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { AssessorPageHeading } from '@/components/assessor/AssessorPage';

const filters = [{ label: 'Tất cả', value: undefined }, { label: 'Đang thẩm định', value: 0 }, { label: 'Quá hạn', value: 2 }, { label: 'Hoàn thành', value: 1 }, { label: 'Đã hủy', value: 3 }];
export default function AssessorAssignmentsScreen() {
  const { account } = useAuthStore(); const narrow = useWindowDimensions().width < 700;
  const [status, setStatus] = useState<number | undefined>(), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: AssignmentPage } | null>(null), [titles, setTitles] = useState<Record<string, { title: string; field: string }>>({}), [error, setError] = useState('');
  const key = `${account?.id}:${status}:${page}:${attempt}`; const data = loaded?.key === key ? loaded.result : null;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError(''); setTitles({});
    assessorService.list(page, status, controller.signal).then(result => {
      if (controller.signal.aborted) return; setLoaded({ key, result });
      // Current list API contains assignment IDs; enrich only the current page through owned detail APIs.
      void Promise.allSettled(result.assignments.map(async row => {
        const detail = await assessorService.detail(row.id, controller.signal);
        if (!controller.signal.aborted) setTitles(previous => ({ ...previous, [row.id]: { title: detail.project.title, field: detail.project.projectField } }));
      }));
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách thẩm định.'); });
    return () => controller.abort();
  }, [key, page, status]));
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <AssessorPageHeading title="Danh sách thẩm định" description="Theo dõi lịch hẹn và các dự án được phân công cho bạn." action={<View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel="Tải lại danh sách thẩm định" onPress={() => setAttempt(v => v + 1)} style={local.refreshButton}><SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={19} tintColor={colors.primary} /></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/(assessor)/assessor-availability' as Href)} style={local.calendarButton}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={19} tintColor={colors.primary} /><Text style={s.link}>Lịch làm việc</Text></Pressable></View>} />
    <View style={local.guide}><View style={local.guideIcon}><SymbolView name={{ ios: 'doc.text.magnifyingglass', android: 'assignment', web: 'assignment' }} size={24} tintColor={colors.primary} /></View><View style={local.guideCopy}><Text style={local.guideTitle}>Mỗi đánh giá, một bước tiến cho dự án</Text><Text style={s.muted}>Mở hồ sơ để xem thông tin dự án, lịch hẹn và báo cáo thẩm định.</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={local.filterScroll} contentContainerStyle={local.filters}>{filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === filter.value }} onPress={() => { setStatus(filter.value); setPage(1); }} style={[local.filter, status === filter.value && local.selected]}><Text style={[s.muted, status === filter.value && local.selectedText]}>{filter.label}</Text></Pressable>)}</ScrollView>
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data ? <AssessorState loading /> : <>
      <View style={s.heading}><Text style={local.resultTitle}>Công việc của bạn <Text style={local.count}>({data.totalItems})</Text></Text><Text style={s.muted}>Trang {data.page}/{Math.max(data.totalPages, 1)}</Text></View>
      {!data.assignments.length ? <AssessorState empty={status === undefined ? 'Chưa có công việc thẩm định' : 'Không có công việc ở trạng thái này'} /> : <View style={local.grid}>{data.assignments.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Xem thẩm định ${titles[row.id]?.title || row.id}`} onPress={() => router.push(`/(assessor)/assessor-assessments/${row.id}` as Href)} style={({ pressed, hovered }) => [s.card, local.assignmentCard, !narrow && local.wideCard, hovered && local.hoveredCard, pressed && { opacity: 0.75 }]}>
        <View style={s.heading}><AssignmentStatus status={row.status} /><Text style={local.reference}>#{row.id.slice(0, 8).toUpperCase()}</Text></View>
        <View style={local.projectHeading}><View style={local.projectIcon}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={22} tintColor={colors.primary} /></View><View style={local.projectCopy}><Text style={s.sectionTitle}>{titles[row.id]?.title || `Phiên thẩm định #${row.id.slice(0, 8).toUpperCase()}`}</Text>{!!titles[row.id]?.field && <Text style={s.muted}>{titles[row.id].field}</Text>}</View></View>
        <View style={local.schedule}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={20} tintColor={colors.primary} /><View style={{ flex: 1 }}><Text style={s.label}>Lịch thẩm định</Text><Text style={s.muted}>{assessorDate(row.scheduledStartAt)}</Text></View></View>
        {row.reportDueAt && <Text style={s.muted}>Hạn báo cáo: {assessorDate(row.reportDueAt)}</Text>}<View style={[s.divider, s.heading]}><Text style={s.muted}>Phân công {assessorDate(row.assignedAt)}</Text><Text style={s.link}>Xem chi tiết →</Text></View>
      </Pressable>)}</View>}
      <View style={[s.actions, { justifyContent: 'flex-end' }]}><Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage(v => v - 1)} style={[s.secondaryButton, page <= 1 && { opacity: 0.4 }]}><Text style={s.link}>Trang trước</Text></Pressable><Pressable accessibilityRole="button" disabled={page >= data.totalPages} onPress={() => setPage(v => v + 1)} style={[s.secondaryButton, page >= data.totalPages && { opacity: 0.4 }]}><Text style={s.link}>Trang sau</Text></Pressable></View>
    </>}
  </ScrollView></View>;
}
const local = StyleSheet.create({
  filterScroll: { flexGrow: 0, flexShrink: 0 }, filters: { flexDirection: 'row', alignItems: 'center', gap: 8 }, filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, selectedText: { color: colors.surface, fontWeight: '600' },
  refreshButton: { width: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, calendarButton: { minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  guide: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 14, backgroundColor: colors.primaryLight, gap: 16 }, guideIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12 }, guideCopy: { flex: 1, gap: 5 }, guideTitle: { fontSize: 16, lineHeight: 23, fontWeight: '700', color: colors.navy }, resultTitle: { fontSize: 17, fontWeight: '700', color: colors.navy }, count: { color: colors.textSecondary, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, assignmentCard: { width: '100%', minWidth: 0 }, wideCard: { width: '48.8%', flexGrow: 1 }, hoveredCard: { borderColor: colors.primary }, reference: { fontSize: 11, color: colors.textSecondary, fontVariant: ['tabular-nums'] }, schedule: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.background, borderRadius: 10 }, projectHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, projectIcon: { width: 44, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }, projectCopy: { flex: 1, minWidth: 0, gap: 5 },
});
