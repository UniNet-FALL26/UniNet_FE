import { useState, type ReactNode } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { AssignmentDetail, AssignmentUser } from '@/services/assessor.service';
import { AssignmentStatus, assessorDate } from './assessor-ui';
import { colors } from '@/constants/colors';

export type DetailTab = 'results' | 'info' | 'schedule' | 'report' | 'history';
const hasText = (value: string | null | undefined) => !!value?.trim();
export function detailTabs(data: AssignmentDetail, active: boolean, canReport: boolean) {
  return [
    ...(data.report ? [{ key: 'results' as const, label: 'Kết quả' }] : []),
    { key: 'info' as const, label: 'Thông tin' },
    ...(active || data.assignment.scheduledStartAt || data.assignment.scheduledEndAt || data.assignment.meetingStartAt || data.assignment.meetingEndAt ? [{ key: 'schedule' as const, label: 'Lịch làm việc' }] : []),
    ...(canReport ? [{ key: 'report' as const, label: 'Lập báo cáo' }] : []),
    ...(data.assignment.assignedAt || data.assignment.completedAt || data.report?.submittedAt ? [{ key: 'history' as const, label: 'Nhật ký' }] : []),
  ];
}
export function DetailHeader({ data, tab, onTab, active, canReport }: { data: AssignmentDetail; tab: DetailTab; onTab: (tab: DetailTab) => void; active: boolean; canReport: boolean }) {
  const narrow = useWindowDimensions().width < 700;
  const [imageFailed, setImageFailed] = useState(false);
  const { project, assignment, report } = data;
  const steps = [
    { title: 'Xem xét', value: assignment.assignedAt, done: !!assignment.assignedAt },
    { title: 'Thẩm định', value: assignment.meetingEndAt || assignment.meetingStartAt, done: !!assignment.meetingEndAt },
    { title: 'Hoàn thiện', value: report?.submittedAt || assignment.completedAt, done: !!report || assignment.status === 1 },
  ];
  return <>
    <View role="region" accessibilityLabel="Chi tiết thẩm định" style={[styles.hero, narrow && styles.mobileHero]}>
      <View style={styles.heroMain}>{hasText(project.imageUrl) && !imageFailed && <Image source={{ uri: project.imageUrl! }} accessibilityLabel="Ảnh dự án" onError={() => setImageFailed(true)} style={styles.projectImage} />}<View style={styles.heroCopy}><Text style={styles.eyebrow}>Hồ sơ thẩm định</Text><Text role="heading" aria-level={1} style={[styles.heroTitle, narrow && styles.mobileHeroTitle]}>{project.title}</Text><View style={styles.heroMeta}>{hasText(project.projectField) && <Text style={styles.heroSubtitle}>{project.projectField}</Text>}</View></View></View>
      <View style={styles.heroStatus}><AssignmentStatus status={assignment.status} compact />{report?.submittedAt && <><Text style={styles.heroSubtitle}>Đã gửi báo cáo chính thức</Text><Text style={styles.heroSubtitle}>{assessorDate(report.submittedAt)}</Text></>}</View>
    </View>
    <View style={styles.steps}>{steps.map((step, i) => <View key={step.title} style={[styles.step, narrow && styles.mobileStep]}><View style={[styles.stepMark, step.done && (i === 2 ? styles.greenMark : styles.blueMark)]}><Text style={[styles.stepNumber, step.done && styles.white]}>{step.done ? '✓' : i + 1}</Text></View><View style={[styles.progressStepCopy, narrow && styles.mobileStepCopy]}><Text style={styles.stepTitle}>{step.title}</Text>{step.value && <Text style={styles.small}>{assessorDate(step.value)}</Text>}</View></View>)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabs} accessibilityRole="tablist">{detailTabs(data, active, canReport).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => onTab(item.key)} style={[styles.tab, narrow && { minHeight: 44 }, tab === item.key && styles.activeTab]}><Text style={[styles.tabText, tab === item.key && styles.activeTabText]}>{item.label}</Text></Pressable>)}</ScrollView>
  </>;
}
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <View role="region" accessibilityLabel={title} style={styles.section}><View style={styles.sectionHeading}><Text role="heading" aria-level={2} style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}
function PersonIdentity({ person, role }: { person: Omit<AssignmentUser, 'userId'> & { userId: string | null }; role?: string | null }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const name = person.fullName?.trim() || person.nickname?.trim() || 'Chưa cập nhật tên';
  const initials = name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  return <View style={styles.personRow}>{hasText(person.avatarUrl) && failedAvatar !== person.avatarUrl ? <Image source={{ uri: person.avatarUrl! }} accessibilityLabel={name} onError={() => setFailedAvatar(person.avatarUrl)} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitials}>{initials}</Text></View>}<View style={styles.personCopy}><Text style={styles.bold}>{name}</Text>{hasText(person.nickname) && <Text style={styles.small}>@{person.nickname?.trim().replace(/^@/, '')}</Text>}{hasText(role) && <Text style={styles.small}>{role}</Text>}</View></View>;
}
const outcomeLabels: Record<number, string> = { 0: 'Chờ đánh giá', 1: 'Đạt yêu cầu', 2: 'Không đạt', 3: 'Đã hủy', 4: 'Chưa đủ minh chứng' };
export function AssessmentResults({ data }: { data: AssignmentDetail }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const narrow = useWindowDimensions().width < 700;
  const report = data.report;
  if (!report) return null;
  const assessment = report.assessment;
  const outcome = report.outcome ?? assessment?.outcome;
  const criteria = assessment?.rubric.criteria.filter(c => assessment.scores.some(row => row.code === c.code)) || [];
  const conditions = assessment?.rubric.conditions.filter(c => assessment.conditions.some(row => row.code === c.code)) || [];
  const positive = outcome === 1;
  return <View style={styles.stack}>
    {data.assignedToUser && <DetailSection title="Người thẩm định"><PersonIdentity person={data.assignedToUser} /></DetailSection>}
    {(assessment?.totalScore != null || outcome !== undefined) && <DetailSection title="Tổng quan kết quả"><View style={[styles.resultBanner, !positive && styles.neutralBanner, narrow && styles.mobileResult]}>{assessment?.totalScore != null && <View style={styles.scoreBlock}><Text style={styles.bold}>Tổng điểm</Text><Text style={styles.totalScore}>{assessment.totalScore.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}<Text style={styles.scoreDenominator}>/100</Text></Text></View>}{outcome !== undefined && outcomeLabels[outcome] && <View style={styles.outcomeCopy}><Text style={[styles.outcome, positive && styles.success]}>{positive ? '✓  ' : ''}{outcomeLabels[outcome]}</Text></View>}</View></DetailSection>}
    {!!criteria.length && assessment && <DetailSection title="Đánh giá theo tiêu chí"><View style={styles.rows}>{criteria.map((c, i) => {
      const row = assessment.scores.find(row => row.code === c.code)!;
      const open = expanded.includes(c.code), canExpand = hasText(row.reason) || hasText(row.evidence);
      return <View key={c.code} style={styles.criterion}><Pressable accessibilityRole="button" accessibilityLabel={`Chi tiết tiêu chí ${c.name}`} accessibilityState={{ expanded: open }} disabled={!canExpand} onPress={() => setExpanded(previous => open ? previous.filter(code => code !== c.code) : [...previous, c.code])} style={styles.criterionHeading}><Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text><View style={styles.criterionCopy}><Text style={styles.bold}>{c.name}</Text><Text style={styles.small}>Trọng số: {c.weight}%</Text></View><Text style={styles.points}>{row.score == null ? 'Chưa chấm' : `${(row.score / 10).toLocaleString('vi-VN')}/10`}</Text>{!narrow && row.score != null && <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, row.score))}%` }]} /></View>}{canExpand && <SymbolView name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down', web: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }} size={18} tintColor={colors.textSecondary} />}</Pressable>{open && <View style={styles.reason}>{hasText(row.reason) && <Text style={styles.body}>{row.reason}</Text>}{hasText(row.evidence) && <><Text style={styles.bold}>Minh chứng</Text><Text style={styles.body}>{row.evidence}</Text></>}</View>}</View>;
    })}</View></DetailSection>}
    {!!conditions.length && assessment && <DetailSection title="Điều kiện bắt buộc"><View style={styles.rows}>{conditions.map(c => { const row = assessment.conditions.find(row => row.code === c.code)!; return <View key={c.code} style={styles.condition}><View style={styles.conditionHeading}><Text style={[styles.conditionMark, row.passed === true && styles.success]}>{row.passed === true ? '✓' : row.passed === false ? '✕' : '–'}</Text><Text style={[styles.body, styles.flex]}>{c.description}</Text><Text style={[styles.conditionBadge, row.passed === true ? styles.passBadge : row.passed === false ? styles.failBadge : styles.unknownBadge]}>{row.passed === true ? 'Đạt' : row.passed === false ? 'Không đạt' : 'Chưa đủ cơ sở'}</Text></View>{hasText(row.reason) && <Text style={styles.conditionReason}>{row.reason}</Text>}</View>; })}</View></DetailSection>}
    {(hasText(report.summary) || hasText(report.findings) || hasText(report.recommendations)) && <DetailSection title="Kết luận & Khuyến nghị"><View style={[styles.conclusions, narrow && styles.mobileConclusions]}>{hasText(report.summary) && <View style={[styles.conclusion, styles.greenPanel]}><Text style={styles.panelTitle}>Kết luận</Text><Text style={styles.body}>{report.summary}</Text></View>}{hasText(report.recommendations) && <View style={[styles.conclusion, styles.bluePanel]}><Text style={styles.panelTitle}>Khuyến nghị</Text><Text style={styles.body}>{report.recommendations}</Text></View>}</View>{hasText(report.findings) && <View style={styles.findings}><Text style={styles.bold}>Kết quả kiểm tra</Text><Text style={styles.body}>{report.findings}</Text></View>}</DetailSection>}
  </View>;
}
export function ProjectInformation({ data, onLinkError }: { data: AssignmentDetail; onLinkError: (message: string) => void }) {
  const wide = useWindowDimensions().width >= 1000;
  const { project, assignment } = data;
  const external = project.externalDetails;
  const info = [['Lĩnh vực', project.projectField], ['Ngày phân công', assignment.assignedAt ? assessorDate(assignment.assignedAt) : null], ['Hạn báo cáo', assignment.reportDueAt ? assessorDate(assignment.reportDueAt) : null]].filter(([, value]) => hasText(value));
  return <View style={[styles.infoLayout, wide && styles.wideInfo]}><View style={styles.infoMain}>{external && <DetailSection title="Thông tin thực hiện"><Text style={styles.body}>{external.startDate} → {external.endDate}</Text><Text style={styles.body}>Vai trò người nộp: {external.submitterRole}</Text><Text style={styles.body}>{external.submitterContribution}</Text></DetailSection>}{hasText(project.description) && <DetailSection title="Giới thiệu dự án"><Text style={styles.body}>{project.description}</Text></DetailSection>}<DetailSection title="Kỹ năng dự án">{project.skills?.length ? <View style={styles.skillList}>{project.skills.map(skill => <View key={skill.skillId} style={styles.skillChip}>{hasText(skill.iconUrl) && <Image source={{ uri: skill.iconUrl! }} style={styles.skillIcon} accessibilityLabel={skill.skillName} />}<View style={styles.personCopy}><Text style={styles.bold}>{skill.skillName}</Text>{hasText(skill.category) && <Text style={styles.small}>{skill.category}</Text>}{skill.minLevel != null && <Text style={styles.small}>Cấp độ tối thiểu: {skill.minLevel}</Text>}</View></View>)}</View> : <Text style={styles.small}>Chưa có thông tin kỹ năng.</Text>}</DetailSection><DetailSection title="Trưởng nhóm">{project.leader ? <PersonIdentity person={project.leader} role={project.leader.role} /> : <Text style={styles.small}>Chưa có thông tin trưởng nhóm.</Text>}</DetailSection>{external && <DetailSection title="Thành viên được khai báo">{external.members.map((member, index) => <View key={index}><Text style={styles.bold}>{member.name}</Text><Text style={styles.small}>{member.role}</Text></View>)}</DetailSection>}<DetailSection title={external ? "Thành viên trên nền tảng" : "Thành viên"}>{project.members?.length ? project.members.map(member => <PersonIdentity key={member.userId} person={member} role={member.role} />) : <Text style={styles.small}>Chưa có thông tin thành viên.</Text>}</DetailSection></View><View style={[styles.sidebar, wide && styles.wideSidebar]}>{!!info.length && <DetailSection title="Thông tin chung">{info.map(([label, value]) => <View key={label} style={styles.infoRow}><Text style={styles.small}>{label}</Text><Text selectable style={styles.infoValue}>{value}</Text></View>)}</DetailSection>}</View></View>;
}
export async function openEvidence(value: string, onError: (message: string) => void) {
  try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); await Linking.openURL(url.href); }
  catch { onError('Không thể mở đường dẫn minh chứng.'); }
}
export function AssignmentHistory({ data }: { data: AssignmentDetail }) {
  const a = data.assignment;
  const events = [{ title: 'Được phân công thẩm định', at: a.assignedAt }, { title: 'Bắt đầu buổi thẩm định', at: a.meetingStartAt }, { title: 'Kết thúc buổi thẩm định', at: a.meetingEndAt }, { title: 'Gửi báo cáo chính thức', at: data.report?.submittedAt }, { title: 'Hoàn thành thẩm định', at: a.completedAt }].filter(event => event.at).sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime());
  return events.length ? <DetailSection title="Nhật ký thẩm định">{events.map(event => <View key={event.title} style={styles.historyRow}><View style={styles.historyDot} /><View style={styles.stepCopy}><Text style={styles.bold}>{event.title}</Text><Text style={styles.small}>{assessorDate(event.at)}</Text></View></View>)}</DetailSection> : null;
}
const styles = StyleSheet.create({
  hero: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  mobileHero: { padding: 12, flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  heroMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, heroCopy: { flex: 1, gap: 4 },
  projectImage: { width: 44, height: 44, borderRadius: 6 }, eyebrow: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
  heroTitle: { color: colors.textPrimary, fontSize: 20, lineHeight: 27, fontWeight: '600' }, mobileHeroTitle: { fontSize: 18, lineHeight: 25 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heroSubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, heroStatus: { alignItems: 'flex-start', gap: 4 },
  steps: { flexDirection: 'row', gap: 10, borderRadius: 8, padding: 12, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border },
  step: { flex: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, mobileStep: { flexDirection: 'column', gap: 6 },
  progressStepCopy: { minWidth: 0, flexShrink: 1, gap: 2 }, mobileStepCopy: { alignItems: 'center' }, stepCopy: { flex: 1, gap: 3 },
  stepMark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F3F7' }, stepNumber: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  blueMark: { backgroundColor: '#68788F' }, greenMark: { backgroundColor: '#21845A' }, stepTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  tabScroll: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: colors.border }, tabs: { gap: 8, flexDirection: 'row' },
  tab: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary }, activeTabText: { color: colors.primary, fontWeight: '600' }, white: { color: 'white' },
  stack: { gap: 12 }, section: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center' }, sectionTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  resultBanner: { padding: 12, borderRadius: 6, backgroundColor: '#F7F9FC', flexDirection: 'row', alignItems: 'center', gap: 20 }, neutralBanner: { backgroundColor: '#F7F9FC' },
  mobileResult: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }, scoreBlock: { minWidth: 120, gap: 3 }, totalScore: { fontSize: 26, lineHeight: 34, fontWeight: '600', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  scoreDenominator: { fontSize: 14, fontWeight: '500', color: colors.textSecondary }, outcomeCopy: { flex: 1 }, outcome: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '600' }, success: { color: colors.success },
  rows: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' }, criterion: { borderBottomWidth: 1, borderBottomColor: colors.border },
  criterionHeading: { padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', minHeight: 44 }, index: { width: 20, fontWeight: '500', color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  criterionCopy: { flex: 1, gap: 2 }, bold: { color: colors.textPrimary, fontSize: 12, lineHeight: 19, fontWeight: '600' }, small: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  points: { color: colors.textPrimary, fontWeight: '600', fontSize: 12, fontVariant: ['tabular-nums'] }, track: { width: 80, height: 3, backgroundColor: colors.primaryLight, borderRadius: 2, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  reason: { padding: 10, gap: 6 }, body: { color: '#344257', fontSize: 12, lineHeight: 19 },
  condition: { padding: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border }, conditionHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  conditionMark: { width: 14, fontSize: 14, color: colors.textSecondary }, flex: { flex: 1, minWidth: 0 }, conditionBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: '500' },
  passBadge: { backgroundColor: '#EDF6F0', color: '#21845A' }, failBadge: { backgroundColor: '#FCF1F2', color: '#BD3542' }, unknownBadge: { backgroundColor: '#F0F3F7', color: colors.textSecondary }, conditionReason: { fontSize: 11, lineHeight: 18, color: colors.textSecondary, paddingLeft: 20 },
  conclusions: { flexDirection: 'row', gap: 10 }, mobileConclusions: { flexDirection: 'column' }, conclusion: { flex: 1, borderRadius: 6, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border }, greenPanel: { backgroundColor: 'white' }, bluePanel: { backgroundColor: 'white' },
  panelTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 20, fontWeight: '600' }, findings: { gap: 6 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, personCopy: { flex: 1, minWidth: 0, gap: 2 }, avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: '#F0F3F7', alignItems: 'center', justifyContent: 'center' }, avatarInitials: { color: colors.textSecondary, fontWeight: '600', fontSize: 11 },
  skillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, skillChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, flexGrow: 1, flexBasis: 160 }, skillIcon: { width: 20, height: 20, resizeMode: 'contain' },
  infoLayout: { gap: 12 }, wideInfo: { flexDirection: 'row', alignItems: 'flex-start' }, infoMain: { flex: 1, minWidth: 0, gap: 12 }, sidebar: { gap: 12 }, wideSidebar: { width: 260 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }, infoValue: { flex: 1, textAlign: 'right', fontSize: 12, lineHeight: 18, color: colors.textPrimary },
  file: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 6 }, historyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6 }, historyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8190A4', marginTop: 7 },
});
