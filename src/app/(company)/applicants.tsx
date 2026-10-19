import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyJobStatusLabel, companyJobWorkTypeLabel, formatCompanyDate, companyService, type CompanyJob } from '@/services/company.service';

export default function CompanyApplicants() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(typeof jobId === 'string' ? jobId : '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void companyService.listJobs({ page: 1, pageSize: 100 }, controller.signal)
      .then(result => {
        const publishedJobs = result.jobs.filter(job => job.status === 1);
        setJobs(publishedJobs);
        setSelectedJobId(current => {
          const requestedId = typeof jobId === 'string' ? jobId : current;
          return publishedJobs.some(job => job.id === requestedId) ? requestedId : publishedJobs[0]?.id ?? '';
        });
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được bài đăng.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, reload]));

  const selectedJob = useMemo(() => jobs.find(job => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  return <CompanyPage><PageScroll>
    <View style={s.topline}><View style={s.brandMark}><CompanyIcon name={{ ios: 'building.2.fill', android: 'business', web: 'business' }} color="#FFF" size={17} /></View><Text style={s.brand}>UniNet <Text style={s.caption}>CAREER HUB</Text></Text></View>
    <PageTitle title="Ứng viên của bài đăng" subtitle="Xem và quản lý hồ sơ ứng tuyển theo từng bài đăng." />

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

      <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{selectedJob.applicantCount}</Text><Text style={s.statLabel}>Ứng viên</Text></View><View style={s.stat}><Text style={s.statValue}>—</Text><Text style={s.statLabel}>Đang xử lý</Text></View><View style={s.stat}><Text style={s.statValue}>—</Text><Text style={s.statLabel}>Đã xem</Text></View></View>

      {selectedJob.applicantCount === 0 ? <Card style={s.stateCard}><View style={s.emptyIcon}><CompanyIcon name={{ ios: 'person.2', android: 'groups', web: 'groups' }} size={22} color={c.blue} /></View><Text style={s.emptyTitle}>Chưa có ứng viên</Text><Text style={s.stateText}>Bài đăng này chưa nhận được hồ sơ ứng tuyển. Hồ sơ sẽ xuất hiện tại đây khi có người ứng tuyển.</Text></Card> : <Card style={s.stateCard}><Text style={s.emptyTitle}>Chưa tải được danh sách ứng viên</Text><Text style={s.stateText}>BE hiện chưa công khai API danh sách và trạng thái hồ sơ ứng tuyển trong Swagger. Tổng số hồ sơ của bài đăng là {selectedJob.applicantCount}.</Text></Card>}
    </>}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  topline: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 7 }, brandMark: { width: 27, height: 27, borderRadius: 8, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }, brand: { color: c.ink, fontSize: 13, fontWeight: '900', flex: 1 }, caption: { color: c.blue, fontSize: 7 },
  jobPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, codeIcon: { width: 36, height: 36, backgroundColor: '#EAF3FF', borderRadius: 11, justifyContent: 'center', alignItems: 'center' }, jobInfo: { flex: 1, gap: 3 }, jobTitle: { color: c.ink, fontSize: 11, fontWeight: '900' }, jobSub: { color: c.muted, fontSize: 9, lineHeight: 14 }, metaRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 3 }, meta: { color: c.muted, fontSize: 8 }, jobOptions: { paddingVertical: 4, gap: 0 }, jobOption: { minHeight: 52, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line }, jobOptionActive: { backgroundColor: '#F4F8FF' }, jobOptionText: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: 7 }, stat: { flex: 1, minHeight: 58, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 3 }, statValue: { color: c.ink, fontSize: 16, fontWeight: '900' }, statLabel: { color: c.muted, fontSize: 8 }, stateCard: { alignItems: 'center', gap: 8, paddingVertical: 20 }, emptyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: c.ink, fontSize: 12, fontWeight: '900', textAlign: 'center' }, stateText: { color: c.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' }, error: { color: c.rose, fontSize: 11, textAlign: 'center' },
});
