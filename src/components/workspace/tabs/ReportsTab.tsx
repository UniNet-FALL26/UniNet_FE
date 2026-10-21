import { EvidenceList } from '@/components/workspace/reports/EvidenceList';
import { ReportForm } from '@/components/workspace/reports/ReportForm';
import { taskReportService } from '@/services/task-report.service';
import { TASK_REPORT_STATUS_LABEL, type TaskReport, type TaskReportListResponse } from '@/types/task-report';
import type { ProjectTask } from '@/types/workspace';
import { parseReportContent } from '@/utils/report-content';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Filter = 'all' | 'mine' | 'in-time' | 'overdue' | 'revision';
type Props = { projectId: string; tasks: ProjectTask[]; userId: string; accessToken: string; isProjectCreator: boolean };
type TaskData = { task: ProjectTask; data: TaskReportListResponse | null; error?: string };
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả task' }, { key: 'mine', label: 'Task của tôi' },
  { key: 'in-time', label: 'Còn hạn' }, { key: 'overdue', label: 'Quá hạn' },
  { key: 'revision', label: 'Báo cáo cần sửa' },
];
const isOverdue = (task: ProjectTask) => {
  const deadline = new Date(task.deadline).getTime();
  return task.status === 4 || (!Number.isNaN(deadline) && deadline <= Date.now());
};
const groupReportsByVersion = (reports: TaskReport[]) => {
  const groups = new Map<string, TaskReport[]>();
  for (const report of reports) {
    const groupId = report.reportGroupId || report.id;
    const group = groups.get(groupId) ?? [];
    group.push(report);
    groups.set(groupId, group);
  }
  return [...groups.entries()].map(([groupId, versions]) => ({
    groupId,
    versions: [...versions].sort((a, b) => {
      const versionDiff = (a.version ?? 1) - (b.version ?? 1);
      if (versionDiff !== 0) return versionDiff;
      return new Date(a.submittedAt ?? a.updatedAt ?? 0).getTime() - new Date(b.submittedAt ?? b.updatedAt ?? 0).getTime();
    }),
  }));
};
const latestReports = (reports: TaskReport[]) => groupReportsByVersion(reports).map(group => group.versions[group.versions.length - 1]);
const hasRevision = (reports: TaskReport[], userId: string) => latestReports(reports).some(r => r.submittedById === userId && r.status === 2);

