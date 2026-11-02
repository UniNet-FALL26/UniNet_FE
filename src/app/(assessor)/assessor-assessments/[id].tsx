import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { assessorService, type AssignmentDetail } from '@/services/assessor.service';
import { AssignmentStatus, AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/constants/colors';
import { assessorReportDrafts, emptyAssessorDraft, type AssessorReportDraft } from '@/store/assessor-report-drafts';

export default function AssessorAssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { account } = useAuthStore(); const narrow = useWindowDimensions().width < 700;
  const key = `${account?.id}:${id}`;
  const [loaded, setLoaded] = useState<{ key: string; data: AssignmentDetail } | null>(null), [error, setError] = useState(''), [actionError, setActionError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(() => ({ key, fields: assessorReportDrafts.get(key) })), [confirmReport, setConfirmReport] = useState(false);
  const fields = draft.key === key ? draft.fields : assessorReportDrafts.get(key); const { summary, findings, recommendations, outcome } = fields;
  const changeDraft = (changes: Partial<AssessorReportDraft>) => { const next = { ...fields, ...changes }; assessorReportDrafts.set(key, next); setDraft({ key, fields: next }); setConfirmReport(false); };
  const running = useRef(false); const identity = useRef(''); identity.current = key; const data = loaded?.key === key ? loaded.data : null;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError('');
    assessorService.detail(id, controller.signal).then(value => { if (!controller.signal.aborted) setLoaded({ key, data: value }); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được phiên thẩm định.'); });
    return () => controller.abort();
  }, [key, id, attempt]));
  useEffect(() => { setConfirmReport(false); setActionError(''); }, [key]);
  const mutate = async (operation: () => Promise<unknown>) => {
    if (running.current) return; running.current = true; setBusy(true); setActionError(''); const actor = key;
    try { await operation(); if (identity.current === actor) { setConfirmReport(false); setAttempt(v => v + 1); } }
    catch (e) { if (identity.current === actor) setActionError(e instanceof Error ? e.message : 'Chưa thực hiện được thao tác.'); }
    finally { running.current = false; if (identity.current === actor) setBusy(false); }
  };
  const join = () => mutate(async () => {
    const meeting = await assessorService.joinMeeting(id); if (identity.current !== key) return;
    const url = new URL(meeting.joinUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Đường dẫn phòng họp không hợp lệ.');
    await Linking.openURL(url.href);
  });
  const assignment = data?.assignment; const active = assignment?.status === 0 || assignment?.status === 2;
  const canReport = active && !!assignment?.meetingEndAt && !data?.report;
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.secondaryButton, { alignSelf: 'flex-start' }]}><Text style={s.link}>← Danh sách thẩm định</Text></Pressable>
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data || !assignment ? <AssessorState loading /> : <>
      <View style={s.heading}><View style={s.headingCopy}><Text style={s.eyebrow}>HỒ SƠ THẨM ĐỊNH</Text><Text role="heading" aria-level={1} style={s.title}>{data.project.title}</Text><Text style={s.muted}>{data.project.projectField} · #{assignment.id.slice(0, 8).toUpperCase()}</Text></View><AssignmentStatus status={assignment.status} /></View>
      {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
      <View style={s.card}><Text style={s.sectionTitle}>Thông tin dự án</Text><Text style={s.body}>{data.project.description}</Text></View>
      <View style={s.card}><Text style={s.sectionTitle}>Lịch và phòng thẩm định</Text><Text style={s.body}>Bắt đầu: {assessorDate(assignment.scheduledStartAt)}</Text><Text style={s.muted}>Kết thúc dự kiến: {assessorDate(assignment.scheduledEndAt)}</Text>{assignment.meetingStartAt && <Text style={s.muted}>Đã bắt đầu: {assessorDate(assignment.meetingStartAt)}</Text>}{assignment.meetingEndAt && <Text style={s.muted}>Đã kết thúc: {assessorDate(assignment.meetingEndAt)}</Text>}
        {active && <View style={s.actions}>{!assignment.meetingStartAt && <Button title="Bắt đầu buổi thẩm định" disabled={busy} onPress={() => void mutate(() => assessorService.meetingAction(id, 'start'))} />}{assignment.meetingStartAt && !assignment.meetingEndAt && <><Button title="Tham gia phòng họp" disabled={busy} onPress={() => void join()} /><Button title="Kết thúc buổi thẩm định" variant="outline" disabled={busy} onPress={() => void mutate(() => assessorService.meetingAction(id, 'end'))} /></>}</View>}
      </View>
      <View style={s.card}><Text style={s.sectionTitle}>Báo cáo thẩm định</Text>{data.report ? <>{[['Tóm tắt', data.report.summary], ['Kết quả kiểm tra', data.report.findings], ['Khuyến nghị', data.report.recommendations]].map(([label, value]) => value ? <View key={label} style={{ gap: 6 }}><Text style={s.label}>{label}</Text><Text style={s.body}>{value}</Text></View> : null)}<Text style={s.muted}>Đã gửi {assessorDate(data.report.submittedAt)}</Text></> : canReport ? <>
        <Text style={s.muted}>Hoàn thiện đánh giá trước khi gửi báo cáo chính thức.</Text>
        <Text style={s.label}>Tóm tắt</Text><TextInput accessibilityLabel="Tóm tắt thẩm định" multiline maxLength={10000} value={summary} onChangeText={v => { changeDraft({ summary: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        <Text style={s.label}>Kết quả kiểm tra</Text><TextInput accessibilityLabel="Kết quả kiểm tra" multiline maxLength={30000} value={findings} onChangeText={v => { changeDraft({ findings: v }); }} editable={!busy} style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} />
        <Text style={s.label}>Khuyến nghị</Text><TextInput accessibilityLabel="Khuyến nghị" multiline maxLength={10000} value={recommendations} onChangeText={v => { changeDraft({ recommendations: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        <View accessibilityRole="radiogroup" accessibilityLabel="Kết luận thẩm định" style={s.actions}>{[{ value: 1, label: 'Đạt yêu cầu' }, { value: 2, label: 'Không đạt' }].map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: outcome === option.value }} disabled={busy} onPress={() => { changeDraft({ outcome: option.value }); }} style={[s.secondaryButton, outcome === option.value && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}><Text style={s.link}>{option.label}</Text></Pressable>)}</View>
        {confirmReport && <Text style={s.muted}>Xác nhận gửi báo cáo chính thức với kết luận “{outcome === 1 ? 'Đạt yêu cầu' : 'Không đạt'}”?</Text>}
        <Button title={busy ? 'Đang gửi…' : confirmReport ? 'Xác nhận gửi báo cáo' : 'Gửi báo cáo'} disabled={busy || !summary.trim() || !findings.trim() || !recommendations.trim()} onPress={() => { if (!confirmReport) setConfirmReport(true); else void mutate(async () => { await assessorService.report(id, { summary: summary.trim(), findings: findings.trim(), recommendations: recommendations.trim(), outcome }); assessorReportDrafts.remove(key); if (identity.current === key) setDraft({ key, fields: emptyAssessorDraft() }); }); }} />
      </> : <Text style={s.muted}>{active ? 'Bạn có thể gửi báo cáo sau khi kết thúc buổi thẩm định.' : 'Chưa có báo cáo được gửi cho phiên này.'}</Text>}</View>
    </>}
  </ScrollView></View>;
}
