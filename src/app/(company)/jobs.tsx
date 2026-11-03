import { ActionButton, companyColors as c, Card, CompanyIcon, CompanyPage, PageScroll, Tag } from '@/components/company/company-ui';
import { jobApplicationIcons as jobIcons } from '@/constants/job-applicant-icons';
import { companyJobEmploymentTypeLabel, companyJobStatusLabel, companyJobWorkTypeLabel, companyService, formatCompanyDate, formatCompanySalary, type CompanyJob, type CompanyJobsPage, type CompanyJobStatus } from '@/services/company.service';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

const filters = ['Tất cả', 'Đang tuyển', 'Bản nháp', 'Đã đóng', 'Hết hạn'];
const statusTone = { 0: 'gray', 1: 'green', 2: 'gray', 3: 'amber' } as const;

export default function CompanyJobs() {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 960;
  const [filter, setFilter] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showPageSizes, setShowPageSizes] = useState(false);
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
        'Tất cả': undefined, 'Đang tuyển': 1, 'Bản nháp': 0, 'Đã đóng': 2, 'Hết hạn': 3,
      };
      void companyService.listJobs({ status: statuses[filter], keyword: query, page, pageSize }, controller.signal)
        .then(result => {
          if (controller.signal.aborted) return;
          if (page > Math.max(1, result.totalPages)) {
            setPage(Math.max(1, result.totalPages));
            return;
          }
          setData(result);
          setVisibleJobs(result.jobs);
        })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được bài tuyển dụng.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filter, query, page, pageSize, reload]));

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

  const totalItems = data?.totalItems ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return <CompanyPage><PageScroll contentStyle={[s.pageContent, !isWideWeb && s.pageContentCompact]}>
    <View style={[s.headingRow, !isWideWeb && s.headingCompact]}>
      <View style={s.headingMain}>
        <View style={s.headingIcon}><CompanyIcon name={{ ios: 'briefcase', android: 'work_outline', web: 'work_outline' }} size={23} color={c.blue} /></View>
        <View style={s.headingCopy}>
          <Text accessibilityRole="header" style={[s.pageTitle, !isWideWeb && s.pageTitleCompact]}>Quản lý bài đăng tuyển dụng</Text>
          <Text style={s.pageSubtitle}>Theo dõi, quản lý và xử lý các bài đăng tuyển dụng trên nền tảng.</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(company)/create')} style={s.addButton}>
        <CompanyIcon name={{ ios: 'plus', android: 'add', web: 'add' }} color="#FFF" size={18} />
        <Text style={s.addButtonText}>Tạo bài đăng tuyển dụng</Text>
      </Pressable>
    </View>
    <Card style={[s.panel, !isWideWeb && s.panelCompact, width < 600 && s.panelPhone]}>
      <View style={[s.toolbar, !isWideWeb && s.toolbarCompact]}>
        <View style={[s.search, !isWideWeb && s.searchCompact]}>
          <CompanyIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={c.ink} size={18} />
          <TextInput accessibilityLabel="Tìm bài đăng tuyển dụng" value={query} onChangeText={value => { if (value !== query) { setQuery(value); setPage(1); setLoading(true); } }} placeholder="Tìm theo tiêu đề bài đăng..." placeholderTextColor={c.muted} style={s.searchInput} />
        </View>
        <View style={s.filterWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel="Bộ lọc nâng cao" accessibilityValue={{ text: filter }} accessibilityState={{ expanded: showFilters }} onPress={() => { setShowFilters(value => !value); setShowPageSizes(false); }} style={[s.advancedButton, !isWideWeb && s.filterIconButton, (showFilters || filter !== 'Tất cả') && s.filterActive]}>
            <CompanyIcon name={{ ios: 'line.3.horizontal.decrease', android: 'filter_alt', web: 'filter_alt' }} size={17} color={filter === 'Tất cả' ? c.ink : c.blue} />
            {isWideWeb && <Text style={s.advancedText}>Bộ lọc nâng cao{filter !== 'Tất cả' ? ' (1)' : ''}</Text>}
            {isWideWeb && <CompanyIcon name={showFilters ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={15} color={c.muted} />}
          </Pressable>
          {showFilters && <View accessibilityRole="menu" accessibilityLabel="Trạng thái bài đăng" onAccessibilityEscape={() => setShowFilters(false)} style={s.filterMenu}>
            <Text style={s.filterLabel}>Trạng thái bài đăng</Text>
            {filters.map(item => <Pressable accessibilityRole="menuitem" accessibilityState={{ selected: filter === item }} key={item} onPress={() => { if (item !== filter) { setFilter(item); setPage(1); setLoading(true); } setShowFilters(false); }} style={[s.filterOption, filter === item && s.filterActive]}>
              <Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text>
              {filter === item && <CompanyIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={15} color={c.blue} />}
            </Pressable>)}
          </View>}
        </View>
      </View>
      {isWideWeb && <ScrollView horizontal contentContainerStyle={s.tableScroll}>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableHeader]}>{['Bài đăng tuyển dụng', 'Địa điểm', 'Mức lương', 'Hạn ứng tuyển', 'Ứng viên', 'Cập nhật', 'Trạng thái', 'Thao tác'].map((label, index) => <Text key={label} style={[s.tableHeadText, index === 0 ? s.colTitle : index === 2 ? s.colSalary : index === 6 ? s.colStatus : index === 7 ? s.colActions : s.col]}>{label}</Text>)}</View>
          {!loading && !error && visibleJobs.map(job => <View key={job.id} style={s.tableRow}>
            <View style={s.colTitle}>
              <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/(company)/job-detail' as never, params: { jobId: job.id } as never })}><Text style={s.jobTitle}>{job.title}</Text></Pressable>
              <Text style={s.jobSubtitle}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text>
            </View>
            <View style={[s.col, s.cell]}><CompanyIcon name={jobIcons.location} size={18} color={c.muted} /><Text style={s.cellText}>{job.location || '—'}</Text></View>
            <View style={[s.colSalary, s.cell]}><CompanyIcon name={jobIcons.salary} size={18} color={c.muted} /><Text style={s.cellText}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text></View>
            <View style={[s.col, s.cell]}><CompanyIcon name={jobIcons.deadline} size={18} color={c.muted} /><Text style={s.cellText}>{formatCompanyDate(job.deadline)}</Text></View>
            <Pressable accessibilityRole="link" accessibilityLabel={`Xem ${job.applicantCount} hồ sơ của ${job.title}`} style={[s.col, s.cell]} onPress={() => router.push({ pathname: '/(company)/job-detail', params: { jobId: job.id } })}><CompanyIcon name={jobIcons.applicants} size={17} color={c.blue} /><Text style={s.link}>{job.applicantCount} hồ sơ</Text></Pressable>
            <Text style={[s.col, s.cellText]}>{formatCompanyDate(job.updatedAt)}</Text>
            <View style={s.colStatus}><Tag tone={statusTone[job.status]}>{companyJobStatusLabel[job.status]}</Tag></View>
            <View style={[s.buttons, s.colActions]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Xem chi tiết bài đăng" style={s.iconButton} onPress={() => router.push({ pathname: '/(company)/job-detail' as never, params: { jobId: job.id } as never })}><CompanyIcon name={jobIcons.views} size={17} color={c.ink} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa bài đăng" style={s.iconButton} onPress={() => router.push({ pathname: '/(company)/create', params: { jobId: job.id } })}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={17} color={c.ink} /></Pressable>
              {job.status === 1 && <Pressable accessibilityRole="button" accessibilityLabel="Đóng bài đăng" style={s.iconButton} onPress={() => requestConfirmation('close', job)}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color={c.ink} /></Pressable>}
              {job.status === 2 && <Pressable accessibilityRole="button" accessibilityLabel="Mở lại bài đăng" style={s.iconButton} onPress={() => requestConfirmation('reopen', job)}><CompanyIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={18} color={c.ink} /></Pressable>}
              <Pressable accessibilityRole="button" accessibilityLabel="Xóa bài đăng" style={[s.iconButton, s.deleteButton]} onPress={() => requestConfirmation('delete', job)}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={17} color={c.rose} /></Pressable>
            </View>
          </View>)}
        </View>
      </ScrollView>}
      {loading ? <View style={s.stateBox}><Text accessibilityLiveRegion="polite" style={s.emptyText}>Đang tải bài đăng…</Text></View> : error ? <View style={s.stateBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></View> : visibleJobs.length === 0 ? <View style={s.stateBox}><Text style={s.emptyTitle}>Chưa có bài đăng phù hợp</Text><Text style={s.emptyText}>Thử đổi bộ lọc hoặc tạo một bài tuyển dụng mới.</Text></View> : isWideWeb ? null : visibleJobs.map((job) => <Pressable key={job.id} accessibilityRole="link" accessibilityLabel={`Xem chi tiết ${job.title}`} onPress={() => router.push({ pathname: '/(company)/job-detail', params: { jobId: job.id } })} style={({ pressed }) => pressed && s.jobCardPressed}><Card style={s.jobCard}><View style={s.cardTitleRow}><Text style={s.jobTitle}>{job.title}</Text><Tag tone={statusTone[job.status]}>{companyJobStatusLabel[job.status]}</Tag></View><Text style={s.jobSubtitle}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text><View style={s.jobTags}><Tag tone="purple">{companyJobEmploymentTypeLabel[job.employmentType]}</Tag><Tag tone="gray">{job.jobField || 'Chưa cập nhật lĩnh vực'}</Tag></View><Text style={s.jobSubtitle}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text><View style={s.metaGrid}><View><Text style={s.metaLabel}>Hạn ứng tuyển</Text><Text style={s.metaValue}>{formatCompanyDate(job.deadline)}</Text></View><View><Text style={s.metaLabel}>Ứng viên</Text><Text style={s.metaValue}>{job.applicantCount} hồ sơ</Text></View><View><Text style={s.metaLabel}>Cập nhật</Text><Text style={s.metaValue}>{formatCompanyDate(job.updatedAt)}</Text></View></View></Card></Pressable>)}
      <View style={[s.footer, !isWideWeb && s.footerCompact]}>
        <Text accessibilityLiveRegion="polite" style={s.footerText}>{loading ? 'Đang tải bài đăng…' : error ? 'Không tải được danh sách bài đăng' : `Hiển thị ${firstItem} – ${lastItem} trong tổng số ${totalItems} bài đăng`}</Text>
        <View style={s.pagination}>
          <View style={s.pageSizeWrap}>
            <Pressable accessibilityRole="button" accessibilityLabel="Số bài đăng mỗi trang" accessibilityState={{ expanded: showPageSizes }} onPress={() => setShowPageSizes(value => !value)} style={s.pageSizeButton}>
              <Text style={s.pageSizeText}>{pageSize} / trang</Text><CompanyIcon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={18} color={c.ink} />
            </Pressable>
            {showPageSizes && <View style={s.pageSizeMenu}>{[10, 20, 50].map(size => <Pressable key={size} accessibilityRole="button" accessibilityLabel={`${size} bài đăng mỗi trang`} accessibilityState={{ selected: size === pageSize }} onPress={() => { if (size !== pageSize) { setPageSize(size); setPage(1); setLoading(true); } setShowPageSizes(false); }} style={[s.pageSizeOption, size === pageSize && s.filterActive]}><Text style={s.pageSizeText}>{size} / trang</Text></Pressable>)}</View>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Trang trước" disabled={loading || !!error || page <= 1} style={[s.iconButton, (loading || !!error || page <= 1) && s.disabled]} onPress={() => { setPage(value => value - 1); setLoading(true); }}><CompanyIcon name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} color={c.ink} size={20} /></Pressable>
          <View accessibilityLabel={`Trang ${page} trên ${totalPages}`} style={s.currentPage}><Text style={s.currentPageText}>{page}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Trang sau" disabled={loading || !!error || page >= totalPages} style={[s.iconButton, (loading || !!error || page >= totalPages) && s.disabled]} onPress={() => { setPage(value => value + 1); setLoading(true); }}><CompanyIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} color={c.ink} size={20} /></Pressable>
        </View>
      </View>
    </Card>
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

const s = StyleSheet.create({
  pageContent: { gap: 20, paddingTop: 20, paddingHorizontal: 20 },
  pageContentCompact: { paddingHorizontal: 16, gap: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  headingCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 18 },
  headingMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: { width: 44, height: 44, borderRadius: 11, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: 4 },
  pageTitle: { color: c.ink, fontSize: 23, lineHeight: 30, fontWeight: '700' },
  pageTitleCompact: { fontSize: 20, lineHeight: 27 },
  pageSubtitle: { color: c.muted, fontSize: 12, lineHeight: 18 },
  addButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: c.blue, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  panel: { padding: 16, borderRadius: 18, gap: 0, boxShadow: '0px 4px 16px rgba(30, 80, 150, 0.04)' },
  panelCompact: { padding: 14, borderRadius: 18 },
  panelPhone: { padding: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent', boxShadow: 'none', elevation: 0 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 20, zIndex: 10 },
  toolbarCompact: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 16 },
  search: { flex: 1, maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderColor: c.line, borderWidth: 1, borderRadius: 8, minHeight: 40, paddingHorizontal: 12 },
  searchCompact: { maxWidth: '100%', flex: 1, minWidth: 0 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 12, color: c.ink, paddingVertical: 9 },
  advancedButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 8, backgroundColor: '#FFF' },
  advancedText: { color: c.ink, fontSize: 12, fontWeight: '600' },
  filterIconButton: { width: 40, height: 40, paddingHorizontal: 0 },
  filterWrap: { position: 'relative', zIndex: 20 },
  filterMenu: { position: 'absolute', top: 46, right: 0, width: 220, padding: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 10, boxShadow: '0px 8px 24px rgba(20, 40, 70, 0.12)', elevation: 8, zIndex: 20 },
  filterOption: { minHeight: 36, paddingHorizontal: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLabel: { color: c.muted, fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 8 },
  filterActive: { backgroundColor: c.purpleSoft, borderColor: c.purpleSoft },
  filterText: { color: c.ink, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: c.blue },
  tableScroll: { flexGrow: 1 },
  table: { flex: 1, minWidth: 1060 },
  tableRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 14, gap: 10, paddingVertical: 12 },
  tableHeader: { minHeight: 40, paddingVertical: 10, borderBottomWidth: 0, borderRadius: 6, backgroundColor: '#EAF1F9' },
  tableHeadText: { color: c.ink, fontSize: 12, fontWeight: '700' },
  colTitle: { flex: 2.1, minWidth: 170, gap: 5, justifyContent: 'center' },
  col: { flex: 1, minWidth: 85 },
  colSalary: { flex: 1.6, minWidth: 145 },
  colStatus: { width: 100, flexShrink: 0 },
  colActions: { width: 146, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cellText: { color: c.ink, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  iconButton: { width: 32, height: 34, borderRadius: 7, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  deleteButton: { backgroundColor: '#FFF5F5', borderColor: '#F6E5E5' },
  link: { color: c.blue, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  jobCard: { gap: 10, marginBottom: 12 },
  jobCardPressed: { opacity: 0.8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 18, paddingBottom: 2 },
  footerCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  footerText: { color: c.muted, fontSize: 12, lineHeight: 18 },
  pagination: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pageSizeWrap: { position: 'relative', marginRight: 10, zIndex: 2 },
  pageSizeButton: { minHeight: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.line, borderRadius: 8, backgroundColor: '#FFF' },
  pageSizeText: { color: c.ink, fontSize: 12, fontWeight: '600' },
  pageSizeMenu: { position: 'absolute', bottom: 44, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 4, gap: 2 },
  pageSizeOption: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 5 },
  currentPage: { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 8, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
  currentPageText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  stateBox: { minHeight: 96, gap: 10, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  error: { color: c.rose, fontSize: 13, lineHeight: 20 },
  emptyTitle: { color: c.ink, fontSize: 15, fontWeight: '700' },
  emptyText: { color: c.muted, fontSize: 13, lineHeight: 20 },
cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, justifyContent: 'space-between' }, jobTitle: { flex: 1, color: c.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' }, jobSubtitle: { color: c.muted, fontSize: 12, lineHeight: 18 }, jobTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, metaGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }, metaLabel: { color: c.muted, fontSize: 9 }, metaValue: { color: c.ink, fontSize: 10, fontWeight: '800', marginTop: 4 }, buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, confirmOverlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 }, confirmDialog: { width: '100%', maxWidth: 420, padding: 18, borderRadius: 16, backgroundColor: '#FFF', gap: 10 }, confirmTitle: { color: c.ink, fontSize: 15, fontWeight: '900' }, confirmMessage: { color: c.ink, fontSize: 12, lineHeight: 18 }, confirmError: { color: c.rose, fontSize: 11, lineHeight: 16 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }, confirmAction: { minHeight: 40, paddingHorizontal: 16, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, confirmClose: { backgroundColor: c.blue }, confirmDelete: { backgroundColor: c.rose }, confirmActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' } });
