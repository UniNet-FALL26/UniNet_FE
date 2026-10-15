import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, SectionTitle, Tag } from '@/components/company/company-ui';
import { companyJobWorkTypeLabel, companyService, formatCompanyDate, type CompanyDashboard } from '@/services/company.service';

export default function CompanyDashboard() {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void companyService.getDashboard(controller.signal)
      .then(setData)
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được tổng quan công ty.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]));

  const stats = data ? [
    { title: 'Hồ sơ ứng tuyển', value: data.totalApplications, detail: `Ở ${data.totalJobs} bài tuyển dụng`, icon: 'doc.text' },
    { title: 'Hồ sơ chờ xem', value: data.pendingApplications, detail: 'Cần bạn xem xét', icon: 'tray' },
    { title: 'Đang phỏng vấn', value: data.interviewApplications, detail: 'Ứng viên đang trao đổi', icon: 'bubble.left.and.bubble.right' },
  ] as const : [];
  const funnel = data ? [
    { label: 'Chờ xem', value: data.pendingApplications, color: c.amber },
    { label: 'Đã xem', value: data.viewedApplications, color: c.muted },
    { label: 'Phỏng vấn', value: data.interviewApplications, color: c.purple },
    { label: 'Chấp nhận', value: data.acceptedApplications, color: c.green },
    { label: 'Từ chối', value: data.rejectedApplications, color: c.rose },
  ] as const : [];

  return <CompanyPage><PageScroll>
    <View style={s.topbar}><View style={s.brand}><View style={s.brandMark}><CompanyIcon name={{ ios: 'building.2.fill', android: 'business', web: 'business' }} color="#FFF" size={17} /></View><View><Text style={s.brandName}>UniNet</Text><Text style={s.brandCaption}>CAREER HUB</Text></View></View></View>
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.personMeta}>Đang tải tổng quan…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!!data && <>
      <View style={s.hero}><View style={s.heroTop}><Text style={s.heroTitle}>Quản lý bài đăng tuyển dụng</Text><Tag tone="gray">{data.publishedJobs} đang tuyển</Tag></View><Text style={s.heroCopy}>{data.companyName} · {data.totalJobs} bài đăng · {data.totalApplications} hồ sơ</Text><View style={s.heroStats}>{[{ label: 'Đang tuyển', value: data.publishedJobs, sub: 'Bài đang mở' }, { label: 'Bản nháp', value: data.draftJobs, sub: 'Chưa đăng' }, { label: 'Sắp hết hạn', value: data.expiringJobs, sub: 'Trong 7 ngày' }].map((item) => <View key={item.label} style={s.heroStat}><Text style={s.heroStatLabel}>{item.label}</Text><Text style={s.heroStatValue}>{item.value}</Text><Text style={s.heroStatSub}>{item.sub}</Text></View>)}</View><ActionButton title="Tạo bài tuyển dụng" onPress={() => router.push('/(company)/create')} icon={{ ios: 'plus', android: 'add', web: 'add' }} variant="soft" /></View>
      <View style={s.metricGrid}>{stats.map((item) => <Card key={item.title} style={s.metricCard}><View style={s.metricTop}><Text style={s.metricLabel}>{item.title}</Text><CompanyIcon name={item.icon} size={16} /></View><Text style={s.metricValue}>{item.value}</Text><Text style={s.metricDetail}>{item.detail}</Text></Card>)}</View>
      <Card><SectionTitle title="Bài đăng đang tuyển" action="Quản lý bài đăng" onAction={() => router.push('/(company)/jobs')} />{data.openJobs.map((job) => <Pressable onPress={() => router.push('/(company)/jobs')} key={job.id} style={s.jobRow}><View style={s.jobIcon}><CompanyIcon name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }} size={18} /></View><View style={s.personInfo}><Text style={s.personName}>{job.title}</Text><Text style={s.personMeta}>{companyJobWorkTypeLabel[job.workType]} · {job.location || 'Chưa có địa điểm'}</Text></View><View style={s.applicantAction}><Text style={s.appCount}>{job.applicantCount} ứng viên →</Text><Tag tone="green">Đã đăng</Tag></View></Pressable>)}{data.openJobs.length === 0 && <Text style={s.personMeta}>Chưa có bài đăng đang tuyển.</Text>}</Card>
      <Card><SectionTitle title="Tiến độ hồ sơ" /><Text style={s.progressSub}>{data.totalApplications} hồ sơ · tất cả bài đăng</Text>{funnel.map((item) => <View key={item.label} style={s.progressRow}><View style={s.progressHead}><Text style={s.progressLabel}>{item.label}</Text><Text style={s.progressValue}>{item.value}</Text></View><View style={s.track}><View style={[s.fill, { width: `${data.totalApplications ? item.value / data.totalApplications * 100 : 0}%`, backgroundColor: item.color }]} /></View></View>)}</Card>
      <Card><SectionTitle title="Việc cần làm" />{data.pendingApplications > 0 && <View style={s.todo}><CompanyIcon name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={16} color={c.purple} /><View style={s.personInfo}><Text style={s.personName}>{data.pendingApplications} hồ sơ đang chờ xem</Text><Text style={s.personMeta}>Mở mục Ứng viên để xem và cập nhật hồ sơ.</Text></View></View>}{data.openJobs.filter(job => job.deadline && new Date(job.deadline).getTime() - Date.now() <= 7 * 86400000).map(job => <View key={job.id} style={s.todo}><CompanyIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={16} color={c.amber} /><View style={s.personInfo}><Text style={s.personName}>{job.title} sắp hết hạn</Text><Text style={s.personMeta}>Hạn ứng tuyển {formatCompanyDate(job.deadline)}.</Text></View></View>)}{data.pendingApplications === 0 && data.expiringJobs === 0 && <Text style={s.personMeta}>Chưa có việc cần xử lý.</Text>}</Card>
    </>}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 3 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMark: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, brandName: { color: c.ink, fontSize: 16, lineHeight: 18, fontWeight: '900' }, brandCaption: { color: c.purple, fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  hero: { backgroundColor: c.purple, padding: 14, borderRadius: 17, gap: 9 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, heroTitle: { flex: 1, color: '#FFF', fontWeight: '900', fontSize: 18, lineHeight: 23 }, heroCopy: { color: '#E5DBFF', fontSize: 10 }, heroStats: { flexDirection: 'row', gap: 7 }, heroStat: { flex: 1, padding: 9, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12 }, heroStatLabel: { color: '#F2ECFF', fontSize: 9 }, heroStatValue: { color: '#FFF', fontSize: 19, fontWeight: '900', marginTop: 4 }, heroStatSub: { color: '#E5DBFF', fontSize: 8, marginTop: 1 },
  metricGrid: { flexDirection: 'row', gap: 8 }, metricCard: { flex: 1, padding: 10, minHeight: 100 }, metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, metricLabel: { color: c.muted, fontSize: 9, flex: 1 }, metricValue: { color: c.ink, fontSize: 23, fontWeight: '900', marginTop: 5 }, metricDetail: { color: c.muted, fontSize: 8, lineHeight: 12, marginTop: 2 }, progressSub: { color: c.muted, fontSize: 10, marginTop: -5, marginBottom: 3 },
  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F2F1F5' }, initials: { width: 30, height: 30, borderRadius: 16, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, initialsText: { fontSize: 9, color: c.purple, fontWeight: '900' }, personInfo: { flex: 1, gap: 3 }, personName: { color: c.ink, fontSize: 10, fontWeight: '800' }, personMeta: { color: c.muted, fontSize: 9, lineHeight: 13 }, applicantAction: { alignItems: 'flex-end', gap: 4 }, dateText: { color: c.muted, fontSize: 8 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F2F1F5' }, jobIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, appCount: { color: c.purple, fontSize: 9, fontWeight: '800' },
  progressRow: { marginTop: 8, gap: 4 }, progressHead: { flexDirection: 'row', justifyContent: 'space-between' }, progressLabel: { color: c.muted, fontSize: 10 }, progressValue: { color: c.ink, fontSize: 10, fontWeight: '800' }, track: { height: 4, borderRadius: 3, backgroundColor: '#F0EFF4', overflow: 'hidden' }, fill: { height: 4, borderRadius: 3 }, todo: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 11, backgroundColor: c.page, marginTop: 7 }, messageCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF', borderRadius: 15, borderWidth: 1, borderColor: c.line }, msgIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, error: { color: c.rose, fontSize: 11 },
});
