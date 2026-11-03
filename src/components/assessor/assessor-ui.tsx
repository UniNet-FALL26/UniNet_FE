import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
export const assignmentStatusLabels = ['Đang thẩm định', 'Hoàn thành', 'Quá hạn', 'Đã hủy'];
export const assessorDate = (value: string | null | undefined) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có lịch';
export function AssignmentStatus({ status }: { status: number }) {
  const palette = status === 1 ? { backgroundColor: '#EAF8F0', color: '#21845A' } : status === 2 ? { backgroundColor: '#FFF0F0', color: '#BE3542' } : status === 3 ? { backgroundColor: '#F0F3F8', color: '#68788F' } : { backgroundColor: colors.primaryLight, color: colors.primary };
  return <View style={{ backgroundColor: palette.backgroundColor, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' }}><Text style={{ fontSize: 12, color: palette.color, fontWeight: '600' }}>{assignmentStatusLabels[status] || 'Chưa xác định'}</Text></View>;
}
export function AssessorState({ loading, error, retry, empty }: { loading?: boolean; error?: string; retry?: () => void; empty?: string }) {
  return <View style={assessorStyles.state}>{loading ? <><ActivityIndicator color={colors.primary} /><Text style={assessorStyles.muted}>Đang tải dữ liệu…</Text></> : error ? <><Text accessibilityRole="alert" style={assessorStyles.error}>{error}</Text>{retry && <Pressable accessibilityRole="button" onPress={retry} style={assessorStyles.secondaryButton}><Text style={assessorStyles.link}>Thử lại</Text></Pressable>}</> : <><Text style={assessorStyles.sectionTitle}>{empty || 'Chưa có công việc thẩm định'}</Text><Text style={assessorStyles.muted}>Thông tin sẽ xuất hiện tại đây khi được cập nhật.</Text></>}</View>;
}
export const assessorStyles = StyleSheet.create({
  detailHero: { backgroundColor: colors.navy, borderRadius: 24, padding: 24, gap: 24 },
  detailEyebrow: { color: '#B9D5FA', fontSize: 11, lineHeight: 18, letterSpacing: 1.5, fontWeight: '700' },
  detailTitle: { color: colors.surface, fontSize: 30, lineHeight: 40, fontWeight: '800' },
  detailSubtitle: { color: '#D8E7FB', fontSize: 14, lineHeight: 22 },
  detailHeroMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#355071' },
  detailSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18 },
  detailStep: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1 },
  detailStepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  detailStepDone: { backgroundColor: colors.primary }, detailStepDoneText: { color: colors.surface },
  detailCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 22, gap: 18 },
  detailMeetingCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: 20, padding: 22, gap: 16 },
  detailReportCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#B9D5FA', borderTopWidth: 4, borderTopColor: colors.primary, borderRadius: 20, padding: 22, gap: 18 },
  detailSectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailSectionNumber: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  detailReportIntro: { padding: 20, borderRadius: 16, backgroundColor: colors.primaryLight, gap: 12 },
  detailProgressTrack: { height: 6, borderRadius: 3, backgroundColor: '#D4E4FA', overflow: 'hidden' },
  detailProgressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  detailCriterion: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, gap: 12 },

  page: { flex: 1, minHeight: 0, backgroundColor: colors.background }, content: { flexGrow: 1, width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 24, gap: 20, paddingBottom: 40 }, mobileContent: { paddingHorizontal: 16, paddingVertical: 18, gap: 16 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, headingCopy: { flex: 1, minWidth: 220, gap: 7 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 }, title: { fontSize: 27, lineHeight: 35, fontWeight: '800', color: colors.navy }, sectionTitle: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '700' }, muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, body: { color: colors.textPrimary, fontSize: 14, lineHeight: 23 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, secondaryButton: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, link: { color: colors.primary, fontSize: 13, fontWeight: '600' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, gap: 14 },
  state: { padding: 28, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 14 }, error: { color: colors.error, fontSize: 13, lineHeight: 22 }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, padding: 12, fontSize: 14, color: colors.textPrimary }, divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
});
