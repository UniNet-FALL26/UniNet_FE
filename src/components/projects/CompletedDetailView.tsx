import { verificationDate as date } from '@/utils/verification-date';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useProjectVerification } from '@/hooks/useProjectVerification';
import type { ProjectDetail } from '@/types/project';
import type { EvidenceModeration } from '@/types/project-verification';
import { level1Labels, level1Message, level2Label } from '@/utils/project-verification';

const limitation = 'Chỉ kiểm tra văn bản báo cáo và độ an toàn URL. Chưa đọc nội dung file hoặc xác nhận công việc đã hoàn thành.';
const projectDate = date;
const checkLabels = ['Đạt', 'Không đạt', 'Lỗi dịch vụ', 'Chưa kiểm tra'];
const kindLabel = (kind: string) => /url/i.test(kind) ? 'Độ an toàn URL' : /text|content/i.test(kind) ? 'Văn bản báo cáo' : 'Kiểm tra minh chứng';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={s.card}><Text style={s.heading}>{title}</Text>{children}</View>;
}
function ReviewEvidence({ review, checks = false }: { review: EvidenceModeration; checks?: boolean }) {
  const attempt = [...review.attempts].sort((a, b) => b.number - a.number)[0];
  if (!review.source.tasks.length) return <Text style={s.body}>Chưa có công việc trong phiên kiểm tra này.</Text>;
  return <>{review.source.tasks.map((task, taskIndex) => <View key={task.projectTaskId} style={s.evidence}>
    <Text style={s.heading}>Công việc {taskIndex + 1}</Text>
    <Text style={s.small}>Dữ liệu tại phiên kiểm tra #{review.version}</Text>
    {!task.reports.length && <Text style={s.warning}>Thiếu báo cáo và minh chứng.</Text>}
    {task.reports.map((report, reportIndex) => {
      const results = attempt?.results.filter(result => result.projectTaskId === task.projectTaskId && result.taskReportId === report.taskReportId) ?? [];
      return <View key={report.taskReportId} style={s.report}>
        <Text style={s.label}>Báo cáo {reportIndex + 1} · phiên bản {report.version}</Text>
        {!report.content?.trim() && <Text style={s.warning}>Thiếu nội dung báo cáo.</Text>}
        <Text style={s.body}>{report.content || 'Chưa có nội dung.'}</Text>
        <Text style={s.small}>{report.evidence.length ? `${report.evidence.length} minh chứng đính kèm` : 'Chưa có minh chứng đính kèm'}</Text>
        {report.evidence.map((file, index) => <Text key={file.taskEvidenceId} style={s.body}>{file.fileName || `Minh chứng ${index + 1}`}</Text>)}
        {checks && !results.length && <Text style={s.small}>Chưa có kết quả kiểm tra cho báo cáo này.</Text>}
        {checks && results.map((result, index) => <View key={`${result.taskEvidenceId}-${result.kind}-${index}`} style={s.result}>
          <Text style={s.label}>{kindLabel(result.kind)} · {checkLabels[result.status] ?? 'Chưa xác định'}</Text>
          <Text style={s.body}>{result.status === 2 ? (result.transient ? 'Dịch vụ tạm thời chưa kiểm tra được. Hãy làm mới sau.' : 'Dịch vụ chưa thể kiểm tra. Cần hỗ trợ vận hành.') : result.reason || 'Chưa có diễn giải.'}</Text>
          {result.url && <Text selectable style={s.small}>{result.url}</Text>}
          <Text style={s.small}>Kiểm tra lúc {date(result.checkedAt)}</Text>
        </View>)}
      </View>;
    })}
  </View>)}</>;
}

