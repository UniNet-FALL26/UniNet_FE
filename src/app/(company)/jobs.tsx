import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyService, companyJobStatusLabel, companyJobWorkTypeLabel, companyJobEmploymentTypeLabel, formatCompanyDate, formatCompanySalary, type CompanyJob, type CompanyJobsPage, type CompanyJobStatus } from '@/services/company.service';
import { jobApplicationIcons as jobIcons } from '@/constants/job-application-icons';

const filters = ['Tất cả', 'Đã đăng', 'Bản nháp', 'Đã đóng', 'Hết hạn'];
const statusTone = { 0: 'gray', 1: 'green', 2: 'gray', 3: 'amber' } as const;

export default function CompanyJobs() {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 960;
  const [filter, setFilter] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<CompanyJobsPage | null>(null);
  const [visibleJobs, setVisibleJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [confirmation, setConfirmation] = useState<{ action: 'close' | 'reopen' | 'delete'; job: CompanyJob } | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');

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

  const requestConfirmation = (action: 'close' | 'reopen' | 'delete', job: CompanyJob) => {
    setConfirmationError('');
    setConfirmation({ action, job });
  };

  const confirmJobAction = async () => {
    if (!confirmation || confirmationBusy) return;
    setConfirmationBusy(true);
    setConfirmationError('');
    try {
      if (confirmation.action === 'delete') await companyService.deleteJob(confirmation.job.id);
      else await companyService.updateJobStatus(confirmation.job.id, confirmation.action === 'close' ? 2 : 1);
      setConfirmation(null);
      setReload(value => value + 1);
    } catch (cause) {
      setConfirmationError(cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setConfirmationBusy(false);
    }
  };

  return <CompanyPage><PageScroll>
    <View style={s.headingRow}><PageTitle title="Quản lý bài đăng" subtitle="Theo dõi các cơ hội và hồ sơ ứng tuyển." /><Pressable onPress={() => router.push('/(company)/create')} style={s.addButton}><CompanyIcon name={{ ios: 'plus', android: 'add', web: 'add' }} color="#FFF" /></Pressable></View>
    <View style={s.summary}><Text style={s.summaryTitle}>Bài đăng tuyển dụng</Text><Text style={s.summaryCopy}>{data ? `${data.totalJobs} bài đăng` : 'Đang tải dữ liệu công ty…'}</Text><View style={s.summaryTiles}>{[{n:String(data?.publishedJobs ?? 0),l:'Đang tuyển'}, {n:String(data?.draftJobs ?? 0),l:'Bản nháp'}, {n:String(data?.closingSoonJobs ?? 0),l:'Sắp hết hạn'}].map((x) => <View style={s.summaryTile} key={x.l}><Text style={s.tileValue}>{x.n}</Text><Text style={s.tileLabel}>{x.l}</Text></View>)}</View></View>
    <View style={s.search}><CompanyIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={c.muted} size={16} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tiêu đề bài đăng..." placeholderTextColor={c.muted} style={s.searchInput} /></View>
    <View style={s.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[s.filterChip, filter === item && s.filterActive]}><Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={s.count}>{loading ? 'Đang tải bài đăng…' : `${data?.totalItems ?? visibleJobs.length} bài đăng`}</Text>
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!loading && !error && visibleJobs.length === 0 && <Card><Text style={s.emptyTitle}>Chưa có bài đăng phù hợp</Text><Text style={s.emptyText}>Thử đổi bộ lọc hoặc tạo một bài tuyển dụng mới.</Text></Card>}
    {isWideWeb && visibleJobs.length > 0 ? <Card style={s.tableCard}><View style={s.table}><View style={[s.tableRow, s.tableHeader]}>{['Bài đăng tuyển dụng', 'Địa điểm', 'Mức lương', 'Hạn ứng tuyển', 'Ứng viên', 'Cập nhật', 'Trạng thái', 'Thao tác'].map(label => <Text key={label} style={[s.tableHeadText, label === 'Bài đăng tuyển dụng' ? s.colTitle : label === 'Trạng thái' ? s.colStatus : label === 'Thao tác' ? s.colActions : s.col]}>{label}</Text>)}</View>{visibleJobs.map(job => <View key={job.id} style={s.tableRow}><View style={s.colTitle}><Pressable onPress={() => router.push({ pathname: '/(company)/job-detail' as never, params: { jobId: job.id } as never })}><Text style={s.jobTitle}>{job.title}</Text></Pressable><Text style={s.jobSubtitle}>{companyJobEmploymentTypeLabel[job.employmentType]} · {job.jobField || 'Chưa cập nhật lĩnh vực'}</Text></View><Text style={s.col}>{job.location || '—'}</Text><Text style={s.col}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text><Text style={s.col}>{formatCompanyDate(job.deadline)}</Text><Pressable style={s.col} onPress={() => router.push({ pathname: '/(company)/applicants', params: { jobId: job.id } })}><Text style={s.link}>{job.applicantCount} hồ sơ</Text></Pressable><Text style={s.col}>{formatCompanyDate(job.updatedAt)}</Text><View style={s.colStatus}><Tag tone={statusTone[job.status]}>{companyJobStatusLabel[job.status]}</Tag></View><View style={[s.buttons, s.colActions]}><Pressable accessibilityRole="button" accessibilityLabel="Xem chi tiết bài đăng" style={s.iconButton} onPress={() => router.push({ pathname: '/(company)/job-detail' as never, params: { jobId: job.id } as never })}><CompanyIcon name={jobIcons.views} size={16} color={c.ink} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa bài đăng" style={s.iconButton} onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} color={c.ink} /></Pressable>{job.status === 1 && <Pressable accessibilityRole="button" accessibilityLabel="Đóng bài đăng" style={s.iconButton} onPress={() => requestConfirmation('close', job)}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} color={c.ink} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Xóa bài đăng" style={[s.iconButton, s.deleteButton]} onPress={() => requestConfirmation('delete', job)}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View></View>)}</View></Card> : visibleJobs.map((job) => <Card key={job.id} style={s.jobCard}><View style={s.cardTitleRow}><Text style={s.jobTitle}>{job.title}</Text><Tag tone={statusTone[job.status]}>{companyJobStatusLabel[job.status]}</Tag></View><Text style={s.jobSubtitle}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text><View style={s.jobTags}><Tag tone="purple">{companyJobEmploymentTypeLabel[job.employmentType]}</Tag><Tag tone="gray">{job.jobField || 'Chưa cập nhật lĩnh vực'}</Tag></View><Text style={s.jobSubtitle}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text><View style={s.metaGrid}><View><Text style={s.metaLabel}>Hạn ứng tuyển</Text><Text style={s.metaValue}>{formatCompanyDate(job.deadline)}</Text></View><View><Text style={s.metaLabel}>Ứng viên</Text><Text style={s.metaValue}>{job.applicantCount} hồ sơ</Text></View><View><Text style={s.metaLabel}>Cập nhật</Text><Text style={s.metaValue}>{formatCompanyDate(job.updatedAt)}</Text></View></View><View style={s.buttons}><ActionButton title="Chi tiết" onPress={() => router.push({ pathname: '/(company)/job-detail' as never, params: { jobId: job.id } as never })} variant="outline" icon={jobIcons.views} />{job.status === 1 && <ActionButton title="Ứng viên" onPress={() => router.push({ pathname: '/(company)/applicants', params: { jobId: job.id } })} variant="outline" icon={jobIcons.applicants} />}{job.status === 0 ? <ActionButton title="Tiếp tục sửa" onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })} icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} /> : <><ActionButton title="Sửa" onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })} variant="outline" icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} />{job.status === 1 && <ActionButton title="Đóng" onPress={() => requestConfirmation('close', job)} variant="outline" />}{job.status === 2 && <ActionButton title="Mở lại" onPress={() => requestConfirmation('reopen', job)} variant="outline" />}</>}<ActionButton title="Xóa" onPress={() => requestConfirmation('delete', job)} variant="outline" /></View></Card>)}
  </PageScroll>
    {confirmation && <View style={s.confirmOverlay}>
      <View style={s.confirmDialog}>
        <Text style={s.confirmTitle}>{confirmation?.action === 'delete' ? 'Xóa bài tuyển dụng?' : confirmation?.action === 'reopen' ? 'Mở lại bài tuyển dụng?' : 'Đóng bài tuyển dụng?'}</Text>
        <Text style={s.confirmMessage}>{confirmation?.action === 'delete' ? `Bạn có chắc muốn xóa “${confirmation?.job.title}”? Thao tác này không thể hoàn tác.` : confirmation?.action === 'reopen' ? `Bài “${confirmation?.job.title}” sẽ được đăng lại và tiếp tục nhận hồ sơ. Bạn có muốn mở lại không?` : `Bài “${confirmation?.job.title}” sẽ ngừng nhận hồ sơ mới. Bạn có muốn đóng bài này không?`}</Text>
        {!!confirmationError && <Text accessibilityRole="alert" style={s.confirmError}>{confirmationError}</Text>}
        <View style={s.confirmActions}>
          <ActionButton title="Hủy" variant="outline" onPress={() => { if (!confirmationBusy) setConfirmation(null); }} />
          <Pressable accessibilityRole="button" disabled={confirmationBusy} onPress={() => void confirmJobAction()} style={[s.confirmAction, confirmation?.action === 'delete' ? s.confirmDelete : s.confirmClose]}>
            <Text style={s.confirmActionText}>{confirmationBusy ? 'Đang xử lý…' : confirmation?.action === 'delete' ? 'Xóa bài' : confirmation?.action === 'reopen' ? 'Mở lại bài' : 'Đóng bài'}</Text>
          </Pressable>
        </View>
      </View>
    </View>}
  </CompanyPage>;
}

