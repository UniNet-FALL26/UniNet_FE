import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyService, companyJobStatusLabel, companyJobWorkTypeLabel, formatCompanyDate, formatCompanySalary, type CompanyJob, type CompanyJobsPage, type CompanyJobStatus } from '@/services/company.service';

const filters = ['Tất cả', 'Đã đăng', 'Bản nháp', 'Đã đóng', 'Hết hạn'];
const statusTone = { 0: 'gray', 1: 'green', 2: 'gray', 3: 'amber' } as const;

export default function CompanyJobs() {
  const [filter, setFilter] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<CompanyJobsPage | null>(null);
  const [visibleJobs, setVisibleJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const statuses: Record<string, CompanyJobStatus | undefined> = {
        'Tất cả': undefined, 'Đã đăng': 1, 'Bản nháp': 0, 'Đã đóng': 2, 'Hết hạn': 3,
      };
      void companyService.listJobs({ status: statuses[filter], keyword: query, page: 1, pageSize: 100 }, controller.signal)
        .then(result => { setData(result); setVisibleJobs(result.jobs); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được bài tuyển dụng.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filter, query, reload]));

  const deleteJob = (job: CompanyJob) => Alert.alert('Xóa bài tuyển dụng?', `Bạn muốn xóa “${job.title}”?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => {
      void companyService.deleteJob(job.id)
        .then(() => setReload(value => value + 1))
        .catch(cause => Alert.alert('Không xóa được bài đăng', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'));
    } },
  ]);

  const closeJob = (job: CompanyJob) => Alert.alert('Đóng bài tuyển dụng?', `Bài “${job.title}” sẽ không còn nhận hồ sơ mới.`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Đóng bài', onPress: () => {
      void companyService.updateJobStatus(job.id, 2)
        .then(() => setReload(value => value + 1))
        .catch(cause => Alert.alert('Không cập nhật được trạng thái', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'));
    } },
  ]);

  return <CompanyPage><PageScroll>
    <View style={s.headingRow}><PageTitle title="Quản lý bài đăng" subtitle="Theo dõi các cơ hội và hồ sơ ứng tuyển." /><Pressable onPress={() => router.push('/(company)/create')} style={s.addButton}><CompanyIcon name={{ ios: 'plus', android: 'add', web: 'add' }} color="#FFF" /></Pressable></View>
    <View style={s.summary}><Text style={s.summaryTitle}>Bài đăng tuyển dụng</Text><Text style={s.summaryCopy}>{data ? `${data.totalJobs} bài đăng` : 'Đang tải dữ liệu công ty…'}</Text><View style={s.summaryTiles}>{[{n:String(data?.publishedJobs ?? 0),l:'Đang tuyển'}, {n:String(data?.draftJobs ?? 0),l:'Bản nháp'}, {n:String(data?.closingSoonJobs ?? 0),l:'Sắp hết hạn'}].map((x) => <View style={s.summaryTile} key={x.l}><Text style={s.tileValue}>{x.n}</Text><Text style={s.tileLabel}>{x.l}</Text></View>)}</View></View>
    <View style={s.search}><CompanyIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={c.muted} size={16} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tiêu đề bài đăng..." placeholderTextColor={c.muted} style={s.searchInput} /></View>
    <View style={s.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[s.filterChip, filter === item && s.filterActive]}><Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={s.count}>{loading ? 'Đang tải bài đăng…' : `${data?.totalItems ?? visibleJobs.length} bài đăng`}</Text>
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!loading && !error && visibleJobs.length === 0 && <Card><Text style={s.emptyTitle}>Chưa có bài đăng phù hợp</Text><Text style={s.emptyText}>Thử đổi bộ lọc hoặc tạo một bài tuyển dụng mới.</Text></Card>}
    {visibleJobs.map((job) => <Card key={job.id} style={s.jobCard}><View style={s.cardTitleRow}><Text style={s.jobTitle}>{job.title}</Text><Tag tone={statusTone[job.status]}>{companyJobStatusLabel[job.status]}</Tag></View><Text style={s.jobSubtitle}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text><Text style={s.jobSubtitle}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text><View style={s.metaGrid}><View><Text style={s.metaLabel}>Hạn ứng tuyển</Text><Text style={s.metaValue}>{formatCompanyDate(job.deadline)}</Text></View><View><Text style={s.metaLabel}>Ứng viên</Text><Text style={s.metaValue}>{job.applicantCount} hồ sơ</Text></View><View><Text style={s.metaLabel}>Cập nhật</Text><Text style={s.metaValue}>{formatCompanyDate(job.updatedAt)}</Text></View></View><View style={s.buttons}>{job.applicantCount > 0 && <ActionButton title="Ứng viên" onPress={() => router.push('/(company)/applicants')} variant="outline" icon={{ ios: 'person.2', android: 'groups', web: 'groups' }} />}{job.status === 0 ? <ActionButton title="Tiếp tục sửa" onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })} icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} /> : <><ActionButton title="Sửa" onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })} variant="outline" icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} />{job.status === 1 && <ActionButton title="Đóng" onPress={() => closeJob(job)} variant="outline" />}</>}<ActionButton title="Xóa" onPress={() => deleteJob(job)} variant="outline" /></View></Card>)}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, summary: { backgroundColor: c.purple, padding: 14, borderRadius: 17, gap: 5 }, summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' }, summaryCopy: { color: 'rgba(255,255,255,0.84)', fontSize: 10 }, summaryTiles: { flexDirection: 'row', gap: 7, marginTop: 8 }, summaryTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.17)', padding: 10, borderRadius: 11 }, tileValue: { color: '#FFF', fontSize: 18, fontWeight: '900' }, tileLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 9, marginTop: 3 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderColor: c.line, borderWidth: 1, borderRadius: 12, minHeight: 43, paddingHorizontal: 11 }, searchInput: { flex: 1, fontSize: 11, color: c.ink, paddingVertical: 8 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filterChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line }, filterActive: { backgroundColor: c.purpleSoft, borderColor: c.purpleSoft }, filterText: { color: c.muted, fontSize: 9, fontWeight: '700' }, filterTextActive: { color: c.purple }, count: { color: c.muted, fontSize: 10 }, jobCard: { gap: 10 }, cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, justifyContent: 'space-between' }, jobTitle: { flex: 1, color: c.ink, fontSize: 12, fontWeight: '900' }, jobSubtitle: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: -5 }, metaGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }, metaLabel: { color: c.muted, fontSize: 9 }, metaValue: { color: c.ink, fontSize: 10, fontWeight: '800', marginTop: 4 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, error: { color: c.rose, fontSize: 11, marginBottom: 8 }, emptyTitle: { color: c.ink, fontSize: 12, fontWeight: '800' }, emptyText: { color: c.muted, fontSize: 10, marginTop: 4 } });
