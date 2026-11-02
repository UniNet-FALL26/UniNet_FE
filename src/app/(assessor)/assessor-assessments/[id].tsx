import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { assessorService, type AssignmentDetail, type AssessorMeeting } from '@/services/assessor.service';
import { AssignmentStatus, AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import { AssessmentForm, emptyAssessment, assessmentError } from '@/components/assessor/AssessmentForm';
import { assessorReportDrafts, emptyAssessorDraft, type AssessorReportDraft } from '@/store/assessor-report-drafts';

export default function AssessorAssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { account } = useAuthStore(); const narrow = useWindowDimensions().width < 700;
  const key = `${account?.id}:${id}`;
  const [room, setRoom] = useState<{ key: string; data: AssessorMeeting } | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; data: AssignmentDetail } | null>(null), [error, setError] = useState(''), [actionError, setActionError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(() => ({ key, fields: assessorReportDrafts.get(key) })), [confirmReport, setConfirmReport] = useState(false);
  const fields = draft.key === key ? draft.fields : assessorReportDrafts.get(key); const { summary, findings, recommendations } = fields;
  const changeDraft = (changes: Partial<AssessorReportDraft>) => { const next = { ...fields, ...changes }; assessorReportDrafts.set(key, next); setDraft({ key, fields: next }); setConfirmReport(false); };
  const running = useRef(false); const identity = useRef(''); identity.current = key; const data = loaded?.key === key ? loaded.data : null;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError('');
    assessorService.detail(id, controller.signal).then(value => { if (!controller.signal.aborted) setLoaded({ key, data: value }); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được phiên thẩm định.'); });
    assessorService.meeting(id, controller.signal).then(value => { if (!controller.signal.aborted) setRoom({ key, data: value }); }).catch(() => { if (!controller.signal.aborted) setRoom(null); });
    return () => controller.abort();
  }, [key, id, attempt]));
  useEffect(() => { setConfirmReport(false); setActionError(''); }, [key]);
  const mutate = async (operation: () => Promise<unknown>) => {
    if (running.current) return; running.current = true; setBusy(true); setActionError(''); const actor = key;
    try { await operation(); if (identity.current === actor) { setConfirmReport(false); setAttempt(v => v + 1); } }
    catch (e) { if (identity.current === actor) { setActionError(e instanceof Error ? e.message : 'Chưa thực hiện được thao tác.'); if (e instanceof ApiError && e.status === 409) setAttempt(v => v + 1); } }
    finally { running.current = false; if (identity.current === actor) setBusy(false); }
  };
  const join = () => mutate(async () => {
    const meeting = await assessorService.joinMeeting(id); if (identity.current !== key) return;
    const url = new URL(meeting.joinUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Đường dẫn phòng họp không hợp lệ.');
    await Linking.openURL(url.href);
  });
  const assignment = data?.assignment; const active = assignment?.status === 0 || assignment?.status === 2;
  const canReport = active && !!assignment?.meetingStartAt && !!assignment?.meetingEndAt && !data?.report;
  const rubric = data?.assessmentRubric;
  const assessment = rubric ? fields.assessment?.rubricVersion === rubric.version ? fields.assessment : emptyAssessment(rubric) : null;
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.secondaryButton, { alignSelf: 'flex-start' }]}><Text style={s.link}>← Danh sách thẩm định</Text></Pressable>
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data || !assignment ? <AssessorState loading /> : <>
      <View style={s.heading}><View style={s.headingCopy}><Text style={s.eyebrow}>HỒ SƠ THẨM ĐỊNH</Text><Text role="heading" aria-level={1} style={s.title}>{data.project.title}</Text><Text style={s.muted}>{data.project.projectField} · #{assignment.id.slice(0, 8).toUpperCase()}</Text></View><AssignmentStatus status={assignment.status} /></View>
      {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
      <View style={s.card}><Text style={s.sectionTitle}>Thông tin dự án</Text><Text style={s.body}>{data.project.description}</Text></View>
      <View style={s.card}><Text style={s.sectionTitle}>Minh chứng của hồ sơ</Text><Text style={s.muted}>{data.evidenceModeration?.summary || 'Chưa có kết quả kiểm tra minh chứng tự động.'}</Text>{data.evidenceModeration?.source?.tasks.flatMap(task => task.reports.map(report => <View key={report.taskReportId} style={[s.divider, { gap: 10 }]}><Text style={s.body}>{report.content}</Text>{report.evidence.map(file => <Pressable key={file.taskEvidenceId} accessibilityRole="link" onPress={() => { try { const url = new URL(file.fileUrl); if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) void Linking.openURL(url.href); } catch { setActionError('Đường dẫn minh chứng không hợp lệ.'); } }}><Text style={s.link}>{file.fileName || 'Mở minh chứng'}</Text></Pressable>)}</View>))}</View>
      <View style={s.card}><Text style={s.sectionTitle}>Lịch và phòng thẩm định</Text><Text style={s.muted}>{room?.key === key ? room.data.meetingEndAt ? 'Phòng họp đã kết thúc' : room.data.joinUrl ? 'Phòng họp đã sẵn sàng' : 'Chưa có đường dẫn tham gia' : 'Tạo / lấy phòng để chuẩn bị buổi thẩm định.'}</Text><Text style={s.body}>Bắt đầu: {assessorDate(assignment.scheduledStartAt)}</Text><Text style={s.muted}>Kết thúc dự kiến: {assessorDate(assignment.scheduledEndAt)}</Text>{assignment.meetingStartAt && <Text style={s.muted}>Đã bắt đầu: {assessorDate(assignment.meetingStartAt)}</Text>}{assignment.meetingEndAt && <Text style={s.muted}>Đã kết thúc: {assessorDate(assignment.meetingEndAt)}</Text>}
        {active && !assignment.meetingEndAt && <View style={s.actions}><Button title="Tạo / lấy phòng họp" variant="outline" disabled={busy} onPress={() => void mutate(() => assessorService.createMeeting(id))} /><Button title="Tham gia phòng họp" disabled={busy} onPress={() => void join()} />{!assignment.meetingStartAt && <Button title="Bắt đầu buổi thẩm định" disabled={busy} onPress={() => void mutate(() => assessorService.meetingAction(id, 'start'))} />}{assignment.meetingStartAt && !assignment.meetingEndAt && <><Button title="Kết thúc buổi thẩm định" variant="outline" disabled={busy} onPress={() => void mutate(() => assessorService.meetingAction(id, 'end'))} /></>}</View>}
      </View>
      <View style={s.card}><Text style={s.sectionTitle}>Báo cáo thẩm định</Text>{data.report ? <>{[['Tóm tắt', data.report.summary], ['Kết quả kiểm tra', data.report.findings], ['Khuyến nghị', data.report.recommendations]].map(([label, value]) => value ? <View key={label} style={{ gap: 6 }}><Text style={s.label}>{label}</Text><Text style={s.body}>{value}</Text></View> : null)}<Text style={s.label}>Kết quả: {['Chờ đánh giá', 'Đạt yêu cầu', 'Không đạt', 'Đã hủy', 'Chưa đủ minh chứng'][data.report.outcome ?? 0]}</Text>{data.report.assessment && <><Text style={s.body}>Tổng điểm: {data.report.assessment.totalScore ?? 'Chưa đủ minh chứng'}</Text><AssessmentForm rubric={data.report.assessment.rubric} value={{ ...data.report.assessment, rubricVersion: data.report.assessment.rubric.version }} disabled /></>}<Text style={s.muted}>Đã gửi {assessorDate(data.report.submittedAt)} · Báo cáo chính thức không thể sửa hoặc xóa.</Text></> : canReport ? <>
        <Text style={s.muted}>Hoàn thiện đánh giá trước khi gửi báo cáo chính thức.</Text>
        <Text style={s.label}>Tóm tắt</Text><TextInput accessibilityLabel="Tóm tắt thẩm định" multiline maxLength={10000} value={summary} onChangeText={v => { changeDraft({ summary: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        <Text style={s.label}>Kết quả kiểm tra</Text><TextInput accessibilityLabel="Kết quả kiểm tra" multiline maxLength={30000} value={findings} onChangeText={v => { changeDraft({ findings: v }); }} editable={!busy} style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} />
        <Text style={s.label}>Khuyến nghị</Text><TextInput accessibilityLabel="Khuyến nghị" multiline maxLength={10000} value={recommendations} onChangeText={v => { changeDraft({ recommendations: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        {rubric && assessment ? <AssessmentForm rubric={rubric} value={assessment} onChange={assessment => changeDraft({ assessment })} disabled={busy} /> : <Text style={s.error}>Hồ sơ chưa được gắn rubric. Chưa thể gửi báo cáo.</Text>}
        {confirmReport && <Text style={s.muted}>Xác nhận gửi báo cáo chính thức? Kết quả được hệ thống tính từ điểm và các điều kiện. Báo cáo đã gửi không thể chỉnh sửa.</Text>}
        <Button title={busy ? 'Đang gửi…' : confirmReport ? 'Xác nhận gửi báo cáo' : 'Gửi báo cáo'} disabled={busy || !rubric || !assessment || !summary.trim() || !findings.trim() || !recommendations.trim()} onPress={() => { if (!rubric || !assessment) return; const invalid = assessmentError(rubric, assessment); if (invalid) { setActionError(invalid); return; } if (!confirmReport) setConfirmReport(true); else void mutate(async () => { try { await assessorService.report(id, { summary: summary.trim(), findings: findings.trim(), recommendations: recommendations.trim(), assessment }); } catch (cause) { try { await assessorService.getReport(id); } catch { throw cause; } } assessorReportDrafts.remove(key); if (identity.current === key) setDraft({ key, fields: emptyAssessorDraft() }); }); }} />
      </> : <Text style={s.muted}>{active ? 'Bạn có thể gửi báo cáo sau khi kết thúc buổi thẩm định.' : 'Chưa có báo cáo được gửi cho phiên này.'}</Text>}</View>
    </>}
  </ScrollView></View>;
}