const s = StyleSheet.create({ headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, summary: { backgroundColor: c.purple, padding: 14, borderRadius: 17, gap: 5 }, summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' }, summaryCopy: { color: 'rgba(255,255,255,0.84)', fontSize: 10 }, summaryTiles: { flexDirection: 'row', gap: 7, marginTop: 8 }, summaryTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.17)', padding: 10, borderRadius: 11 }, tileValue: { color: '#FFF', fontSize: 18, fontWeight: '900' }, tileLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 9, marginTop: 3 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderColor: c.line, borderWidth: 1, borderRadius: 12, minHeight: 43, paddingHorizontal: 11 }, searchInput: { flex: 1, fontSize: 11, color: c.ink, paddingVertical: 8 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filterChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line }, filterActive: { backgroundColor: c.purpleSoft, borderColor: c.purpleSoft }, filterText: { color: c.muted, fontSize: 9, fontWeight: '700' }, filterTextActive: { color: c.purple }, count: { color: c.muted, fontSize: 10 }, jobCard: { gap: 10 }, tableCard: { padding: 0, overflow: 'hidden' }, table: { width: '100%', minWidth: 900 }, tableRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 12, gap: 8 }, tableHeader: { minHeight: 43, backgroundColor: '#EAF1FA' }, tableHeadText: { color: c.ink, fontSize: 10, fontWeight: '900' }, colTitle: { flex: 2, minWidth: 150, gap: 6, justifyContent: 'center' }, col: { flex: 1, minWidth: 80, color: c.ink, fontSize: 10 }, colStatus: { width: 90, alignItems: 'flex-start' }, colActions: { width: 170, alignItems: 'center' }, iconButton: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, deleteButton: { backgroundColor: '#FFF5F5' }, link: { color: c.blue, fontSize: 10, fontWeight: '800' }, cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, justifyContent: 'space-between' }, jobTitle: { flex: 1, color: c.ink, fontSize: 12, fontWeight: '900' }, jobSubtitle: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: -5 }, jobTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, metaGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }, metaLabel: { color: c.muted, fontSize: 9 }, metaValue: { color: c.ink, fontSize: 10, fontWeight: '800', marginTop: 4 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, error: { color: c.rose, fontSize: 11, marginBottom: 8 }, emptyTitle: { color: c.ink, fontSize: 12, fontWeight: '800' }, emptyText: { color: c.muted, fontSize: 10, marginTop: 4 }, confirmOverlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 }, confirmDialog: { width: '100%', maxWidth: 420, padding: 18, borderRadius: 16, backgroundColor: '#FFF', gap: 10 }, confirmTitle: { color: c.ink, fontSize: 15, fontWeight: '900' }, confirmMessage: { color: c.ink, fontSize: 12, lineHeight: 18 }, confirmError: { color: c.rose, fontSize: 11, lineHeight: 16 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }, confirmAction: { minHeight: 40, paddingHorizontal: 16, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, confirmClose: { backgroundColor: c.blue }, confirmDelete: { backgroundColor: c.rose }, confirmActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' } });
