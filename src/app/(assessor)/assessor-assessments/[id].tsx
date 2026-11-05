import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { assessorService, type AssignmentDetail, type AssessorMeeting } from '@/services/assessor.service';
import { AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { DetailHeader, AssessmentResults, ProjectInformation, EvidenceDetails, AssignmentHistory, detailTabs, type DetailTab } from '@/components/assessor/AssignmentDetailContent';
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
  const meeting = room?.key === key ? room.data : null;
  const meetingStartAt = assignment?.meetingStartAt || meeting?.meetingStartAt;
  const meetingEndAt = assignment?.meetingEndAt || meeting?.meetingEndAt;
  const canReport = active && !!meetingStartAt && !!meetingEndAt && !data?.report;
  const rubric = data?.assessmentRubric;
  const assessment = rubric ? fields.assessment?.rubricVersion === rubric.version ? fields.assessment : emptyAssessment(rubric) : null;
  const [selectedTab, setSelectedTab] = useState<DetailTab | null>(null);
  const preferredTab = selectedTab || (data?.report ? 'results' : active ? 'schedule' : 'info');
  const tab = data && detailTabs(data, active, canReport).some(item => item.key === preferredTab) ? preferredTab : data?.report ? 'results' : 'info';
  useEffect(() => { setSelectedTab(null); }, [key]);
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <DetailNavigation backLabel="Quay lại danh sách thẩm định" />
    {error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !data || !assignment ? <AssessorState loading /> : <>
      <DetailHeader key={`header:${key}`} data={data} tab={tab} onTab={setSelectedTab} active={active} canReport={canReport} />
      {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
      {tab === 'results' && <AssessmentResults key={`results:${key}`} data={data} />}
      {tab === 'info' && <ProjectInformation data={data} onLinkError={setActionError} />}
      {tab === 'evidence' && <EvidenceDetails data={data} onLinkError={setActionError} />}
      {tab === 'history' && <AssignmentHistory data={data} />}
      {tab === 'schedule' && <View style={s.detailMeetingCard}><SectionHeading number="03" title="Lịch và phòng thẩm định" caption="Trao đổi, xác minh và hoàn tất buổi thẩm định" /><Text style={s.muted}>{room?.key === key ? room.data.meetingEndAt ? 'Phòng họp đã kết thúc' : room.data.joinUrl ? 'Phòng họp đã sẵn sàng' : 'Chưa có đường dẫn tham gia' : 'Tạo / lấy phòng để chuẩn bị buổi thẩm định.'}</Text>{assignment.scheduledStartAt && <Text style={s.body}>Bắt đầu: {assessorDate(assignment.scheduledStartAt)}</Text>}{assignment.scheduledEndAt && <Text style={s.muted}>Kết thúc dự kiến: {assessorDate(assignment.scheduledEndAt)}</Text>}<Text style={s.muted}>Lịch dự kiến không phải thời lượng tối thiểu. Thoát phòng họp không tự kết thúc buổi thẩm định; hãy bấm “Kết thúc buổi thẩm định” để mở bước lập báo cáo.</Text>{meetingStartAt && <Text style={s.muted}>Đã bắt đầu: {assessorDate(meetingStartAt)}</Text>}{meetingEndAt && <Text style={s.muted}>Đã kết thúc: {assessorDate(meetingEndAt)}</Text>}
        {active && !meetingEndAt && <View style={s.actions}><Button title="Tạo / lấy phòng họp" variant="outline" disabled={busy} onPress={() => void mutate(() => assessorService.createMeeting(id))} /><Button title="Tham gia phòng họp" disabled={busy} onPress={() => void join()} />{!meetingStartAt && <Button title="Bắt đầu buổi thẩm định" disabled={busy} onPress={() => void mutate(() => assessorService.meetingAction(id, 'start'))} />}<Button title="Kết thúc buổi thẩm định" variant="outline" disabled={busy || !meetingStartAt} onPress={() => void mutate(() => assessorService.meetingAction(id, 'end'))} /></View>}
      </View>}
      {tab === 'report' && canReport && <View style={s.detailReportCard}><SectionHeading number="04" title="Báo cáo thẩm định" caption="Tổng hợp nhận định và đánh giá chuyên môn" />
        <View style={s.detailReportIntro}><Text style={s.eyebrow}>SOẠN BÁO CÁO</Text><Text style={s.sectionTitle}>Từ minh chứng đến kết luận</Text><Text style={s.muted}>Hoàn thiện nội dung, đánh giá tiêu chí và kiểm tra điều kiện trước khi gửi.</Text><View style={s.heading}><Text style={s.label}>Nội dung đã điền</Text><Text style={s.link}>{[summary, findings, recommendations].filter(v => v?.trim()).length}/3 phần</Text></View><View style={s.detailProgressTrack}><View style={[s.detailProgressFill, { width: `${[summary, findings, recommendations].filter(v => v?.trim()).length / 3 * 100}%` as `${number}%` }]} /></View></View>
        <Text style={s.muted}>Chấm từng tiêu chí theo thang 0–10, ghi lý do và dẫn chứng, sau đó hoàn thiện nội dung báo cáo. Kết quả được tính theo trọng số; báo cáo chính thức không thể sửa sau khi gửi.</Text>
        <View style={s.heading}><Text style={s.label}>Tóm tắt</Text><Text style={s.muted}>{(summary ?? '').length.toLocaleString('vi-VN')}/10.000 ký tự</Text></View><TextInput placeholder="Tổng quan quá trình thẩm định và nhận định chính…" accessibilityLabel="Tóm tắt thẩm định" multiline maxLength={10000} value={summary} onChangeText={v => { changeDraft({ summary: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        <View style={s.heading}><Text style={s.label}>Kết quả kiểm tra</Text><Text style={s.muted}>{(findings ?? '').length.toLocaleString('vi-VN')}/30.000 ký tự</Text></View><TextInput placeholder="Ghi nhận kết quả kiểm tra và các vấn đề cần làm rõ…" accessibilityLabel="Kết quả kiểm tra" multiline maxLength={30000} value={findings} onChangeText={v => { changeDraft({ findings: v }); }} editable={!busy} style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} />
        <View style={s.heading}><Text style={s.label}>Khuyến nghị</Text><Text style={s.muted}>{(recommendations ?? '').length.toLocaleString('vi-VN')}/10.000 ký tự</Text></View><TextInput placeholder="Đề xuất cải thiện và các bước tiếp theo cho dự án…" accessibilityLabel="Khuyến nghị" multiline maxLength={10000} value={recommendations} onChangeText={v => { changeDraft({ recommendations: v }); }} editable={!busy} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} />
        {rubric && assessment ? <AssessmentForm rubric={rubric} value={assessment} onChange={assessment => changeDraft({ assessment })} disabled={busy} /> : <Text style={s.error}>Hồ sơ chưa được gắn rubric. Chưa thể gửi báo cáo.</Text>}
        {confirmReport && <Text style={s.muted}>Xác nhận gửi báo cáo chính thức? Kết quả được hệ thống tính từ điểm và các điều kiện. Báo cáo đã gửi không thể chỉnh sửa.</Text>}
        <Button title={busy ? 'Đang gửi…' : confirmReport ? 'Xác nhận gửi báo cáo' : 'Gửi báo cáo'} disabled={busy || !rubric || !assessment || !summary.trim() || !findings.trim() || !recommendations.trim()} onPress={() => { if (!rubric || !assessment) return; const invalid = assessmentError(rubric, assessment); if (invalid) { setActionError(invalid); return; } if (!confirmReport) setConfirmReport(true); else void mutate(async () => { try { await assessorService.report(id, { summary: summary.trim(), findings: findings.trim(), recommendations: recommendations.trim(), assessment }); } catch (cause) { try { await assessorService.getReport(id); } catch { throw cause; } } assessorReportDrafts.remove(key); if (identity.current === key) setDraft({ key, fields: emptyAssessorDraft() }); }); }} />
      </View>}
    </>}
  </ScrollView></View>;
}

function SectionHeading({ number, title, caption }: { number: string; title: string; caption: string }) { return <View style={s.detailSectionHeading}><View style={s.detailSectionNumber}><Text style={s.link}>{number}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={s.sectionTitle}>{title}</Text><Text style={s.muted}>{caption}</Text></View></View>; }