export default function ReportsTab({ projectId, tasks, userId, accessToken, isProjectCreator }: Props) {
  const [items, setItems] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<TaskReport | null | 'new'>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewError, setReviewError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    const result = await Promise.all(tasks.map(async (task): Promise<TaskData> => {
      try {
        // Request a larger first page so the filter can inspect reports across the task.
        const data = await taskReportService.list(projectId, task.id, accessToken, 1, 100);
        return { task, data };
      } catch (e) {
        return { task, data: null, error: e instanceof Error ? e.message : 'Không thể tải báo cáo.' };
      }
    }));
    setItems(result);
    if (result.length && result.every(x => x.error)) setError('Không thể tải báo cáo của các task. Vui lòng thử lại.');
    setLoading(false); setRefreshing(false);
  }, [projectId, tasks, accessToken]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter(({ task, data }) => {
    const reports = data?.reports ?? [];
    const mine = (task.assignedUsers ?? []).some(a => a.userId === userId);
    const overdue = isOverdue(task);
    const revision = hasRevision(reports, userId);
    return activeFilters.every(filter => {
      switch (filter) {
        case 'mine': return mine;
        case 'in-time': return !overdue;
        case 'overdue': return overdue;
        case 'revision': return revision;
        default: return true;
      }
    });
  }), [items, activeFilters, userId]);
  const selected = items.find(x => x.task.id === selectedId);
  const selectedTask = selected?.task;
  const reports = selected?.data?.reports ?? [];
  // Hiển thị các báo cáo đã nộp; chỉ giữ bản nháp nếu do chính tài khoản hiện tại tạo.
  const reportGroups = useMemo(() => groupReportsByVersion(
    reports.filter(report => report.status !== 3 || report.submittedById === userId),
  ), [reports, userId]);

  useEffect(() => {
    if (selectedId && !visible.some(x => x.task.id === selectedId)) { setSelectedId(null); setEditing(null); }
  }, [selectedId, visible]);

  async function submit(report: TaskReport) {
    if (!selectedTask) return;
    setSubmittingId(report.id); setError('');
    try {
      await taskReportService.submitDraft(projectId, selectedTask.id, report.id, accessToken);
      setEditing(null); await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể nộp báo cáo.'); }
    finally { setSubmittingId(null); }
  }

  async function review(report: TaskReport, decision: 0 | 1) {
    if (!selectedTask || !isProjectCreator) return;
    const feedback = reviewFeedback.trim();
    if (decision === 1 && !feedback) {
      setReviewError('Vui lòng nhập lý do yêu cầu chỉnh sửa.');
      return;
    }
    setReviewingId(report.id); setReviewError(''); setError('');
    try {
      await taskReportService.review(projectId, selectedTask.id, report.id, accessToken, {
        decision,
        feedback: feedback || null,
      });
      setReviewingId(null); setReviewTargetId(null); setReviewFeedback('');
      await load(true);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Không thể gửi đánh giá báo cáo.');
    } finally { setReviewingId(null); }
  }

  return <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <View><Text style={styles.title}>Báo cáo & minh chứng</Text><Text style={styles.muted}>Lọc task theo phân công, hạn hoàn thành và trạng thái báo cáo của bạn.</Text></View>
    <View style={styles.filters}>{filters.map(f => { const active = f.key === 'all' ? activeFilters.length === 0 : activeFilters.includes(f.key); return <Pressable key={f.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setActiveFilters(current => f.key === 'all' ? [] : current.includes(f.key) ? current.filter(x => x !== f.key) : [...current.filter(x => x !== 'all'), f.key])} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text></Pressable>; })}</View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : visible.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Không có task phù hợp</Text><Text style={styles.muted}>Thử chọn bộ lọc khác hoặc tải lại dữ liệu.</Text></View> : <View style={styles.taskList}>
      <View style={styles.listHeader}><Text style={styles.sectionTitle}>Chọn task</Text><Text style={styles.muted}>{visible.length} task</Text></View>
      {visible.map(({ task, data, error: taskError }) => <Pressable key={task.id} accessibilityRole="button" accessibilityState={{ selected: selectedId === task.id }} onPress={() => { setSelectedId(task.id); setEditing(null); setError(''); }} style={[styles.taskCard, selectedId === task.id && styles.taskActive]}>
        <View style={styles.taskHead}><Text style={styles.taskName}>{task.title?.trim() || 'Task không tên'}</Text><Text style={[styles.status, isOverdue(task) ? styles.overdue : styles.inTime]}>{isOverdue(task) ? 'Quá hạn' : 'Còn hạn'}</Text></View>
        <Text style={styles.meta}>Hạn: {task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : 'Chưa đặt hạn'}</Text>
        {hasRevision(data?.reports ?? [], userId) && <Text style={styles.revisionHint}>Báo cáo của bạn đang được yêu cầu chỉnh sửa</Text>}
        {taskError ? <Text style={styles.errorSmall}>Không tải được báo cáo của task này.</Text> : null}
      </Pressable>)}
    </View>}
    {selectedTask && <View style={styles.reportSection}>
      <View style={styles.reportHeader}><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Báo cáo của task</Text><Text style={styles.muted}>{selectedTask.title || 'Task không tên'}</Text></View>{editing === null && <Pressable onPress={() => setEditing('new')} style={styles.primary}><Text style={styles.primaryText}>+ Tạo báo cáo</Text></Pressable>}</View>
      {editing !== null && <ReportForm key={editing === 'new' ? 'new-report' : `${editing.id}-${editing.status}`} projectId={projectId} taskId={selectedTask.id} accessToken={accessToken} initialReport={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(true); }} />}
      {selected?.error ? <View style={styles.empty}><Text style={styles.muted}>Không thể tải báo cáo của task này.</Text></View> : reportGroups.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có báo cáo đã nộp</Text><Text style={styles.muted}>Bản nháp của thành viên khác được ẩn. Bạn có thể tạo báo cáo của riêng mình.</Text></View> : reportGroups.map(group => {
        const latest = group.versions[group.versions.length - 1];
        const selectedVersionId = selectedVersionIds[group.groupId];
        const report = group.versions.find(item => item.id === selectedVersionId) ?? latest;
        const isLatestVersion = report.id === latest.id;
        const parsedContent = parseReportContent(report.content);
        return <View key={group.groupId} style={styles.reportCard}>
        <View style={styles.reportHeader}><View style={{ flex: 1, gap: 3 }}><Text style={styles.reportTitle}>{parsedContent.title || 'Chưa đặt tên báo cáo'}</Text><Text style={styles.meta}>Đang xem phiên bản v{report.version}{!isLatestVersion ? ' · phiên bản cũ' : ' · mới nhất'}</Text></View><Text style={[styles.status, report.status === 1 ? styles.approved : report.status === 2 ? styles.revision : null]}>{TASK_REPORT_STATUS_LABEL[report.status] ?? 'Không xác định'}</Text></View>
        {group.versions.length > 1 && <View style={styles.versionPicker}><Text style={styles.versionLabel}>Lịch sử phiên bản</Text><View style={styles.versionButtons}>{group.versions.map(version => <Pressable key={version.id} accessibilityRole="button" accessibilityState={{ selected: report.id === version.id }} onPress={() => setSelectedVersionIds(current => ({ ...current, [group.groupId]: version.id }))} style={[styles.versionButton, report.id === version.id && styles.versionButtonActive]}><Text style={[styles.versionButtonText, report.id === version.id && styles.versionButtonTextActive]}>v{version.version}{version.id === latest.id ? ' · mới nhất' : ''}</Text></Pressable>)}</View></View>}
        <Text style={styles.content}>{parsedContent.body}</Text><Text style={styles.meta}>Người nộp: {report.submittedByFullName || 'Không rõ'} · Cập nhật: {report.updatedAt ? new Date(report.updatedAt).toLocaleString('vi-VN') : '—'}</Text>
        <EvidenceList items={report.evidence ?? []} />
        {!!report.reviews?.length && <View style={styles.review}><Text style={styles.reviewTitle}>Phản hồi gần nhất</Text><Text style={styles.content}>{report.reviews[report.reviews.length - 1].feedback || 'Không có phản hồi.'}</Text></View>}
        {isLatestVersion && report.submittedById === userId && (report.status === 2 || report.status === 3) && <View style={styles.actions}><Pressable onPress={() => setEditing(report)} style={styles.secondary}><Text style={styles.secondaryText}>{report.status === 2 ? 'Sửa theo phản hồi' : 'Chỉnh sửa'}</Text></Pressable>{report.status === 3 && <Pressable disabled={submittingId === report.id} onPress={() => void submit(report)} style={styles.primary}>{submittingId === report.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Nộp báo cáo</Text>}</Pressable>}</View>}
        {isLatestVersion && isProjectCreator && report.status === 0 && <View style={styles.reviewActions}>
          <Text style={styles.reviewTitle}>Đánh giá báo cáo (chủ dự án)</Text>
          <TextInput value={reviewTargetId === report.id ? reviewFeedback : ''} onChangeText={value => { setReviewTargetId(report.id); setReviewFeedback(value); setReviewError(''); }} onFocus={() => { setReviewTargetId(report.id); setReviewError(''); }} editable={!reviewingId || reviewingId === report.id} multiline maxLength={2000} placeholder="Nhập phản hồi (bắt buộc nếu yêu cầu chỉnh sửa)" style={styles.feedbackInput} textAlignVertical="top" />
          {reviewError ? <Text accessibilityRole="alert" style={styles.error}>{reviewError}</Text> : null}
          <View style={styles.actions}>
            <Pressable disabled={reviewingId === report.id} onPress={() => { setReviewTargetId(report.id); setReviewError(''); void review(report, 1); }} style={styles.secondary}><Text style={styles.secondaryText}>Yêu cầu chỉnh sửa</Text></Pressable>
            <Pressable disabled={reviewingId === report.id} onPress={() => { setReviewTargetId(report.id); void review(report, 0); }} style={styles.primary}>{reviewingId === report.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Duyệt báo cáo</Text>}</Pressable>
          </View>
        </View>}
      </View>; })}
    </View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 }, title: { color: '#172033', fontSize: 20, fontWeight: '700' }, muted: { color: '#687386', fontSize: 13, marginTop: 4 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFF' }, chipActive: { borderColor: '#2459A9', backgroundColor: '#EAF1FB' }, chipText: { color: '#475467', fontSize: 12, fontWeight: '600' }, chipTextActive: { color: '#184A90' }, error: { color: '#B42318', backgroundColor: '#FEF3F2', padding: 10, borderRadius: 8 }, errorSmall: { color: '#B42318', fontSize: 12 }, empty: { padding: 22, borderWidth: 1, borderColor: '#E1E6ED', borderRadius: 12, alignItems: 'center', gap: 6, backgroundColor: '#FFF' }, emptyTitle: { color: '#172033', fontWeight: '700' }, taskList: { gap: 10 }, listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: '#172033', fontSize: 17, fontWeight: '700' }, taskCard: { borderWidth: 1, borderColor: '#E1E6ED', borderRadius: 12, padding: 13, gap: 5, backgroundColor: '#FFF' }, taskActive: { borderColor: '#2459A9', backgroundColor: '#F5F8FF' }, taskHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, taskName: { flex: 1, color: '#172033', fontSize: 14, fontWeight: '700' }, status: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', color: '#475467', backgroundColor: '#F2F4F7' }, overdue: { color: '#B42318', backgroundColor: '#FEF3F2' }, inTime: { color: '#027A48', backgroundColor: '#ECFDF3' }, revisionHint: { color: '#B54708', fontSize: 12, fontWeight: '600' }, reportSection: { gap: 12, marginTop: 6 }, reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, primary: { backgroundColor: '#2459A9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FFF', fontWeight: '700' }, secondary: { borderWidth: 1, borderColor: '#B8C5D6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, secondaryText: { color: '#234B83', fontWeight: '600' }, reportCard: { borderWidth: 1, borderColor: '#E1E6ED', borderRadius: 14, padding: 14, gap: 10, backgroundColor: '#FFF' }, reportTitle: { color: '#172033', fontWeight: '700', fontSize: 16 }, approved: { color: '#027A48', backgroundColor: '#ECFDF3' }, revision: { color: '#B54708', backgroundColor: '#FFFAEB' }, content: { color: '#344054', lineHeight: 21 }, meta: { color: '#687386', fontSize: 12 }, review: { borderLeftWidth: 3, borderLeftColor: '#D0D5DD', paddingLeft: 10, gap: 4 }, reviewTitle: { color: '#475467', fontWeight: '600' }, versionPicker: { gap: 7, paddingVertical: 2 }, versionLabel: { color: '#475467', fontSize: 12, fontWeight: '600' }, versionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, versionButton: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF' }, versionButtonActive: { borderColor: '#2459A9', backgroundColor: '#EAF1FB' }, versionButtonText: { color: '#475467', fontSize: 12, fontWeight: '600' }, versionButtonTextActive: { color: '#184A90' }, reviewActions: { borderTopWidth: 1, borderTopColor: '#E1E6ED', paddingTop: 12, gap: 8 }, feedbackInput: { minHeight: 82, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, padding: 10, color: '#344054', backgroundColor: '#FFF' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
});
