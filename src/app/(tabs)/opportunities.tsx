import { opportunitiesService, type OpportunityJob, type OpportunityView, type OpportunityWorkType, type SubmittedApplication } from '@/services/opportunities.service';
import { colors } from '@/constants/colors';
import { portfolioService } from '@/services/portfolio.service';
import type { PortfolioResponse } from '@/types/portfolio';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';

const workModes: { value: OpportunityWorkType | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả hình thức' },
  { value: 0, label: 'Tại văn phòng' },
  { value: 1, label: 'Kết hợp' },
  { value: 2, label: 'Từ xa' },
];
const views: { value: OpportunityView; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'saved', label: 'Đã lưu' },
  { value: 'applied', label: 'Đã ứng tuyển' },
];
function applicationStatusInfo(status: number | null) {
  switch (status) {
    case 0: return { label: 'Chờ xem', tone: 'amber' as const };
    case 1: return { label: 'Đã xem', tone: 'blue' as const };
    case 2: return { label: 'Phỏng vấn', tone: 'blue' as const };
    case 3: return { label: 'Đã nhận', tone: 'green' as const };
    case 4: return { label: 'Đã từ chối', tone: 'rose' as const };
    default: return { label: 'Đã ứng tuyển', tone: 'green' as const };
  }
}
export default function OpportunitiesScreen() {
  const { jobId: requestedJobId, tab: requestedTab } = useLocalSearchParams<{ jobId?: string; tab?: string }>();
  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<OpportunityJob | null>(null);
  const [myPortfolio, setMyPortfolio] = useState<PortfolioResponse | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [reapplyConfirmOpen, setReapplyConfirmOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const [submittedApplications, setSubmittedApplications] = useState<SubmittedApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const selectedSubmittedApplication = submittedApplications.find(application => application.id === selectedApplicationId) ?? null;
  const [view, setView] = useState<OpportunityView>('all');
  const [workType, setWorkType] = useState<OpportunityWorkType | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [coverMessage, setCoverMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [scholarshipsSelected, setScholarshipsSelected] = useState(false);
  const [error, setError] = useState('');
  const listRequest = useRef<AbortController | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const submittedCv = selectedSubmittedApplication?.submittedPortfolio ?? null;
  const submittedCvTemplate = getProfileTemplate(submittedCv?.portfolio.appearance.profile.template);
  const submittedCvTheme = getProfileTheme(submittedCvTemplate.id, submittedCv?.portfolio.appearance.profile.theme);
  const [snapshotFrameWidth, setSnapshotFrameWidth] = useState(0);

  const loadJobs = useCallback(async (pageNumber = 1, append = false, pull = false) => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    if (pull) setRefreshing(true);
    else if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const result = await opportunitiesService.list({ view, keyword, workType, page: pageNumber, pageSize: 15 }, controller.signal);
      if (controller.signal.aborted) return;
      setJobs(current => append ? [...current, ...result.jobs] : result.jobs);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được cơ hội. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [keyword, view, workType]);

  useFocusEffect(useCallback(() => {
    if (requestedTab === 'applications') setView('applied');
    if (!requestedJobId) return;
    const controller = new AbortController();
    setError('');
    opportunitiesService.get(requestedJobId, controller.signal).then(job => {
      if (!controller.signal.aborted) { setSelectedJob(job); setCoverMessage(''); }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Nội dung đã bị xóa hoặc bạn không còn quyền truy cập.'); });
    return () => controller.abort();
  }, [requestedJobId, requestedTab]));

  useFocusEffect(useCallback(() => {
    if (!scholarshipsSelected) void loadJobs(1);
    return () => listRequest.current?.abort();
  }, [loadJobs, scholarshipsSelected]));

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void portfolioService.getMine(controller.signal).then(portfolio => {
      setMyPortfolio(portfolio);
      setSelectedPortfolioId(portfolio.profile.id);
    }).catch(() => setMyPortfolio(null));
    return () => controller.abort();
  }, []));

  const changeView = (next: OpportunityView) => { setView(next); };
  const changeWorkType = (next: OpportunityWorkType | undefined) => { setWorkType(next); };
  const openJob = async (job: OpportunityJob) => {
    setError('');
    setSelectedJob(job);
    setCoverMessage('');
    try { setSelectedJob(await opportunitiesService.get(job.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải được chi tiết cơ hội.'); }
  };

  const toggleSaved = async (job: OpportunityJob) => {
    if (savingId) return;
    setSavingId(job.id);
    try {
      if (job.isSaved) await opportunitiesService.unsave(job.id);
      else await opportunitiesService.save(job.id);
      const isSaved = !job.isSaved;
      setJobs(current => view === 'saved' && !isSaved ? current.filter(item => item.id !== job.id) : current.map(item => item.id === job.id ? { ...item, isSaved } : item));
      setSelectedJob(current => current?.id === job.id ? { ...current, isSaved } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được danh sách đã lưu.');
    } finally { setSavingId(null); }
  };

  const applyToJob = async () => {
    if (!selectedJob || applying || (selectedJob.isApplied && selectedJob.applicationStatus !== 4)) return;
    setApplying(true);
    setError('');
    try {
      await opportunitiesService.apply(selectedJob.id, coverMessage);
      const appliedAt = new Date().toISOString();
      setSelectedJob(current => current ? { ...current, isApplied: true, applicationStatus: 0, appliedAt } : current);
      setJobs(current => current.map(job => job.id === selectedJob.id ? { ...job, isApplied: true, applicationStatus: 0, appliedAt } : job));
      setCoverMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được hồ sơ. Vui lòng thử lại.');
    } finally { setApplying(false); }
  };

  const openSubmittedSnapshot = async () => {
    if (!selectedJob) return;
    setSnapshotOpen(true);
    setSnapshotLoading(true);
    setSnapshotError('');
    try {
      const applications = await opportunitiesService.getOwnApplications(selectedJob.id);
      setSubmittedApplications(applications);
      setSelectedApplicationId(applications[applications.length - 1]?.id ?? null);
    } catch (cause) {
      setSnapshotError(cause instanceof Error ? cause.message : 'Chưa tải được CV đã nộp.');
    } finally { setSnapshotLoading(false); }
  };

  const salary = (job: OpportunityJob) => {
    const format = (amount: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount / 1_000_000);
    if (job.minSalaryVnd == null && job.maxSalaryVnd == null) return 'Thỏa thuận';
    if (job.minSalaryVnd != null && job.maxSalaryVnd != null) return `${format(job.minSalaryVnd)}–${format(job.maxSalaryVnd)} triệu VND/tháng`;
    return `${format(job.minSalaryVnd ?? job.maxSalaryVnd!)} triệu VND/tháng`;
  };

  const skillMatch = (job: OpportunityJob) => {
    const portfolioSkills = new Set((myPortfolio?.portfolio.skills ?? []).map(skill => skill.name.trim().toLocaleLowerCase()));
    const required = job.skills.filter(skill => skill.requirementType === 0);
    const matchedRequired = required.filter(skill => portfolioSkills.has(skill.name.trim().toLocaleLowerCase())).length;
    const preferred = job.skills.filter(skill => skill.requirementType === 1);
    const matchedPreferred = preferred.filter(skill => portfolioSkills.has(skill.name.trim().toLocaleLowerCase())).length;
    return { required, preferred, matchedRequired, matchedPreferred, hasPortfolio: !!myPortfolio };
  };
  const skillMatchSummary = (job: OpportunityJob) => {
    const match = skillMatch(job);
    const required = `${match.matchedRequired}/${match.required.length} kỹ năng cần có`;
    return match.preferred.length ? `${required} · ${match.matchedPreferred}/${match.preferred.length} kỹ năng ưu tiên` : required;
  };

  const renderJob = (job: OpportunityJob) => <View key={job.id} style={styles.jobCard}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${job.title} tại ${job.companyName}`} onPress={() => void openJob(job)} style={({ pressed }) => [styles.jobMain, pressed && styles.pressed]}>
      <View style={styles.jobHeading}>
        <CompanyMark avatarUrl={job.companyAvatarUrl} companyName={job.companyName} />
        <View style={styles.jobHeadingText}>
          <View style={styles.companyLine}><Text numberOfLines={1} style={styles.companyName}>{job.companyName}</Text>{job.companyIsVerified && <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }} size={14} tintColor={colors.primary} />}</View>
          <Text numberOfLines={2} style={styles.jobTitle}>{job.title}</Text>
          {!!job.companyIndustry && <Text numberOfLines={1} style={styles.industry}>{job.companyIndustry}</Text>}
        </View>
        {job.isApplied && <Pill label={applicationStatusInfo(job.applicationStatus).label} tone={applicationStatusInfo(job.applicationStatus).tone} />}
      </View>
      <View style={styles.metaRow}>
        <LocationPill text={job.location || 'Địa điểm linh hoạt'} />
        <Pill label={workModes[job.workType + 1]?.label ?? 'Linh hoạt'} tone="blue" />
        <Pill label={salary(job)} tone="green" />
      </View>
      {!!job.skills.length && <View style={styles.jobSkillGroups}>{[0, 1].map(requirementType => {
        const skills = job.skills.filter(skill => skill.requirementType === requirementType);
        if (!skills.length) return null;
        return <View key={requirementType} style={styles.jobSkillGroup}><Text style={styles.skillGroupLabel}>{requirementType === 0 ? 'CẦN CÓ' : 'ƯU TIÊN'}</Text><View style={styles.skillsRow}>{skills.slice(0, 3).map(skill => <MatchSkill key={`${skill.name}-${skill.requirementType}`} name={skill.name} requirementType={requirementType as 0 | 1} matched={selectedPortfolioId === myPortfolio?.profile.id && myPortfolio ? myPortfolio.portfolio.skills.some(owned => owned.name.trim().toLocaleLowerCase() === skill.name.trim().toLocaleLowerCase()) : null} />)}{skills.length > 3 && <Text style={styles.moreSkills}>+{skills.length - 3}</Text>}</View></View>;
      })}<SkillLegend /></View>}
      {!!myPortfolio && selectedPortfolioId === myPortfolio.profile.id && job.skills.some(skill => skill.requirementType === 0 || skill.requirementType === 1) && <View style={styles.matchSummary}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={13} tintColor={colors.primary} /><Text style={styles.matchSummaryText}>{portfolioLabel(myPortfolio)} khớp {skillMatchSummary(job)}</Text></View>}
    </Pressable>
    <View style={styles.jobFooter}>
      <View style={styles.postMeta}><Meta icon="clock" text={relativeDate(job.startAt ?? job.createdAt)} /><Meta icon="person.2" text={`${job.applicantCount} ứng tuyển`} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={job.isSaved ? 'Bỏ lưu cơ hội' : 'Lưu cơ hội'} accessibilityState={{ disabled: savingId === job.id }} disabled={savingId === job.id} onPress={() => void toggleSaved(job)} style={({ pressed }) => [styles.saveButton, job.isSaved && styles.saveButtonActive, pressed && styles.pressed]}>
        <SymbolView name={job.isSaved ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' } : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }} size={17} tintColor={job.isSaved ? colors.primary : colors.textSecondary} />
      </Pressable>
      {job.applicationStatus === 4 ? <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ đã bị từ chối. Nộp lại hồ sơ" onPress={() => void openJob(job)} style={({ pressed }) => [{ minHeight: 34, minWidth: 88, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 18, backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>Nộp lại hồ sơ</Text></Pressable> : !job.isApplied ? <Pressable accessibilityRole="button" accessibilityLabel={`Xem cơ hội ${job.title}`} onPress={() => void openJob(job)} style={({ pressed }) => [styles.quickApply, pressed && styles.pressed]}><Text style={styles.quickApplyText}>Xem cơ hội</Text></Pressable> : null}
    </View>
  </View>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadJobs(1, false, true)} tintColor={colors.primary} />}>
      <Text style={styles.brand}>UNINET</Text>
      <Text style={styles.title}>Cơ hội</Text>
      <Text style={styles.subtitle}>Khám phá cơ hội phù hợp với bạn.</Text>
      {!!myPortfolio && <PortfolioPicker portfolio={myPortfolio} selected={selectedPortfolioId === myPortfolio.profile.id} onSelect={() => setSelectedPortfolioId(myPortfolio.profile.id)} />}

      <View style={styles.categoryRow}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !scholarshipsSelected }} onPress={() => setScholarshipsSelected(false)} style={[styles.categoryButton, !scholarshipsSelected && styles.categoryActive]}>
          <SymbolView name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} size={18} tintColor={!scholarshipsSelected ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.categoryText, !scholarshipsSelected && styles.categoryTextActive]}>Việc làm & thực tập</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: scholarshipsSelected }} onPress={() => setScholarshipsSelected(true)} style={[styles.categoryButton, scholarshipsSelected && styles.categoryActive]}>
          <SymbolView name={{ ios: 'graduationcap', android: 'school', web: 'school' }} size={18} tintColor={scholarshipsSelected ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.categoryText, scholarshipsSelected && styles.categoryTextActive]}>Học bổng</Text>
        </Pressable>
      </View>

      {scholarshipsSelected ? <View style={styles.comingCard}>
        <View style={styles.comingIcon}><SymbolView name={{ ios: 'graduationcap', android: 'school', web: 'school' }} size={25} tintColor={colors.primary} /></View>
        <Text style={styles.comingTitle}>Học bổng chưa được cấu hình</Text>
        <Text style={styles.comingText}>Mục học bổng sẽ được mở khi nội dung và dịch vụ được thiết lập.</Text>
      </View> : <>
        <View style={styles.searchBox}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={colors.textMuted} />
          <TextInput value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => setKeyword(searchInput)} placeholder="Tìm vị trí, kỹ năng hoặc công ty..." placeholderTextColor={colors.textMuted} returnKeyType="search" style={styles.searchInput} accessibilityLabel="Tìm cơ hội" />
          {!!searchInput && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => { setSearchInput(''); setKeyword(''); }} hitSlop={8}><SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} tintColor={colors.textMuted} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
          {views.map(item => <FilterChip key={item.value} label={item.label} selected={view === item.value} onPress={() => changeView(item.value)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
          {workModes.map(item => <FilterChip key={item.label} label={item.label} selected={workType === item.value} onPress={() => changeWorkType(item.value)} />)}
        </ScrollView>
        <View style={styles.listHeader}>
          <View><Text style={styles.sectionTitle}>{view === 'saved' ? 'Cơ hội đã lưu' : view === 'applied' ? 'Cơ hội đã ứng tuyển' : 'Đang tuyển'}</Text><Text style={styles.sectionHint}>Dành cho sinh viên và người mới tốt nghiệp</Text></View>
          {!loading && <Text style={styles.countText}>{totalItems} cơ hội</Text>}
        </View>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void loadJobs(1)}><Text style={styles.retryText}>Thử lại</Text></Pressable></View>}
        {loading && !refreshing ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Đang tải cơ hội...</Text></View> : jobs.length ? <>
          {jobs.map(renderJob)}
          {page < totalPages && <Pressable disabled={loadingMore} onPress={() => void loadJobs(page + 1, true)} style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]}>{loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Tải thêm cơ hội</Text>}</Pressable>}
        </> : !error && <View style={styles.emptyCard}><View style={styles.emptyIcon}><SymbolView name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={23} tintColor={colors.primary} /></View><Text style={styles.emptyTitle}>{view === 'saved' ? 'Chưa có cơ hội đã lưu' : view === 'applied' ? 'Bạn chưa ứng tuyển cơ hội nào' : 'Chưa có cơ hội phù hợp'}</Text><Text style={styles.emptyText}>Thử đổi bộ lọc hoặc quay lại sau để xem bài đăng mới.</Text></View>}
      </>}
    </ScrollView>

    <Modal visible={!!selectedJob} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedJob(null)}>
      {selectedJob && <SafeAreaView style={styles.detailSafe} edges={['top', 'bottom']}>
        <View style={styles.detailTopbar}><Text style={styles.detailEyebrow}>CHI TIẾT CƠ HỘI</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng chi tiết" onPress={() => setSelectedJob(null)} style={styles.closeButton}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} tintColor={colors.textPrimary} /></Pressable></View>
        <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} keyboardShouldPersistTaps="handled">
          <View style={styles.detailHeading}><CompanyMark avatarUrl={selectedJob.companyAvatarUrl} companyName={selectedJob.companyName} size={54} /><View style={styles.detailHeadingText}><Text style={styles.companyName}>{selectedJob.companyName}{selectedJob.companyIsVerified ? '  ✓' : ''}</Text><Text style={styles.detailTitle}>{selectedJob.title}</Text><Text style={styles.industry}>{selectedJob.companyIndustry || 'Cơ hội dành cho sinh viên'}</Text></View></View>
          <View style={styles.detailPills}><LocationPill text={selectedJob.location || 'Linh hoạt địa điểm'} /><Pill label={workModes[selectedJob.workType + 1]?.label ?? 'Linh hoạt'} tone="blue" /><Pill label={salary(selectedJob)} tone="green" />{selectedJob.deadline && <Pill label={`Hạn ${dateLabel(selectedJob.deadline)}`} tone="amber" />}</View>
          <View style={styles.detailActions}><Pressable accessibilityRole="button" onPress={() => void toggleSaved(selectedJob)} style={[styles.detailSave, selectedJob.isSaved && styles.detailSaveActive]}><SymbolView name={selectedJob.isSaved ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' } : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }} size={16} tintColor={colors.primary} /><Text style={styles.detailSaveText}>{selectedJob.isSaved ? 'Đã lưu' : 'Lưu cơ hội'}</Text></Pressable><Text style={styles.applicantText}>{selectedJob.applicantCount} người đã ứng tuyển</Text></View>
          <DetailSection title="Mô tả công việc" icon="text.alignleft"><Text style={styles.bodyCopy}>{selectedJob.description?.trim() || 'Nhà tuyển dụng chưa bổ sung mô tả.'}</Text>{selectedJob.responsibilities.map((item, index) => <Bullet key={`resp-${index}`} text={item} />)}</DetailSection>
          {!!selectedJob.projectAreas.length && <DetailSection title="Lĩnh vực dự án" icon="square.grid.2x2"><View style={styles.skillsRow}>{selectedJob.projectAreas.map(item => <Pill key={item} label={item} tone="muted" />)}</View></DetailSection>}
          <DetailSection title="Yêu cầu" icon="checkmark.circle"><Text style={styles.subsectionLabel}>CẦN CÓ</Text>{selectedJob.requiredQualifications.length ? selectedJob.requiredQualifications.map((item, index) => <Bullet key={`req-${index}`} text={item} />) : <Text style={styles.bodyCopy}>Nhà tuyển dụng chưa bổ sung yêu cầu bắt buộc.</Text>}{!!selectedJob.preferredQualifications.length && <><Text style={[styles.subsectionLabel, { marginTop: 14 }]}>ƯU TIÊN</Text>{selectedJob.preferredQualifications.map((item, index) => <Bullet key={`pref-${index}`} text={item} muted />)}</>}</DetailSection>
          {!!selectedJob.skills.length && <DetailSection title="Kỹ năng" icon="tag">{!!selectedJob.skills.filter(skill => skill.requirementType === 0).length && <><Text style={styles.subsectionLabel}>CẦN CÓ</Text><View style={styles.skillsRow}>{selectedJob.skills.filter(skill => skill.requirementType === 0).map(skill => <MatchSkill key={skill.name} name={skill.name} requirementType={0} matched={selectedPortfolioId === myPortfolio?.profile.id && myPortfolio ? myPortfolio.portfolio.skills.some(owned => owned.name.trim().toLocaleLowerCase() === skill.name.trim().toLocaleLowerCase()) : null} />)}</View></>}{!!selectedJob.skills.filter(skill => skill.requirementType === 1).length && <><Text style={[styles.subsectionLabel, selectedJob.skills.some(skill => skill.requirementType === 0) && { marginTop: 14 }]}>ƯU TIÊN</Text><View style={styles.skillsRow}>{selectedJob.skills.filter(skill => skill.requirementType === 1).map(skill => <MatchSkill key={skill.name} name={skill.name} requirementType={1} matched={selectedPortfolioId === myPortfolio?.profile.id && myPortfolio ? myPortfolio.portfolio.skills.some(owned => owned.name.trim().toLocaleLowerCase() === skill.name.trim().toLocaleLowerCase()) : null} />)}</View></>}<SkillLegend />{myPortfolio && <View style={styles.matchSummary}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={13} tintColor={colors.primary} /><Text style={styles.matchSummaryText}>{portfolioLabel(myPortfolio)} khớp {skillMatchSummary(selectedJob)}</Text></View>}</DetailSection>}
          {!!selectedJob.benefits.length && <DetailSection title="Quyền lợi" icon="gift"><View style={styles.benefitList}>{selectedJob.benefits.map((benefit, index) => <View key={`${benefit.title}-${index}`} style={styles.benefit}><Text style={styles.benefitTitle}>{benefit.title}</Text>{!!benefit.description && <Text style={styles.benefitText}>{benefit.description}</Text>}</View>)}</View></DetailSection>}
          <DetailSection title="Về công ty" icon="building.2"><View style={styles.detailHeading}><CompanyMark avatarUrl={selectedJob.companyAvatarUrl} companyName={selectedJob.companyName} size={42} /><View><Text style={styles.companyName}>{selectedJob.companyName}</Text><Text style={styles.industry}>{selectedJob.companyIndustry || 'Đối tác UniNet'}</Text></View></View>{!!selectedJob.companyBio?.trim() && <Text style={styles.companyBio}>{selectedJob.companyBio.trim()}</Text>}{(!!selectedJob.companyAddress?.trim() || !!selectedJob.companyWebsite?.trim() || !!selectedJob.companyContactEmail?.trim() || !!selectedJob.companyPhone?.trim()) && <View style={styles.companyInfoGrid}>{!!selectedJob.companyAddress?.trim() && <CompanyInfoItem icon="mappin.and.ellipse" label="ĐỊA CHỈ" value={selectedJob.companyAddress.trim()} />}{!!selectedJob.companyContactEmail?.trim() && <CompanyInfoItem icon="envelope" label="EMAIL" value={selectedJob.companyContactEmail.trim()} />}{!!selectedJob.companyPhone?.trim() && <CompanyInfoItem icon="phone" label="ĐIỆN THOẠI" value={selectedJob.companyPhone.trim()} />}{!!selectedJob.companyWebsite?.trim() && <CompanyInfoItem icon="globe" label="WEBSITE" value={selectedJob.companyWebsite.trim()} />}</View>}</DetailSection>
          <View style={styles.quickApplyCard}>{selectedJob.isApplied && <Pressable accessibilityRole="button" onPress={() => void openSubmittedSnapshot()} style={({ pressed }) => [{ minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12, borderRadius: 10, backgroundColor: colors.primaryLight }, pressed && styles.pressed]}><SymbolView name={{ ios: 'doc.text.magnifyingglass', android: 'description', web: 'description' }} size={15} tintColor={colors.primary} /><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>Xem CV đã nộp</Text></Pressable>}<View style={styles.quickApplyHeader}><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.sectionTitle}>Ứng tuyển nhanh</Text><Text style={styles.sectionHint}>{selectedJob.applicationStatus === 4 ? 'Hồ sơ trước đã bị từ chối. Bạn có thể chỉnh lời nhắn rồi nộp lại.' : 'Chọn hồ sơ muốn dùng để ứng tuyển.'}</Text></View>{selectedJob.isApplied && <Pill label={applicationStatusInfo(selectedJob.applicationStatus).label} tone={applicationStatusInfo(selectedJob.applicationStatus).tone} />}</View>{!!myPortfolio && <PortfolioPicker portfolio={myPortfolio} selected={selectedPortfolioId === myPortfolio.profile.id} onSelect={() => setSelectedPortfolioId(myPortfolio.profile.id)} compact />}<Text style={styles.inputLabel}>LỜI NHẮN NHÀ TUYỂN DỤNG <Text style={styles.optional}>(Tùy chọn)</Text></Text><TextInput value={coverMessage} onChangeText={setCoverMessage} editable={!selectedJob.isApplied || selectedJob.applicationStatus === 4} maxLength={300} multiline placeholder="Giới thiệu ngắn về bạn và lý do quan tâm..." placeholderTextColor={colors.textMuted} style={styles.messageInput} /><Text style={styles.characterCount}>{coverMessage.length}/300</Text>{!!error && <Text style={styles.detailError}>{error}</Text>}<Pressable accessibilityRole="button" accessibilityState={{ disabled: (selectedJob.isApplied && selectedJob.applicationStatus !== 4) || applying, busy: applying }} disabled={(selectedJob.isApplied && selectedJob.applicationStatus !== 4) || applying} onPress={() => selectedJob.applicationStatus === 4 ? setReapplyConfirmOpen(true) : void applyToJob()} style={({ pressed }) => [styles.submitButton, selectedJob.isApplied && selectedJob.applicationStatus !== 4 && styles.submitButtonDone, pressed && styles.pressed]}>{applying ? <ActivityIndicator color="#FFFFFF" /> : <><SymbolView name={selectedJob.isApplied && selectedJob.applicationStatus !== 4 ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' } : { ios: 'paperplane.fill', android: 'send', web: 'send' }} size={17} tintColor={selectedJob.isApplied && selectedJob.applicationStatus !== 4 ? colors.success : '#FFFFFF'} /><Text style={[styles.submitText, selectedJob.isApplied && selectedJob.applicationStatus !== 4 && styles.submitTextDone]}>{selectedJob.applicationStatus === 4 ? 'Nộp lại hồ sơ' : selectedJob.isApplied ? 'Đã gửi hồ sơ' : 'Ứng tuyển ngay'}</Text></>}</Pressable></View>
        </ScrollView>
      </SafeAreaView>}
    </Modal>
    <Modal visible={snapshotOpen} animationType="slide" onRequestClose={() => setSnapshotOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FD' }}>
        <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border }}><View><Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '900' }}>CV đã nộp</Text><Text style={{ color: colors.textMuted, fontSize: 8, marginTop: 2 }}>{selectedSubmittedApplication?.submittedPortfolio?.profile.displayName || selectedSubmittedApplication?.submittedPortfolio?.profile.fullName || selectedJob?.title || ''}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng CV" onPress={() => setSnapshotOpen(false)} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F0F4FA' }}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={17} tintColor={colors.textPrimary} /></Pressable></View>
        {snapshotLoading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textMuted, fontSize: 12 }}>Đang tải CV...</Text></View> : snapshotError ? <View style={{ margin: 18, padding: 14, borderRadius: 12, backgroundColor: '#FFF1F2' }}><Text style={{ color: colors.error, fontSize: 12 }}>{snapshotError}</Text></View> : <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>{submittedApplications.map(application => <Pressable key={application.id} onPress={() => setSelectedApplicationId(application.id)} style={{ minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: selectedApplicationId === application.id ? colors.primary : colors.border, backgroundColor: selectedApplicationId === application.id ? colors.primary : '#FFFFFF' }}><Text style={{ color: selectedApplicationId === application.id ? '#FFFFFF' : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>Lượt {application.applicationRound} · {dateLabel(application.appliedAt)}</Text></Pressable>)}</ScrollView>
          {selectedSubmittedApplication?.submittedPortfolio ? <View onLayout={event => setSnapshotFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={submittedCvTemplate.id} data={selectedSubmittedApplication.submittedPortfolio} theme={submittedCvTheme} width={Math.min(snapshotFrameWidth || screenWidth, 1120)} /></View> : <View style={{ marginHorizontal: 14, padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.textSecondary, fontSize: 10 }}>Lượt nộp này chưa có bản CV snapshot để xem. Hãy chọn lượt khác ở phía trên.</Text></View>}
        </ScrollView>}
      </SafeAreaView>
    </Modal>
    <Modal visible={reapplyConfirmOpen} transparent animationType="fade" onRequestClose={() => setReapplyConfirmOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20, 32, 52, 0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }}><View style={{ width: '100%', maxWidth: 420, borderRadius: 18, padding: 18, backgroundColor: '#FFFFFF', gap: 12 }}><Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>Nộp lại hồ sơ?</Text><Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>Đơn và CV đã nộp trước đó sẽ được giữ nguyên. Lượt nộp mới sẽ lưu một bản hồ sơ mới cho nhà tuyển dụng.</Text><View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 3 }}><Pressable accessibilityRole="button" onPress={() => setReapplyConfirmOpen(false)} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Hủy</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setReapplyConfirmOpen(false); void applyToJob(); }} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10, backgroundColor: colors.primary }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Nộp lại</Text></Pressable></View></View></View>
    </Modal>
  </SafeAreaView>;
}

function portfolioLabel(portfolio: PortfolioResponse) { return portfolio.portfolio.headline?.trim() || `CV của ${portfolio.profile.displayName || portfolio.profile.fullName}`; }
function CompanyMark({ avatarUrl, companyName, size = 46 }: { avatarUrl: string | null; companyName: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = avatarUrl?.trim() || null;
  const markStyle = [styles.companyMark, { width: size, height: size, borderRadius: Math.min(13, size / 3) }];
  if (uri && failedUri !== uri) return <Image accessibilityLabel={`Logo ${companyName}`} source={{ uri }} onError={() => setFailedUri(uri)} style={markStyle} />;
  return <View style={[...markStyle, styles.companyInitial]}><Text style={[styles.companyInitialText, { fontSize: size * 0.42 }]}>{companyName.trim().charAt(0).toUpperCase() || 'C'}</Text></View>;
}
function PortfolioPicker({ portfolio, selected, onSelect, compact = false }: { portfolio: PortfolioResponse; selected: boolean; onSelect: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = portfolioLabel(portfolio);
  return <View style={[styles.cvPicker, compact && styles.cvPickerCompact, open && styles.cvPickerOpen]}>
    <Text style={styles.inputLabel}>CHỌN CV</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, selected }} onPress={() => setOpen(value => !value)} style={({ pressed }) => [styles.portfolioTrigger, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={14} tintColor={colors.primary} />
      <Text numberOfLines={1} style={styles.portfolioTriggerText}>{label}</Text>
      <SymbolView name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'expand_less' : 'expand_more', web: open ? 'expand_less' : 'expand_more' }} size={16} tintColor={colors.textMuted} />
    </Pressable>
    {open && <Pressable accessibilityRole="button" accessibilityState={{ selected: true }} onPress={() => { onSelect(); setOpen(false); }} style={styles.portfolioOption}>
      <View style={styles.portfolioOptionText}><Text numberOfLines={1} style={styles.portfolioOptionTitle}>{label}</Text><Text style={styles.portfolioOptionSubtitle}>CV từ hồ sơ CareerProfile của bạn</Text></View>
      <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={17} tintColor={selected ? colors.primary : colors.textMuted} />
    </Pressable>}
  </View>;
}
function Meta({ icon, text }: { icon: 'mappin.and.ellipse' | 'clock' | 'person.2'; text: string }) { const name = { ios: icon, android: icon === 'clock' ? 'schedule' : icon === 'person.2' ? 'groups' : 'location_on', web: icon === 'clock' ? 'schedule' : icon === 'person.2' ? 'groups' : 'location_on' } as ComponentProps<typeof SymbolView>['name']; return <View style={styles.metaItem}><SymbolView name={name} size={13} tintColor={colors.textMuted} /><Text numberOfLines={1} style={styles.metaText}>{text}</Text></View>; }
function LocationPill({ text }: { text: string }) { return <View style={styles.locationPill}><SymbolView name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }} size={11} tintColor="#1769B7" /><Text numberOfLines={1} style={styles.locationPillText}>{text}</Text></View>; }
function Pill({ label, tone }: { label: string; tone: 'blue' | 'green' | 'muted' | 'amber' | 'rose' }) { return <View style={[styles.pill, tone === 'blue' ? styles.pillBlue : tone === 'green' ? styles.pillGreen : tone === 'amber' ? styles.pillAmber : tone === 'rose' ? styles.pillRose : styles.pillMuted]}><Text numberOfLines={1} style={[styles.pillText, tone === 'blue' ? styles.pillBlueText : tone === 'green' ? styles.pillGreenText : tone === 'amber' ? styles.pillAmberText : tone === 'rose' ? styles.pillRoseText : styles.pillMutedText]}>{label}</Text></View>; }
function MatchSkill({ name, requirementType, matched }: { name: string; requirementType: 0 | 1; matched: boolean | null }) { return <Pill label={name} tone={matched === null ? 'muted' : matched ? requirementType === 0 ? 'green' : 'blue' : 'amber'} />; }
function SkillLegend() { return <View style={[styles.skillLegend, { marginTop: 8 }]}>{[['green', 'Cần có'], ['blue', 'Ưu tiên'], ['amber', 'Thiếu kỹ năng'], ['muted', 'Chưa đối chiếu']].map(([tone, label]) => <View key={label} style={styles.skillLegendItem}><View style={[styles.skillLegendDot, tone === 'green' ? styles.skillLegendGreen : tone === 'blue' ? styles.skillLegendBlue : tone === 'amber' ? styles.skillLegendAmber : styles.skillLegendMuted]} /><Text style={styles.skillLegendText}>{label}</Text></View>)}</View>; }
function CompanyInfoItem({ icon, label, value }: { icon: 'mappin.and.ellipse' | 'globe' | 'envelope' | 'phone'; label: string; value: string }) { const name = (icon === 'globe' ? { ios: 'globe', android: 'language', web: 'language' } : icon === 'envelope' ? { ios: 'envelope', android: 'mail', web: 'mail' } : icon === 'phone' ? { ios: 'phone', android: 'call', web: 'call' } : { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }) as ComponentProps<typeof SymbolView>['name']; return <View style={styles.companyInfoItem}><View style={styles.companyInfoHeading}><SymbolView name={name} size={12} tintColor={colors.textMuted} /><Text style={styles.companyInfoLabel}>{label}</Text></View><Text style={styles.companyInfoValue}>{value}</Text></View>; }
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.filterChip, selected && styles.filterChipSelected, pressed && styles.pressed]}><Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text></Pressable>; }
function DetailSection({ title, icon, children }: { title: string; icon: 'text.alignleft' | 'square.grid.2x2' | 'checkmark.circle' | 'tag' | 'gift' | 'building.2'; children: ReactNode }) { const androidName = icon === 'building.2' ? 'business' : icon === 'tag' ? 'sell' : icon === 'gift' ? 'card_giftcard' : icon === 'checkmark.circle' ? 'check_circle_outline' : icon === 'square.grid.2x2' ? 'grid_view' : 'description'; const name = { ios: icon, android: androidName, web: androidName } as ComponentProps<typeof SymbolView>['name']; return <View style={styles.detailSection}><View style={styles.sectionTitleRow}><View style={styles.detailSectionIcon}><SymbolView name={name} size={15} tintColor={colors.primary} /></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function Bullet({ text, muted = false }: { text: string; muted?: boolean }) { return <View style={styles.bulletRow}><View style={[styles.bulletDot, muted && styles.bulletMuted]} /><Text style={[styles.bodyCopy, muted && styles.mutedCopy]}>{text}</Text></View>; }
function relativeDate(value: string) { const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)); return days === 0 ? 'Hôm nay' : days === 1 ? 'Hôm qua' : `${days} ngày trước`; }
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Chưa xác định' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 34 },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2.2 }, title: { color: colors.navy, fontSize: 30, lineHeight: 38, fontWeight: '800', marginTop: 7 }, subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 5 },
  categoryRow: { flexDirection: 'row', gap: 9, marginTop: 22 }, categoryButton: { flex: 1, minHeight: 49, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 }, categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary }, categoryText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' }, categoryTextActive: { color: '#FFFFFF' },
  searchBox: { marginTop: 17, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13 }, searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, paddingVertical: 10 }, chipScroller: { alignItems: 'center', gap: 8, paddingVertical: 11 }, filterChip: { minHeight: 34, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, filterChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' }, filterChipTextSelected: { color: '#FFFFFF' },
  listHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, marginBottom: 12 }, sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' }, sectionHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 }, countText: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  jobCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, marginBottom: 11, overflow: 'hidden' }, jobMain: { padding: 14, paddingBottom: 10 }, jobHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 }, companyMark: { backgroundColor: colors.primaryLight }, companyInitial: { alignItems: 'center', justifyContent: 'center' }, companyInitialText: { color: colors.primary, fontSize: 19, fontWeight: '800' }, jobHeadingText: { flex: 1, minWidth: 0 }, companyLine: { flexDirection: 'row', alignItems: 'center', gap: 4 }, companyName: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 }, jobTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 3 }, industry: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 12 }, metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }, metaText: { color: colors.textSecondary, fontSize: 10, flexShrink: 1 }, pill: { borderWidth: 1, borderRadius: 13, minHeight: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, maxWidth: '100%' }, pillText: { fontSize: 9, fontWeight: '700' }, pillBlue: { backgroundColor: '#F1F7FF', borderColor: '#BFDAFF' }, pillBlueText: { color: '#1769B7' }, pillGreen: { backgroundColor: '#EDFFF6', borderColor: '#A8EBCB' }, pillGreenText: { color: '#08734C' }, pillAmber: { backgroundColor: '#FFF8E9', borderColor: '#F5D28A' }, pillAmberText: { color: '#9A5B00' }, pillRose: { backgroundColor: '#FFF0F1', borderColor: '#FFC7CC' }, pillRoseText: { color: '#C6283D' }, pillMuted: { backgroundColor: '#F3F6FA', borderColor: '#E0E7F0' }, pillMutedText: { color: colors.textSecondary }, skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }, moreSkills: { color: colors.textMuted, fontSize: 10, alignSelf: 'center' },
  jobFooter: { minHeight: 47, borderTopWidth: 1, borderTopColor: '#EDF1F6', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13 }, postMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 }, saveButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, saveButtonActive: { backgroundColor: colors.primaryLight, borderColor: '#BBD5FC' }, quickApply: { minHeight: 34, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 }, applicationStatusButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center' }, quickApplyText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' }, appliedButton: { backgroundColor: '#EDFFF6', borderWidth: 1, borderColor: '#A8EBCB' }, appliedText: { color: '#08734C' }, pressed: { opacity: 0.72 },
  comingCard: { alignItems: 'center', backgroundColor: '#FDFEFF', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8D8EF', paddingHorizontal: 26, paddingVertical: 31, marginTop: 19 }, comingIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, comingTitle: { color: colors.navy, fontSize: 15, fontWeight: '800', textAlign: 'center' }, comingText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 300 }, loadingState: { paddingVertical: 42, alignItems: 'center', gap: 9 }, stateText: { color: colors.textMuted, fontSize: 12 }, emptyCard: { alignItems: 'center', marginTop: 14, paddingHorizontal: 22, paddingVertical: 27, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, emptyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 11 }, emptyTitle: { color: colors.navy, fontSize: 14, fontWeight: '800', textAlign: 'center' }, emptyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 }, errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 10, backgroundColor: '#FFF1F2', marginBottom: 10 }, errorText: { flex: 1, color: colors.error, fontSize: 11, lineHeight: 16 }, retryText: { color: colors.primary, fontSize: 11, fontWeight: '800' }, loadMore: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', marginTop: 3 }, loadMoreText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  detailSafe: { flex: 1, backgroundColor: colors.background }, detailTopbar: { minHeight: 46, paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailEyebrow: { color: colors.textMuted, fontSize: 10, letterSpacing: 1.2, fontWeight: '800' }, closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5FA', alignItems: 'center', justifyContent: 'center' }, detailScroll: { flex: 1 }, detailContent: { padding: 15, paddingBottom: 30, maxWidth: 720, width: '100%', alignSelf: 'center' }, detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 3 }, detailHeadingText: { flex: 1 }, detailTitle: { color: colors.textPrimary, fontSize: 18, lineHeight: 23, fontWeight: '800', marginTop: 3 }, detailPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, detailActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 3 }, detailSave: { minHeight: 34, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' }, detailSaveActive: { borderColor: '#BBD5FC', backgroundColor: colors.primaryLight }, detailSaveText: { color: colors.primary, fontSize: 11, fontWeight: '700' }, applicantText: { color: colors.textMuted, fontSize: 10 }, detailSection: { padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginTop: 12 }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }, detailSectionIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, bodyCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 7 }, bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 }, bulletMuted: { backgroundColor: '#AEBBD0' }, mutedCopy: { color: colors.textMuted }, subsectionLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 3 }, benefitList: { gap: 8 }, benefit: { padding: 11, borderRadius: 10, backgroundColor: '#F6F9FD' }, benefitTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' }, benefitText: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 3 }, quickApplyCard: { padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBD5FC', borderRadius: 15, marginTop: 13 }, quickApplyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }, inputLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }, optional: { color: colors.textMuted, fontWeight: '500', letterSpacing: 0 }, messageInput: { minHeight: 75, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 11, marginTop: 7, color: colors.textPrimary, fontSize: 12, lineHeight: 17, textAlignVertical: 'top', backgroundColor: '#FBFCFE' }, characterCount: { color: colors.textMuted, fontSize: 10, textAlign: 'right', marginTop: 4 }, detailError: { color: colors.error, fontSize: 11, lineHeight: 16, marginTop: 5 }, submitButton: { minHeight: 43, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 11, marginTop: 10 }, submitButtonDone: { backgroundColor: '#EDFFF6', borderWidth: 1, borderColor: '#A8EBCB' }, submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, submitTextDone: { color: colors.success },
  jobSkillGroups: { gap: 7, marginTop: 9 }, jobSkillGroup: { gap: 2 }, skillGroupLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, skillLegend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#EDF1F6', paddingTop: 8, marginTop: 2 }, skillLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, skillLegendDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1 }, skillLegendGreen: { backgroundColor: '#D7FFEC', borderColor: '#34D399' }, skillLegendBlue: { backgroundColor: '#E6F0FF', borderColor: '#60A5FA' }, skillLegendAmber: { backgroundColor: '#FFF2CC', borderColor: '#F59E0B' }, skillLegendMuted: { backgroundColor: '#EEF2F7', borderColor: '#CBD5E1' }, skillLegendText: { color: colors.textMuted, fontSize: 8 }, matchSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F7FF' }, matchSummaryText: { color: colors.primary, fontSize: 10, fontWeight: '700' }, skillMatchNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  companyBio: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 12 }, companyInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, companyInfoItem: { flexGrow: 1, flexBasis: 145, minWidth: 0, padding: 10, borderRadius: 11, backgroundColor: '#F5F8FC', borderWidth: 1, borderColor: '#EAF0F7' }, companyInfoHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 }, companyInfoLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.3 }, companyInfoValue: { color: colors.textPrimary, fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 4 }, locationPill: { minHeight: 23, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, borderColor: '#BFDAFF', backgroundColor: '#F1F7FF' }, locationPillText: { color: '#1769B7', fontSize: 9, fontWeight: '700', flexShrink: 1 },
  cvPicker: { position: 'relative', zIndex: 1, padding: 11, marginTop: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#FFFFFF', gap: 7 }, cvPickerOpen: { zIndex: 30, elevation: 12 }, cvPickerCompact: { marginTop: 0, marginBottom: 13, padding: 0, borderWidth: 0, borderRadius: 0 }, portfolioTrigger: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: '#8EA7FF', backgroundColor: '#FFFFFF' }, portfolioTriggerText: { flex: 1, color: colors.textPrimary, fontSize: 11, fontWeight: '600' }, portfolioOption: { position: 'absolute', top: 68, left: 11, right: 11, zIndex: 40, elevation: 14, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', shadowColor: '#152947', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, portfolioOptionText: { flex: 1, gap: 3 }, portfolioOptionTitle: { color: colors.primary, fontSize: 11, fontWeight: '700' }, portfolioOptionSubtitle: { color: colors.textMuted, fontSize: 9 },
});