export function CompletedDetailView({ project, level1Only = false, initialTab = 'Tổng quan' }: { project: ProjectDetail; level1Only?: boolean; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(false);
  const wide = useWindowDimensions().width >= 900;
  const { level1, level2, cycle, notice, retrying, refresh, retry } = useProjectVerification(project.id, project.isCreator, level1Only);
  const review = level1.data;
  const eligible = review?.status === 2 && review.isCurrent;
  const privateMessage = 'Kết quả xác minh riêng tư chỉ dành cho người tạo dự án. Trạng thái hoàn thành không đồng nghĩa đã xác minh.';
  const openLevel1 = () => router.push({ pathname: '/group/level1/[id]', params: { id: project.id } } as never);
  const showEvidence = () => {
    if (level1Only) router.push({ pathname: '/group/[id]', params: { id: project.id, tab: 'Minh chứng' } } as never);
    else setTab('Minh chứng');
  };
  const openLevel2 = () => router.push(level2.data
    ? { pathname: '/group/verification-dossier/[id]', params: { id: level2.data.verification.id } } as never
    : { pathname: '/group/verification/[id]', params: { id: project.id } } as never);
  const canRetry = project.isCreator && !level1.loading && !level1.error && !level1.forbidden && review?.status !== 0 && review?.status !== 1;
  const level1Title = level1.error ? 'Chưa tải được kết quả cấp 1' : level1.loading && !review ? 'Đang tải cấp 1…' : review ? level1Labels[review.status] : 'Chưa có kết quả cấp 1';
  const nextMessage = !project.isCreator ? privateMessage : level2.data ? level2Label(level2.data, !!eligible) : level1.error || (level1.loading && !review ? 'Đang tải kết quả xác minh để xác định bước tiếp theo.' : level1Message(review));
  const cta = level1Only
    ? { title: 'Xem minh chứng cần cập nhật', action: showEvidence }
    : !level2.loading && !level2.error && (level2.data || eligible)
    ? { title: level2.data ? level2.data.verification.status === 0 ? 'Tiếp tục hồ sơ cấp 2' : 'Xem hồ sơ và kết quả cấp 2' : 'Chọn gói xác minh cấp 2', action: openLevel2 }
    : { title: 'Xem kết quả cấp 1', action: openLevel1 };
  const members = project.members.some(member => member.userId === project.creator.id) ? project.members
    : [{ userId: project.creator.id, fullName: project.creator.fullName, role: 'Người tạo dự án' }, ...project.members];
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={s.back} onPress={() => level1Only ? router.back() : router.dismissTo('/(tabs)/groups' as never)}><Text style={s.backText}>‹</Text></Pressable>
      <Text style={s.headerTitle}>{level1Only ? 'Kết quả kiểm tra cấp 1' : 'Dự án đã hoàn thành'}</Text>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>

        <View style={s.heroTop}><Text style={s.heroKicker}>HỒ SƠ DỰ ÁN</Text><Text style={s.heroMark}>✓</Text></View>
        <Text style={s.eyebrow}>{project.projectField}</Text>
        <Text accessibilityRole="header" style={s.title}>{project.title}</Text>
        <View style={s.badges}><Text style={s.badge}>✓ Đã hoàn thành</Text><Text style={s.role}>{project.isCreator ? 'Người tạo dự án' : project.isMember ? 'Thành viên' : 'Khách xem'}</Text></View>
        <Text style={s.heroNote}>Hoàn thành dự án và xác minh là hai trạng thái độc lập.</Text>
      </View>
      {notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {project.isCreator ? <View style={[s.summary, wide && !level1Only && s.summaryWide]}>
        {!level1Only && <View style={s.progressColumn}><Card title="Tiến trình xác minh">
          <View style={s.step}><View style={[s.stepNumber, eligible && s.stepPassed]}><Text style={[s.stepNumberText, eligible && s.stepPassedText]}>{eligible ? '✓' : '01'}</Text></View><View style={s.stepBody}>
          <Text style={s.label}>Kiểm tra tự động</Text><Text style={s.small}>{level1Title}</Text>
          {review && !review.isCurrent && <Text style={s.warning}>Kết quả không còn hiện hành</Text>}
          {level1.error && <Text accessibilityRole="alert" style={s.warning}>{level1.error}</Text>}
          </View></View>
          <View style={s.divider} />
          <View style={s.step}><View style={s.stepNumber}><Text style={s.stepNumberText}>02</Text></View><View style={s.stepBody}>
          <Text style={s.label}>Xác minh chuyên viên</Text>
          <Text style={s.small}>{level2.error ? 'Chưa tải được trạng thái cấp 2' : level2.loading && !level2.data ? 'Đang tải cấp 2…' : level2Label(level2.data, !!eligible)}</Text>
          {level2.error && <Text accessibilityRole="alert" style={s.warning}>{level2.error}</Text>}
          </View></View>
          {(level1.loading || level2.loading) && <Text style={s.small}>Đang làm mới trạng thái…</Text>}
          <Button title="Làm mới trạng thái" variant="outline" onPress={refresh} disabled={level1.loading || level2.loading} />
        </Card></View>}
        <View style={[s.nextColumn, wide && !level1Only && s.nextColumnWide]}><Card title={level1Only ? level1Title : 'Bước tiếp theo'}>
          {!level1Only && <Text style={s.small}>Chọn hành động bên dưới để tiếp tục.</Text>}
          <Text style={s.body}>{!level1Only && level1.error ? 'Kết quả kiểm tra hiện chưa tải được. Bạn có thể mở chi tiết cấp 1 để xem trạng thái và thử lại.' : nextMessage}</Text>
          {level1.loading && <ActivityIndicator color={colors.primary} />}
          {!level1Only && <Button title={cta.title} onPress={cta.action} loading={retrying} />}
          {!level1Only && cta.title !== 'Xem kết quả cấp 1' && <Button title="Xem kết quả cấp 1" variant="outline" onPress={openLevel1} />}
          {level1Only && <>
            <Text style={s.notice}>{limitation}</Text>
            {review && <>
              <Text style={s.body}>{review.summary || 'Chưa có tóm tắt kết quả.'}</Text>
              <Text style={s.small}>Phiên bản kiểm tra: {review.version} · Chính sách: {review.policy?.version || 'Chưa cung cấp'}</Text>
              <Text style={s.small}>Tạo lúc: {date(review.createdAt)}{ '\n' }Hoàn tất: {date(review.completedAt)}</Text>
              <Text style={review.isCurrent ? s.small : s.warning}>{review.isCurrent ? 'Kết quả áp dụng cho dữ liệu hiện tại' : 'Dữ liệu/chính sách đã thay đổi — cần kiểm tra lại'}</Text>
            </>}
            <Button title="Làm mới kết quả" variant="outline" onPress={refresh} disabled={level1.loading || retrying} />
            <Button title={review ? 'Gửi xác thực lại' : 'Yêu cầu kiểm tra cấp 1'} onPress={retry} loading={retrying} disabled={!canRetry} />
            <Text style={s.small}>Chỉ tạo phiên kiểm tra mới khi dữ liệu hoặc chính sách thay đổi. Không gửi lại liên tục khi hệ thống đang xử lý.</Text>
            <Button title={cta.title} variant="outline" onPress={cta.action} />
          </>}
        </Card></View>
      </View> : <Card title="Thông tin xác minh"><Text style={s.body}>{privateMessage}</Text></Card>}

      {!level1Only && <View accessibilityRole="tablist" style={s.tabs}>{['Tổng quan', 'Minh chứng', 'Xác minh'].map(name => <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: tab === name }} onPress={() => setTab(name)} style={[s.tab, tab === name && s.selectedTab]}><Text style={[s.tabText, tab === name && s.selectedText]}>{name}</Text></Pressable>)}</View>}
      {!level1Only && tab === 'Tổng quan' && <>
        <Card title="Về dự án"><Text style={s.body} numberOfLines={expanded ? undefined : 5}>{project.description || 'Chưa có mô tả.'}</Text><Button title={expanded ? 'Thu gọn mô tả' : 'Đọc đầy đủ mô tả'} variant="outline" onPress={() => setExpanded(v => !v)} /><Text style={s.label}>Kết quả dự kiến</Text><Text style={s.body}>{projectDate(project.expectedOutput)}</Text><Text style={s.small}>Giờ Việt Nam (UTC+7)</Text><Text style={s.small}>Ngày tạo: {projectDate(project.createdAt)}{ '\n' }Cập nhật: {projectDate(project.updatedAt)}</Text></Card>
        <Card title={`Đội ngũ · ${members.length}`} >{members.map(member => <View key={member.userId} style={s.member}><View style={s.avatar}><Text style={s.avatarText}>{member.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('')}</Text></View><View style={s.stepBody}><Text style={s.label}>{member.fullName}</Text><Text style={s.small}>{member.role}</Text></View></View>)}</Card>
        <Card title="Kỹ năng"><View style={s.skillList}>{project.skills.length ? project.skills.map(skill => <Text key={skill.skillId} style={s.skillChip}>{skill.skillName}</Text>) : <Text style={s.body}>Chưa có kỹ năng.</Text>}</View></Card>
      </>}
      {(level1Only || tab === 'Minh chứng') && project.isCreator && <Card title="Báo cáo và minh chứng">
        {cycle.loading ? <Text style={s.small}>Đang kiểm tra quyền cập nhật minh chứng…</Text> : <Text style={s.notice}>{cycle.error ? 'Chưa xác định được quyền cập nhật. Tạm thời chỉ xem minh chứng.' : cycle.data?.status === 0 ? 'Đầu vào đóng góp đang mở. Bên dưới là minh chứng đã được ghi nhận trong phiên kiểm tra gần nhất.' : 'Minh chứng đang ở chế độ chỉ đọc: không có chu kỳ đóng góp đang thu thập đánh giá hoặc đầu vào đã khóa.'}</Text>}
        <Text style={s.small}>Đây là bản chụp tại thời điểm kiểm tra, có thể khác dữ liệu hiện tại. Cập nhật minh chứng có thể làm kết quả cũ hết hiệu lực.</Text>
        {level1.error ? <Text style={s.warning}>{level1.error}</Text> : review ? <ReviewEvidence review={review} checks={level1Only} /> : <Text style={s.body}>{level1.loading ? 'Đang tải…' : 'Chưa có bản chụp minh chứng cấp 1.'}</Text>}
      </Card>}
      {!level1Only && tab === 'Minh chứng' && !project.isCreator && <Card title="Minh chứng"><Text style={s.body}>{project.isMember ? 'Minh chứng trong phiên kiểm tra chỉ dành cho người tạo dự án.' : 'Bạn không có quyền xem báo cáo và minh chứng riêng tư.'}</Text></Card>}
      {!level1Only && tab === 'Xác minh' && <Card title="Chi tiết xác minh">
        <Text style={s.body}>{project.isCreator ? nextMessage : privateMessage}</Text>
        {project.isCreator && <>
          <Text style={s.label}>Cấp 2 · Xác minh chuyên viên</Text>
          <Text style={s.body}>{level2.error || (level2.loading && !level2.data ? 'Đang tải…' : level2Label(level2.data, !!eligible))}</Text>
          {level2.data?.verification.scheduledStartAt && <Text style={s.body}>Lịch hẹn: {date(level2.data.verification.scheduledStartAt)} — {date(level2.data.verification.scheduledEndAt)} (giờ Việt Nam, UTC+7)</Text>}
          {!level2.loading && !level2.error && (eligible || level2.data) && <Button title={level2.data ? 'Xem hồ sơ cấp 2' : 'Chọn gói cấp 2'} onPress={openLevel2} />}
          <Text style={s.small}>Theo dõi lịch hẹn, thanh toán và kết luận chuyên viên trong hồ sơ cấp 2.</Text>
        </>}
      </Card>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  back: { minWidth: 48, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 34, color: colors.primary }, headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  content: { padding: 16, gap: 16, width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 40 },
  hero: { padding: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 14, overflow: 'hidden' },
  heroRing: { position: 'absolute', width: 380, height: 380, borderRadius: 190, borderWidth: 52, borderColor: '#1A416B', right: -130, top: -100 },
  heroRingInner: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: '#32608B', right: -60, top: -30 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroKicker: { fontSize: 11, letterSpacing: 2, fontWeight: '700', color: colors.textSecondary }, heroMark: { fontSize: 22, fontWeight: '700', color: '#8DE1C4', width: 40, height: 40, textAlign: 'center', lineHeight: 40, backgroundColor: '#234B62', borderRadius: 14 },
  eyebrow: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 }, title: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: colors.navy },
  heroNote: { color: colors.textSecondary, fontSize: 14, lineHeight: 23 }, heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderColor: '#355170', paddingTop: 18, marginTop: 6 }, heroStat: { flex: 1, gap: 3 }, statValue: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' }, statLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, statDivider: { width: 1, height: 34, backgroundColor: '#355170' },
  summary: { gap: 18 }, summaryWide: { flexDirection: 'row', alignItems: 'flex-start' }, progressColumn: { flex: 1, minWidth: 0 }, nextColumn: { minWidth: 0 }, nextColumnWide: { width: 340 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 6 }, stepNumber: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF3FA', alignItems: 'center', justifyContent: 'center' }, stepNumberText: { fontSize: 14, fontWeight: '800', color: '#536B89' }, stepPassed: { backgroundColor: '#E4F6EE' }, stepPassedText: { color: '#1B7854' }, stepBody: { flex: 1, minWidth: 0, gap: 5 }, actionEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.primary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, badge: { backgroundColor: colors.projectCompletedBackground, color: colors.projectCompleted, padding: 8, borderRadius: 8, fontWeight: '700' }, role: { color: colors.navy, padding: 8, borderRadius: 8, backgroundColor: colors.surface },
  card: { padding: 18, gap: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#E3EAF3', boxShadow: '0 5px 22px #16365B06' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.navy }, label: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.navy }, body: { fontSize: 16, lineHeight: 25, color: colors.textPrimary }, small: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  warning: { fontSize: 16, lineHeight: 24, color: colors.error }, notice: { padding: 14, backgroundColor: colors.primaryLight, borderRadius: 12, color: colors.navy, fontSize: 15, lineHeight: 24 },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: '#E9EFF7', borderRadius: 16, padding: 5 }, tab: { flex: 1, minHeight: 48, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', borderRadius: 12 }, selectedTab: { backgroundColor: colors.surface, boxShadow: '0 2px 8px #16365B12' }, tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' }, selectedText: { color: colors.primary },
  evidence: { gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border }, report: { gap: 10, padding: 12, backgroundColor: colors.background, borderRadius: 12 }, result: { gap: 6, borderLeftWidth: 3, borderColor: colors.border, paddingLeft: 12, paddingVertical: 8 }, member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EAF2FF', justifyContent: 'center', alignItems: 'center' }, avatarText: { fontSize: 14, color: colors.primary, fontWeight: '700' }, skillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, skillChip: { color: '#285993', backgroundColor: '#EFF5FC', borderWidth: 1, borderColor: '#DDE8F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, fontSize: 14, lineHeight: 22 },
});

