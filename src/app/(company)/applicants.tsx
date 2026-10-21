import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyJobApplicationStatusLabel, companyJobStatusLabel, companyJobWorkTypeLabel, formatCompanyDate, companyService, type CompanyApplicant, type CompanyJob, type CompanyJobApplicationStatus } from '@/services/company.service';

const statuses: CompanyJobApplicationStatus[] = [0, 1, 2, 3, 4];

export default function CompanyApplicants() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(typeof jobId === 'string' ? jobId : '');
  const [applicants, setApplicants] = useState<CompanyApplicant[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [applicantError, setApplicantError] = useState('');
  const [reload, setReload] = useState(0);
  const [applicantsReload, setApplicantsReload] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void companyService.listJobs({ page: 1, pageSize: 100 }, controller.signal)
      .then(result => {
        const availableJobs = result.jobs.filter(job => job.status === 1 || job.applicantCount > 0);
        setJobs(availableJobs);
        setSelectedJobId(current => {
          const requestedId = typeof jobId === 'string' ? jobId : current;
          return availableJobs.some(job => job.id === requestedId) ? requestedId : availableJobs[0]?.id ?? '';
        });
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được bài đăng.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, reload]));

  const selectedJob = useMemo(() => jobs.find(job => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) { setApplicants([]); return; }
    const controller = new AbortController();
    setApplicantsLoading(true);
    setApplicantError('');
    void companyService.listApplicants(selectedJobId, controller.signal)
      .then(setApplicants)
      .catch(cause => { if (!controller.signal.aborted) setApplicantError(cause instanceof Error ? cause.message : 'Không tải được danh sách ứng viên.'); })
      .finally(() => { if (!controller.signal.aborted) setApplicantsLoading(false); });
    return () => controller.abort();
  }, [selectedJobId, applicantsReload]);

  const updateStatus = async (applicant: CompanyApplicant, status: CompanyJobApplicationStatus) => {
    if (!selectedJobId || updatingId) return;
    setUpdatingId(applicant.id);
    setApplicantError('');
    try {
      const updated = await companyService.updateApplicantStatus(selectedJobId, applicant.id, status);
      setApplicants(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (cause) {
      setApplicantError(cause instanceof Error ? cause.message : 'Không cập nhật được trạng thái hồ sơ.');
    } finally { setUpdatingId(null); }
  };

  const pendingCount = applicants.filter(item => item.status === 0).length;
  const interviewCount = applicants.filter(item => item.status === 2).length;

  return <CompanyPage><PageScroll>
    <View style={s.topline}><View style={s.brandMark}><CompanyIcon name={{ ios: 'building.2.fill', android: 'business', web: 'business' }} color="#FFF" size={17} /></View><Text style={s.brand}>UniNet <Text style={s.caption}>CAREER HUB</Text></Text></View>
    <PageTitle title="Ứng viên của bài đăng" subtitle="Xem hồ sơ và cập nhật trạng thái theo từng bài đăng." />

    {loading ? <Card style={s.stateCard}><ActivityIndicator color={c.blue} /><Text style={s.stateText}>Đang tải bài đăng…</Text></Card> : null}
    {!!error && <Card style={s.stateCard}><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" variant="outline" onPress={() => setReload(value => value + 1)} /></Card>}
    {!loading && !error && jobs.length === 0 && <Card style={s.stateCard}><View style={s.emptyIcon}><CompanyIcon name={{ ios: 'briefcase', android: 'work_outline', web: 'work_outline' }} size={22} color={c.blue} /></View><Text style={s.emptyTitle}>Chưa có bài đăng tuyển dụng</Text><Text style={s.stateText}>Khi bạn đăng bài, bài đăng sẽ xuất hiện tại đây để xem ứng viên.</Text><ActionButton title="Tạo bài đăng" onPress={() => router.push('/(company)/create')} /></Card>}

    {!loading && !error && selectedJob && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: pickerOpen }} onPress={() => setPickerOpen(value => !value)} style={s.jobPicker}>
        <View style={s.codeIcon}><CompanyIcon name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} color={c.blue} /></View>
        <View style={s.jobInfo}><Text style={s.jobTitle}>{selectedJob.title}</Text><Text style={s.jobSub}>{companyJobWorkTypeLabel[selectedJob.workType]} · {selectedJob.location || 'Chưa có địa điểm'}</Text><View style={s.metaRow}><Tag tone="green">{companyJobStatusLabel[selectedJob.status]}</Tag><Text style={s.meta}>Hạn ứng tuyển: {formatCompanyDate(selectedJob.deadline)}</Text></View></View>
        <CompanyIcon name={{ ios: pickerOpen ? 'chevron.up' : 'chevron.down', android: pickerOpen ? 'expand_less' : 'expand_more', web: pickerOpen ? 'expand_less' : 'expand_more' }} size={17} color={c.muted} />
      </Pressable>
      {pickerOpen && <Card style={s.jobOptions}>{jobs.map(job => <Pressable key={job.id} onPress={() => { setSelectedJobId(job.id); setPickerOpen(false); }} style={[s.jobOption, job.id === selectedJob.id && s.jobOptionActive]}><View style={s.jobOptionText}><Text style={s.jobTitle}>{job.title}</Text><Text style={s.jobSub}>{job.applicantCount} ứng viên · {formatCompanyDate(job.deadline)}</Text></View>{job.id === selectedJob.id && <CompanyIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} color={c.blue} size={18} />}</Pressable>)}</Card>}

      <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{applicantsLoading ? '—' : applicants.length}</Text><Text style={s.statLabel}>Ứng viên</Text></View><View style={s.stat}><Text style={s.statValue}>{applicantsLoading ? '—' : pendingCount}</Text><Text style={s.statLabel}>Chờ xem</Text></View><View style={s.stat}><Text style={s.statValue}>{applicantsLoading ? '—' : interviewCount}</Text><Text style={s.statLabel}>Phỏng vấn</Text></View></View>

      {applicantsLoading ? <Card style={s.stateCard}><ActivityIndicator color={c.blue} /><Text style={s.stateText}>Đang tải hồ sơ ứng viên…</Text></Card> : null}
      {!!applicantError && <Card style={s.stateCard}><Text style={s.error}>{applicantError}</Text><ActionButton title="Tải lại hồ sơ" variant="outline" onPress={() => setApplicantsReload(value => value + 1)} /></Card>}
      {!applicantsLoading && !applicantError && applicants.length === 0 && <Card style={s.stateCard}><View style={s.emptyIcon}><CompanyIcon name={{ ios: 'person.2', android: 'groups', web: 'groups' }} size={22} color={c.blue} /></View><Text style={s.emptyTitle}>Chưa có ứng viên</Text><Text style={s.stateText}>Hồ sơ sẽ xuất hiện tại đây khi có sinh viên ứng tuyển bài đăng này.</Text></Card>}
      {!applicantsLoading && !applicantError && applicants.map(applicant => <Card key={applicant.id} style={s.applicantCard}>
        <View style={s.applicantHead}>
          {applicant.avatarUrl ? <Image source={{ uri: applicant.avatarUrl }} style={s.avatar} /> : <View style={[s.avatar, s.avatarFallback]}><Text style={s.avatarText}>{applicant.fullName.trim().charAt(0).toUpperCase() || 'S'}</Text></View>}
          <View style={s.applicantInfo}><Text style={s.applicantName}>{applicant.fullName}</Text><Text style={s.jobSub}>{[applicant.major, applicant.universityName].filter(Boolean).join(' · ') || 'Sinh viên UniNet'}</Text><Text style={s.meta}>Ứng tuyển {formatCompanyDate(applicant.appliedAt)}</Text></View>
          <Tag tone={applicant.status === 3 ? 'green' : applicant.status === 4 ? 'rose' : applicant.status === 2 ? 'purple' : 'gray'}>{companyJobApplicationStatusLabel[applicant.status]}</Tag>
        </View>
        {!!applicant.coverMessage && <View style={s.message}><Text style={s.messageLabel}>LỜI NHẮN</Text><Text style={s.messageText}>{applicant.coverMessage}</Text></View>}
        {applicant.aiMatchScore != null && <Text style={s.match}>Điểm phù hợp: {Math.round(applicant.aiMatchScore)}%</Text>}
        <Text style={s.statusLabel}>CẬP NHẬT TRẠNG THÁI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusOptions}>
          {statuses.map(status => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: status === applicant.status, disabled: updatingId === applicant.id }} disabled={updatingId === applicant.id} onPress={() => void updateStatus(applicant, status)} style={[s.statusOption, status === applicant.status && s.statusOptionActive]}><Text style={[s.statusOptionText, status === applicant.status && s.statusOptionTextActive]}>{companyJobApplicationStatusLabel[status]}</Text></Pressable>)}
        </ScrollView>
        {updatingId === applicant.id && <View style={s.updating}><ActivityIndicator size="small" color={c.blue} /><Text style={s.meta}>Đang cập nhật…</Text></View>}
      </Card>)}
    </>}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  topline: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 7 }, brandMark: { width: 27, height: 27, borderRadius: 8, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }, brand: { color: c.ink, fontSize: 13, fontWeight: '900', flex: 1 }, caption: { color: c.blue, fontSize: 7 },
  jobPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, codeIcon: { width: 36, height: 36, backgroundColor: '#EAF3FF', borderRadius: 11, justifyContent: 'center', alignItems: 'center' }, jobInfo: { flex: 1, gap: 3 }, jobTitle: { color: c.ink, fontSize: 11, fontWeight: '900' }, jobSub: { color: c.muted, fontSize: 9, lineHeight: 14 }, metaRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 3 }, meta: { color: c.muted, fontSize: 8 }, jobOptions: { paddingVertical: 4, gap: 0 }, jobOption: { minHeight: 52, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line }, jobOptionActive: { backgroundColor: '#F4F8FF' }, jobOptionText: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: 7 }, stat: { flex: 1, minHeight: 58, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 3 }, statValue: { color: c.ink, fontSize: 16, fontWeight: '900' }, statLabel: { color: c.muted, fontSize: 8 }, stateCard: { alignItems: 'center', gap: 8, paddingVertical: 20 }, emptyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: c.ink, fontSize: 12, fontWeight: '900', textAlign: 'center' }, stateText: { color: c.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' }, error: { color: c.rose, fontSize: 11, textAlign: 'center' },
  applicantCard: { padding: 12, gap: 10 }, applicantHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EAF3FF' }, avatarFallback: { alignItems: 'center', justifyContent: 'center' }, avatarText: { color: c.blue, fontSize: 17, fontWeight: '900' }, applicantInfo: { flex: 1, gap: 2 }, applicantName: { color: c.ink, fontSize: 12, fontWeight: '900' }, message: { padding: 10, borderRadius: 10, backgroundColor: '#F5F8FC', gap: 4 }, messageLabel: { color: c.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 }, messageText: { color: c.ink, fontSize: 10, lineHeight: 15 }, match: { color: c.blue, fontSize: 10, fontWeight: '700' }, statusLabel: { color: c.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }, statusOptions: { gap: 6 }, statusOption: { minHeight: 29, borderWidth: 1, borderColor: c.line, borderRadius: 15, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, statusOptionActive: { backgroundColor: '#EAF3FF', borderColor: '#9EC5FF' }, statusOptionText: { color: c.muted, fontSize: 9, fontWeight: '700' }, statusOptionTextActive: { color: c.blue }, updating: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
