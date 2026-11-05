import { DetailModal } from '@/components/navigation/DetailModal';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { ActionButton, Card, CompanyIcon, CompanyPage, PageTitle, Tag, companyColors as c, type CompanyIconName } from '@/components/company/company-ui';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { jobApplicationIcons as jobIcons } from '@/constants/job-applicant-icons';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { companyJobApplicationStatusLabel, companyJobEmploymentTypeLabel, companyJobStatusLabel, companyJobWorkTypeLabel, companyService, formatCompanyDate, formatCompanySalary, type CompanyApplicant, type CompanyJob, type CompanyJobApplicationStatus } from '@/services/company.service';
import type { PortfolioResponse } from '@/types/portfolio';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const statusTone = { 0: 'purple', 1: 'amber', 2: 'purple', 3: 'green', 4: 'rose' } as const;
const applicantStatuses: CompanyJobApplicationStatus[] = [0, 1, 2, 3, 4];
const canMoveApplicantStatus = (current: CompanyJobApplicationStatus, next: CompanyJobApplicationStatus) => current < 3 && next > current;

export default function CompanyJobDetail() {
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 900;
  const mobile = width < 1024;
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [job, setJob] = useState<CompanyJob | null>(null);
  const [applicants, setApplicants] = useState<CompanyApplicant[]>([]);
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState<string | null>(null);
  const [selectedCv, setSelectedCv] = useState<{ owner: string; portfolio: PortfolioResponse } | null>(null);
  const [statusMenuApplicantId, setStatusMenuApplicantId] = useState<string | null>(null);
  const [statusConfirmation, setStatusConfirmation] = useState<{ applicant: CompanyApplicant; status: CompanyJobApplicationStatus } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [cvFrameWidth, setCvFrameWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobConfirmation, setJobConfirmation] = useState<'close' | 'reopen' | 'delete' | null>(null);
  const [jobActionBusy, setJobActionBusy] = useState(false);
  const [jobActionError, setJobActionError] = useState('');
  const cvTemplate = getProfileTemplate(selectedCv?.portfolio.portfolio.appearance.profile.template);
  const cvTheme = getProfileTheme(cvTemplate.id, selectedCv?.portfolio.portfolio.appearance.profile.theme);

  const openStatusMenu = (applicant: CompanyApplicant) => {
    setStatusMenuApplicantId(current => current === applicant.id ? null : applicant.id);
  };

  const confirmApplicantStatus = async () => {
    if (!job || !statusConfirmation || statusSaving || !canMoveApplicantStatus(statusConfirmation.applicant.status, statusConfirmation.status)) return;
    setStatusSaving(true); setStatusError('');
    try {
      const updated = await companyService.updateApplicantStatus(job.id, statusConfirmation.applicant.id, statusConfirmation.status);
      setApplicants(current => current.map(applicant => applicant.id === updated.id ? updated : applicant));
      setStatusConfirmation(null);
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : 'Không cập nhật được trạng thái hồ sơ.');
    } finally { setStatusSaving(false); }
  };

  const requestJobAction = (action: 'close' | 'reopen' | 'delete') => {
    setJobActionError('');
    setJobConfirmation(action);
  };

  const confirmJobAction = async () => {
    if (!job || !jobConfirmation || jobActionBusy) return;
    setJobActionBusy(true);
    setJobActionError('');
    try {
      if (jobConfirmation === 'delete') {
        await companyService.deleteJob(job.id);
        router.replace('/(company)/jobs');
      } else {
        const updated = await companyService.updateJobStatus(job.id, jobConfirmation === 'close' ? 2 : 1);
        setJob(updated);
      }
      setJobConfirmation(null);
    } catch (cause) {
      setJobActionError(cause instanceof Error ? cause.message : 'Không thực hiện được thao tác. Vui lòng thử lại.');
    } finally {
      setJobActionBusy(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!jobId) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void Promise.all([companyService.getJob(jobId, controller.signal), companyService.listApplicants(jobId, controller.signal), companyService.getProfile(controller.signal)])
      .then(([jobResult, applicantResult, profile]) => { setJob(jobResult); setApplicants(applicantResult); setPartnerAvatarUrl(profile.avatarUrl); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được chi tiết bài đăng.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId]));

  if (loading) return <CompanyPage><View style={s.center}><ActivityIndicator color={c.blue} /><Text style={s.muted}>Đang tải chi tiết bài đăng…</Text></View></CompanyPage>;
  if (error || !job) return <CompanyPage><View style={s.page}><ActionButton title="Quay lại bài đăng" variant="outline" onPress={() => router.replace('/(company)/jobs' as never)} /><Card style={s.surface}><Text style={s.error}>{error || 'Không tìm thấy bài đăng.'}</Text></Card></View></CompanyPage>;

  const jobContent = <>
        <Card style={[s.surface, s.hero]}><View style={s.heroRow}><View style={s.jobMark}>{partnerAvatarUrl ? <Image source={{ uri: partnerAvatarUrl }} style={s.partnerAvatar} resizeMode="cover" /> : <CompanyIcon name={jobIcons.job} color={c.blue} size={21} />}</View><View style={{ flex: 1 }}><Text style={s.title}>{job.title}</Text><Text style={s.muted}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text></View><Tag tone={job.status === 1 ? 'green' : 'gray'}>{companyJobStatusLabel[job.status]}</Tag></View><View style={s.summary}><SummaryItem icon={jobIcons.salary} value={formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)} /><SummaryItem icon={jobIcons.deadline} value={`Hạn ứng tuyển: ${formatCompanyDate(job.deadline)}`} /><SummaryItem icon={jobIcons.applicants} value={`${applicants.length} hồ sơ`} /></View></Card>
        <Card style={s.surface}><SectionHeader title="Thông tin công việc" icon={jobIcons.job} /><Info icon={jobIcons.workMode} label="Hình thức làm việc" value={companyJobWorkTypeLabel[job.workType]} /><Info icon={jobIcons.employmentType} label="Loại công việc" value={companyJobEmploymentTypeLabel[job.employmentType]} /><Info icon={jobIcons.field} label="Lĩnh vực" value={job.jobField} /><Info icon={jobIcons.location} label="Địa điểm" value={job.location || 'Chưa cập nhật'} /><Info icon={jobIcons.salary} label="Mức lương" value={formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)} /><Info icon={jobIcons.deadline} label="Hạn ứng tuyển" value={formatCompanyDate(job.deadline)} /></Card>
        <Card style={s.surface}><SectionHeader title="Mô tả công việc" icon={jobIcons.description} /><Text style={s.body}>{job.description || 'Chưa có mô tả.'}</Text></Card>
        <Card style={s.surface}><SectionHeader title="Yêu cầu" icon={jobIcons.requirements} />{[...job.requiredQualifications, ...job.preferredQualifications, ...job.projectAreas].length ? [...job.requiredQualifications, ...job.preferredQualifications, ...job.projectAreas].map((item, i) => <Text key={`${i}-${item}`} style={s.bullet}>•  {item}</Text>) : <Text style={s.muted}>Chưa có yêu cầu bổ sung.</Text>}</Card>
        {!!job.benefits.length && <Card style={s.surface}><SectionHeader title="Quyền lợi" icon={jobIcons.benefitsSection} />{job.benefits.map((benefit, i) => <View key={`${benefit.title}-${i}`} style={s.benefit}><View style={s.benefitIcon}><CompanyIcon name={benefitIconName(benefit.icon)} size={16} color={c.blue} /></View><View style={s.benefitCopy}><Text style={s.benefitTitle}>{benefit.title}</Text><Text style={s.muted}>{benefit.description}</Text></View></View>)}</Card>}
  </>;

  const jobActions = (
      <View style={s.headingActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa bài đăng" hitSlop={5} style={s.jobAction} onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} color={c.blue} size={17} /></Pressable>
        {job.status === 1 && <Pressable accessibilityRole="button" accessibilityLabel="Đóng bài đăng" hitSlop={5} style={s.jobAction} onPress={() => requestJobAction('close')}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} color={c.blue} size={17} /></Pressable>}
        {job.status === 2 && <Pressable accessibilityRole="button" accessibilityLabel="Mở lại bài đăng" hitSlop={5} style={s.jobAction} onPress={() => requestJobAction('reopen')}><CompanyIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} color={c.blue} size={17} /></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa bài đăng" hitSlop={5} style={[s.jobAction, s.deleteJobAction]} onPress={() => requestJobAction('delete')}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} color={c.rose} size={17} /></Pressable>
      </View>
  );

  return <CompanyPage>
    <DetailNavigation title="Chi tiết bài đăng" mobileActions={jobActions} />
    <ScrollView style={s.detailScroll} contentContainerStyle={[s.page, mobile && s.mobilePage]}>
    {!mobile && <View style={s.heading}>
      <View style={s.headingCopy}><PageTitle title="Chi tiết bài đăng" subtitle="Thông tin, hiệu suất và danh sách ứng viên." /></View>
      {jobActions}
    </View>}
    <View style={[s.columns, !wide && s.stackedColumns]}>
      <View style={s.main}>
        {jobContent}
      </View>
      <View style={[s.aside, !wide && s.asideStacked]}>
        <Card style={s.surface}><SectionHeader title="Hiệu suất tuyển dụng" icon={jobIcons.skills} /><Metric label="Ứng viên" value={applicants.length} icon={jobIcons.applicants} /><Metric label="Lượt xem" value={job.viewCount ?? 0} icon={jobIcons.views} /></Card>
        <Card style={s.surface}><SectionHeader title="Thông tin thêm" icon={jobIcons.deadline} /><Info icon={jobIcons.deadline} label="Ngày đăng" value={formatCompanyDate(job.createdAt)} /><Info icon={jobIcons.updatedAt} label="Cập nhật gần nhất" value={formatCompanyDate(job.updatedAt)} /></Card>
      </View>
    </View>
    {!!job.skills.length && <Card style={s.surface}><SectionHeader title="Kỹ năng" icon={jobIcons.skills} />{[0, 1].map(requirementType => { const skills = job.skills.filter(skill => skill.requirementType === requirementType); if (!skills.length) return null; return <View key={requirementType} style={s.skillGroup}><Text style={s.skillGroupLabel}>{requirementType === 0 ? 'CẦN CÓ' : 'ƯU TIÊN'}</Text><View style={s.skills}>{skills.map((skill, i) => <View key={`${skill.skillId || skill.name}-${i}`} style={[s.skill, requirementType === 0 ? s.skillRequired : s.skillPreferred]}>{!!skill.iconUrl && <Image source={{ uri: skill.iconUrl }} style={s.skillIcon} resizeMode="contain" />}<Text style={[s.skillText, requirementType === 0 ? s.skillRequiredText : s.skillPreferredText]}>{skill.name}</Text></View>)}</View></View>; })}</Card>}
    <View style={s.applicantHeading}><View><Text style={s.sectionTitle}>Danh sách ứng viên ({applicants.length})</Text><Text style={s.muted}>Các hồ sơ đã ứng tuyển vào bài đăng này.</Text></View></View>
    {applicants.length === 0 ? <Card style={s.surface}><Text style={s.muted}>Chưa có hồ sơ ứng tuyển.</Text></Card> : !wide ? <View style={s.applicantCards}>{applicants.map(applicant => {
        const name = applicant.fullName || applicant.nickname || 'Ứng viên';
        return <Card key={applicant.id} style={s.applicantCard}>
          <View style={s.cardApplicantHead}>
            <View style={s.cardAvatar}>{applicant.avatarUrl ? <Image source={{ uri: applicant.avatarUrl }} style={s.avatarImage} /> : <Text style={s.avatarText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>}</View>
            <View style={s.applicantTextBlock}>
              <Text style={s.cardApplicantName}>{name}</Text>
              <Text style={s.cardApplicantMeta}>{[applicant.major, applicant.universityName].filter(Boolean).join(' · ') || 'Sinh viên UniNet'}</Text>
              <Text style={s.cardApplicationDate}>{`Ứng tuyển ${formatCompanyDate(applicant.appliedAt)} · Lần ${applicant.applicationRound}`}</Text>
            </View>
            <Tag tone={statusTone[applicant.status]}>{companyJobApplicationStatusLabel[applicant.status]}</Tag>
          </View>
          {!!applicant.coverMessage && <Text style={s.cardApplicantMeta}>{applicant.coverMessage}</Text>}
          {applicant.aiMatchScore != null && <Text style={s.cardApplicantMeta}>Điểm phù hợp: {Math.round(applicant.aiMatchScore)}%</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ đã nộp của ${name}`} disabled={!applicant.submittedPortfolio} onPress={() => applicant.submittedPortfolio && setSelectedCv({ owner: name, portfolio: applicant.submittedPortfolio })} style={({ pressed }) => [s.cardViewCv, !applicant.submittedPortfolio && s.disabledAction, pressed && { opacity: 0.7 }]}>
            <CompanyIcon name={jobIcons.viewCv} size={16} color={c.blue} /><Text style={s.cardViewCvText}>Xem hồ sơ đã nộp</Text>
          </Pressable>
          {!applicant.submittedPortfolio && <Text style={s.cardApplicationDate}>Hồ sơ này chưa lưu bản CV đã nộp.</Text>}
          <Text style={s.cardStatusLabel}>CẬP NHẬT TRẠNG THÁI</Text>
          <View style={s.cardStatusOptions}>{applicantStatuses.map(status => {
            const selected = status === applicant.status;
            const disabled = statusSaving || !canMoveApplicantStatus(applicant.status, status);
            return <Pressable key={status} accessibilityRole="button" accessibilityLabel={`Chuyển ${name} sang ${companyJobApplicationStatusLabel[status]}`} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => { setStatusError(''); setStatusConfirmation({ applicant, status }); }} style={[s.cardStatusOption, selected && s.cardStatusSelected, disabled && !selected && s.disabledAction]}>
              <Text style={[s.cardStatusText, selected && s.cardStatusSelectedText]}>{companyJobApplicationStatusLabel[status]}</Text>
            </Pressable>;
          })}</View>
        </Card>;
      })}</View> : <Card style={[s.surface, s.tableCard]}><View style={s.tableViewport}><View style={s.applicantTable}><View style={[s.applicantRow, s.applicantHeader]}><Text style={[s.columnHeader, s.applicantNameColumn]}>Ứng viên</Text><Text style={[s.columnHeader, s.appliedColumn]}>Ngày ứng tuyển</Text><Text style={[s.columnHeader, s.statusColumn]}>Trạng thái</Text><Text style={[s.columnHeader, s.actionsColumn]}>Thao tác</Text></View>{applicants.map(applicant => <View key={applicant.id} style={statusMenuApplicantId === applicant.id ? s.applicantRowMenuOpen : undefined}><View style={s.applicantRow}><View style={[s.applicantInfo, s.applicantNameColumn]}><View style={s.applicantIdentity}><View style={s.avatar}>{applicant.avatarUrl ? <Image source={{ uri: applicant.avatarUrl }} style={s.avatarImage} /> : <Text style={s.avatarText}>{(applicant.fullName || applicant.nickname || '?').slice(0, 1).toUpperCase()}</Text>}</View><View style={s.applicantTextBlock}><Text numberOfLines={1} style={s.applicantName}>{applicant.fullName || applicant.nickname}</Text><Text numberOfLines={1} style={s.muted}>{applicant.universityName || applicant.major || 'Sinh viên'}</Text></View></View></View><Text style={[s.applicantCell, s.appliedColumn]}>{formatCompanyDate(applicant.appliedAt)}</Text><View style={s.statusColumn}><Tag tone={statusTone[applicant.status]}>{companyJobApplicationStatusLabel[applicant.status]}</Tag></View><View style={[s.actionsColumn, s.applicantActions]}><Pressable accessibilityRole="button" accessibilityLabel={`Xem CV của ${applicant.fullName}`} disabled={!applicant.submittedPortfolio} onPress={() => applicant.submittedPortfolio && setSelectedCv({ owner: applicant.fullName, portfolio: applicant.submittedPortfolio })} style={[s.smallAction, !applicant.submittedPortfolio && s.disabledAction]}><CompanyIcon name={jobIcons.viewCv} size={16} color={applicant.submittedPortfolio ? c.blue : c.muted} /></Pressable><View style={s.statusActionAnchor}><Pressable accessibilityRole="button" accessibilityLabel={`Đổi trạng thái ${applicant.fullName}`} onPress={() => openStatusMenu(applicant)} disabled={applicant.status >= 3} style={[s.smallAction, applicant.status >= 3 && s.disabledAction]}><CompanyIcon name={jobIcons.changeStatus} size={16} color={c.blue} /></Pressable>{statusMenuApplicantId === applicant.id && <View style={s.statusPopover}><Text style={s.dropdownTitle}>Chuyển trạng thái sang</Text>{applicantStatuses.filter(status => canMoveApplicantStatus(applicant.status, status)).map(status => <Pressable key={status} accessibilityRole="button" onPress={() => { setStatusMenuApplicantId(null); setStatusError(""); setStatusConfirmation({ applicant, status }); }} style={({ pressed }) => [s.dropdownOption, pressed && s.dropdownOptionPressed]}><Text style={s.dropdownOptionText}>{companyJobApplicationStatusLabel[status]}</Text><CompanyIcon name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={13} color={c.muted} /></Pressable>)}</View>}</View></View></View></View>)}</View></View></Card>}
  </ScrollView>
  <Modal visible={!!jobConfirmation} transparent animationType="fade" onRequestClose={() => { if (!jobActionBusy) setJobConfirmation(null); }}>
    <View style={s.confirmOverlay}><View style={s.confirmCard}>
      <Text style={s.confirmTitle}>{jobConfirmation === 'delete' ? 'Xóa bài tuyển dụng?' : jobConfirmation === 'reopen' ? 'Mở lại bài tuyển dụng?' : 'Đóng bài tuyển dụng?'}</Text>
      <Text style={s.confirmMessage}>{jobConfirmation === 'delete' ? `Bạn có chắc muốn xóa “${job.title}”? Thao tác này không thể hoàn tác.` : jobConfirmation === 'reopen' ? `Bài “${job.title}” sẽ được đăng lại và tiếp tục nhận hồ sơ.` : `Bài “${job.title}” sẽ ngừng nhận hồ sơ mới.`}</Text>
      {!!jobActionError && <Text accessibilityRole="alert" style={s.confirmError}>{jobActionError}</Text>}
      <View style={s.confirmActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hủy thao tác bài đăng" disabled={jobActionBusy} onPress={() => setJobConfirmation(null)} style={[s.confirmButton, s.cancelButton]}><Text style={s.cancelText}>Hủy</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Xác nhận thao tác bài đăng" disabled={jobActionBusy} onPress={() => void confirmJobAction()} style={[s.confirmButton, s.saveButton, jobConfirmation === 'delete' && s.deleteConfirmButton]}><Text style={s.saveText}>{jobActionBusy ? 'Đang xử lý…' : jobConfirmation === 'delete' ? 'Xóa bài' : jobConfirmation === 'reopen' ? 'Mở lại bài' : 'Đóng bài'}</Text></Pressable>
      </View>
    </View></View>
  </Modal>
  <DetailModal crumbs={[{ label: 'Quản lý bài đăng', href: '/(company)/jobs' }, { label: 'Chi tiết', href: '/job-detail?jobId=' + jobId }, { label: 'CV đã nộp' }]} backLabel="Đóng CV" visible={!!selectedCv} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedCv(null)}><SafeAreaView style={s.cvModal} edges={[]}><ScrollView contentContainerStyle={s.cvModalContent}>{selectedCv && <View onLayout={event => setCvFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={cvTemplate.id} data={selectedCv.portfolio} theme={cvTheme} width={Math.min(cvFrameWidth || width, 1120)} /></View>}</ScrollView></SafeAreaView></DetailModal><Modal visible={!!statusConfirmation} transparent animationType="fade" onRequestClose={() => { if (!statusSaving) setStatusConfirmation(null); }}><View style={s.confirmOverlay}><View style={s.confirmCard}><Text style={s.confirmTitle}>Xác nhận chuyển trạng thái</Text><Text style={s.confirmMessage}>{statusConfirmation ? "Chuyển hồ sơ của " + statusConfirmation.applicant.fullName + " sang “" + companyJobApplicationStatusLabel[statusConfirmation.status] + "”?" : ""}{statusConfirmation?.status === 4 ? " Sau khi từ chối, hồ sơ sẽ kết thúc quy trình." : statusConfirmation?.status === 3 ? " Sau khi nhận, hồ sơ sẽ kết thúc quy trình." : ""}</Text>{!!statusError && <Text accessibilityRole="alert" style={s.confirmError}>{statusError}</Text>}<View style={s.confirmActions}><Pressable accessibilityRole="button" accessibilityLabel="Hủy cập nhật trạng thái" disabled={statusSaving} onPress={() => setStatusConfirmation(null)} style={[s.confirmButton, s.cancelButton]}><Text style={s.cancelText}>Hủy</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Xác nhận cập nhật trạng thái" disabled={statusSaving} onPress={() => void confirmApplicantStatus()} style={[s.confirmButton, s.saveButton]}><Text style={s.saveText}>{statusSaving ? "Đang lưu…" : "Xác nhận"}</Text></Pressable></View></View></View></Modal></CompanyPage>;
}

function Info({ label, value, icon }: { label: string; value: string; icon: CompanyIconName }) { return <View style={s.info}><View style={s.infoLabel}><CompanyIcon name={icon} size={14} color={c.blue} /><Text style={s.muted}>{label}</Text></View><Text style={s.infoValue}>{value}</Text></View>; }
function SummaryItem({ icon, value }: { icon: CompanyIconName; value: string }) { return <View style={s.summaryItem}><CompanyIcon name={icon} size={14} color={c.blue} /><Text style={s.summaryText}>{value}</Text></View>; }
function SectionHeader({ title, icon }: { title: string; icon: CompanyIconName }) { return <View style={s.sectionHeader}><View style={s.sectionIcon}><CompanyIcon name={icon} size={16} color={c.blue} /></View><Text style={s.sectionTitle}>{title}</Text></View>; }
function benefitIconName(icon?: string): CompanyIconName { const names: Record<string, CompanyIconName> = { education: { ios: 'graduationcap.fill', android: 'school', web: 'school' }, salary: { ios: 'banknote.fill', android: 'payments', web: 'payments' }, health: { ios: 'heart.fill', android: 'favorite', web: 'favorite' }, flexible: { ios: 'house.fill', android: 'home', web: 'home' }, equipment: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' }, gift: { ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' } }; return names[icon || ''] ?? names.gift!; }
function Metric({ label, value, icon }: { label: string; value: number; icon: CompanyIconName }) { return <View style={s.metric}><View style={s.metricIcon}><CompanyIcon name={icon} size={18} color={c.blue} /></View><View><Text style={s.metricValue}>{value.toLocaleString('vi-VN')}</Text><Text style={s.muted}>{label}</Text></View></View>; }

const s = StyleSheet.create({
  surface: { padding: 16, backgroundColor: '#FBFDFF', borderWidth: 1, borderColor: '#D8E6F8', borderRadius: 10, boxShadow: '0px 2px 6px rgba(48, 99, 158, 0.035)' },
  metricIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },

  applicantCards: { gap: 12 },
  applicantCard: { padding: 14, borderRadius: 14, gap: 12 },
  cardApplicantHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardAvatar: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  cardApplicantName: { color: c.ink, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  cardApplicantMeta: { color: '#647C99', fontSize: 10, lineHeight: 15 },
  cardApplicationDate: { color: '#647C99', fontSize: 9, lineHeight: 14 },
  cardViewCv: { minHeight: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#BED5FF', borderRadius: 11, backgroundColor: '#F4F8FF' },
  cardViewCvText: { color: c.blue, fontSize: 12, fontWeight: '800' },
  cardStatusLabel: { color: '#647C99', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  cardStatusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardStatusOption: { minHeight: 32, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  cardStatusSelected: { backgroundColor: '#EAF3FF', borderColor: '#9BC0FF' },
  cardStatusText: { color: '#647C99', fontSize: 9, fontWeight: '700' },
  cardStatusSelectedText: { color: c.blue },

  detailScroll: { flex: 1, backgroundColor: '#EEF5FF' },
  mobileHeader: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FBFF', borderBottomWidth: 1, borderBottomColor: c.line, flexShrink: 0 },
  mobileBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  mobilePage: { padding: 16 },

  headingCopy: { flex: 1, minWidth: 180 },
  jobAction: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#D5E4F8', backgroundColor: '#FCFEFF', alignItems: 'center', justifyContent: 'center' },
  deleteJobAction: { backgroundColor: '#FFF5F5', borderColor: '#F6E5E5' },
  deleteConfirmButton: { backgroundColor: c.rose },
 page: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: 22, gap: 12, paddingBottom: 50 }, center: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 10 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, headingActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, stackedColumns: { flexDirection: 'column' }, main: { flex: 1, gap: 12, minWidth: 0, width: '100%' }, aside: { width: 300, gap: 12 }, asideStacked: { width: '100%' }, hero: { gap: 12, backgroundColor: '#FFFFFF', borderColor: '#D2E4FA' }, heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, jobMark: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#E3F0FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, partnerAvatar: { width: '100%', height: '100%' }, title: { color: c.ink, fontSize: 18, lineHeight: 25, fontWeight: '800', marginBottom: 3 }, muted: { color: '#647C99', fontSize: 11, lineHeight: 16 }, summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, borderTopWidth: 1, borderColor: '#E5EFFB', paddingTop: 10 }, summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, summaryText: { color: c.ink, fontSize: 12, fontWeight: '700' }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }, sectionIcon: { width: 27, height: 27, borderRadius: 7, backgroundColor: '#E4F1FF', alignItems: 'center', justifyContent: 'center' }, sectionTitle: { color: c.ink, fontSize: 14, lineHeight: 20, fontWeight: '800' }, info: { minHeight: 34, borderTopWidth: 1, borderColor: '#E7EFFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 }, infoValue: { color: c.ink, fontSize: 11, fontWeight: '600', textAlign: 'right', flexShrink: 1 }, body: { color: c.ink, fontSize: 12, lineHeight: 19 }, bullet: { color: c.ink, fontSize: 12, lineHeight: 20 }, skillGroup: { gap: 7, marginTop: 8 }, skillGroupLabel: { color: c.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }, skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, skillRequired: { backgroundColor: '#EFF6FF', borderColor: '#CADDF5' }, skillPreferred: { backgroundColor: '#F8FBFF', borderColor: '#D8E6F6' }, skillRequiredText: { color: '#225E9D' }, skillPreferredText: { color: '#1769B7' }, skill: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: '#FAFCFF' }, skillIcon: { width: 16, height: 16 }, skillText: { color: c.ink, fontSize: 11, fontWeight: '700' }, benefit: { minHeight: 46, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: '#E7EFFA', gap: 9 }, benefitIcon: { width: 27, height: 27, borderRadius: 7, backgroundColor: '#E4F1FF', alignItems: 'center', justifyContent: 'center' }, benefitCopy: { flex: 1, minWidth: 0, gap: 3 }, benefitTitle: { color: c.ink, fontSize: 12, fontWeight: '800' }, metric: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderColor: '#E7EFFA' }, metricValue: { color: c.ink, fontSize: 21, lineHeight: 26, fontWeight: '800' }, applicantHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#D7E6F8' }, tableCard: { padding: 0, overflow: 'visible' }, applicantRowMenuOpen: { zIndex: 20, elevation: 20 }, statusActionAnchor: { position: 'relative', zIndex: 30 }, statusPopover: { position: 'absolute', top: 36, right: 0, zIndex: 40, elevation: 40, width: 236, padding: 9, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, dropdownTitle: { color: c.muted, fontSize: 9, fontWeight: '800', marginBottom: 2 }, dropdownOption: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#FFF' }, dropdownOptionPressed: { backgroundColor: '#F1F5F9' }, dropdownOptionText: { color: c.ink, fontSize: 10, fontWeight: '700' }, dropdownHint: { color: c.muted, fontSize: 9, paddingVertical: 4 }, confirmOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.45)' }, confirmCard: { width: '100%', maxWidth: 420, padding: 18, borderRadius: 16, backgroundColor: '#FFF', gap: 10 }, confirmTitle: { color: c.ink, fontSize: 15, fontWeight: '900' }, confirmMessage: { color: c.muted, fontSize: 11, lineHeight: 17 }, confirmError: { color: c.rose, fontSize: 10 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }, confirmButton: { minWidth: 82, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 }, cancelButton: { borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF' }, saveButton: { backgroundColor: c.blue }, cancelText: { color: c.ink, fontSize: 10, fontWeight: '800' }, saveText: { color: '#FFF', fontSize: 10, fontWeight: '800' }, tableViewport: { width: '100%' }, applicantTable: { alignSelf: 'stretch', flexGrow: 1, width: '100%', minWidth: 0 }, applicantRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#E5EEFA', paddingHorizontal: 16 }, applicantHeader: { minHeight: 40, backgroundColor: '#E4EFFC', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomWidth: 1, borderBottomColor: '#D4E4F7' }, columnHeader: { color: '#3D5878', fontSize: 10, fontWeight: '700' }, applicantNameColumn: { flex: 3, minWidth: 0 }, appliedColumn: { flex: 1.5, minWidth: 0 }, statusColumn: { flex: 1.25, minWidth: 0 }, actionsColumn: { flex: 1.25, minWidth: 0 }, applicantIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 }, applicantTextBlock: { flex: 1, minWidth: 0, gap: 2 }, applicantCell: { color: '#3D5878', fontSize: 11 }, applicantActions: { flexDirection: 'row', gap: 7 }, smallAction: { width: 30, height: 29, borderWidth: 1, borderColor: '#D7E5F8', borderRadius: 7, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, disabledAction: { opacity: 0.5 }, cvModal: { flex: 1, backgroundColor: '#F6F9FD' }, cvModalHeader: { minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: c.line }, cvModalTitle: { color: c.ink, fontSize: 14, fontWeight: '900' }, cvModalContent: { paddingBottom: 24 }, closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F4FA', alignItems: 'center', justifyContent: 'center' }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E3EFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: c.blue, fontWeight: '900' }, applicantInfo: { flex: 1, minWidth: 0 }, applicantName: { color: c.ink, fontSize: 12, fontWeight: '700', marginBottom: 3 }, error: { color: c.rose, fontSize: 12 } });
