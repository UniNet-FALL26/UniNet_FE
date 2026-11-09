import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { ProjectOverview } from '@/components/projects/ProjectOverview';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useProjectVerification } from '@/hooks/useProjectVerification';
import type { ProjectDetail } from '@/types/project';
import { level2Label } from '@/utils/project-verification';
export function CompletedDetailView({project, initialTab = 'Tổng quan'}: {project: ProjectDetail; initialTab?: string}) {
 const validTab = initialTab === 'Xác minh' ? initialTab : 'Tổng quan';
 const [tab, setTab] = useState(validTab);
 const {level2, refresh} = useProjectVerification(project.id, project.isCreator);
 useEffect(() => { if (initialTab !== validTab) router.setParams({tab: validTab}); }, [initialTab, validTab]);
 const openVerification = () => router.push(level2.data ? {pathname: '/group/verification-dossier/[id]', params: {id: level2.data.verification.id}} as never : {pathname: '/group/verification/[id]', params: {id: project.id}} as never);
 return <SafeAreaView style={s.safe}><DetailNavigation title="Dự án đã hoàn thành" onBack={() => router.dismissTo('/(tabs)/groups' as never)} /><ScrollView contentContainerStyle={s.content}>
 <View style={s.hero}><Text style={s.title}>{project.title}</Text><Text style={s.badge}>✓ Đã hoàn thành</Text><Text style={s.heroNote}>Hoàn thành dự án và xác minh là hai trạng thái độc lập.</Text></View>
 <View accessibilityRole="tablist" style={s.tabs}>{['Tổng quan', 'Xác minh'].map(name => <Pressable key={name} accessibilityRole="tab" accessibilityState={{selected: tab === name}} onPress={() => {setTab(name); router.setParams({tab: name});}} style={[s.tab, tab === name && s.selectedTab]}><Text style={[s.tabText, tab === name && s.selectedText]}>{name}</Text></Pressable>)}</View>
 {tab === 'Tổng quan' && <ProjectOverview project={project} />}
 <View style={s.card}><Text style={s.heading}>Thẩm định dự án</Text>{project.isCreator ? <><Text style={s.body}>{level2.error || (level2.loading ? 'Đang tải…' : level2Label(level2.data, true))}</Text><Button title="Làm mới trạng thái" variant="outline" onPress={refresh} disabled={level2.loading} /><Button title={level2.data ? 'Xem hồ sơ thẩm định' : 'Đăng kí thẩm định'} onPress={openVerification} disabled={level2.loading || !!level2.error} /><Text style={s.small}>Theo dõi lịch hẹn, thanh toán và kết luận chuyên viên trong hồ sơ thẩm định.</Text></> : <Text style={s.body}>Hồ sơ thẩm định riêng tư chỉ dành cho người tạo dự án.</Text>}</View>
 </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  back: { minWidth: 48, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: colors.primary },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  content: { padding: 16, gap: 16, width: '100%', maxWidth: 1280, alignSelf: 'center', paddingBottom: 40 },
  hero: { padding: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 14, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroKicker: { fontSize: 11, letterSpacing: 2, fontWeight: '700', color: colors.textSecondary },
  heroMark: { fontSize: 22, fontWeight: '700', color: '#8DE1C4', width: 40, height: 40, textAlign: 'center', lineHeight: 40, backgroundColor: '#234B62', borderRadius: 14 },
  eyebrow: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: colors.navy },
  heroNote: { color: colors.textSecondary, fontSize: 14, lineHeight: 23 },
  summary: { gap: 18 },
  summaryWide: { flexDirection: 'row', alignItems: 'flex-start' },
  progressColumn: { flex: 1, minWidth: 0 },
  nextColumn: { minWidth: 0 },
  nextColumnWide: { width: 340 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 6 },
  stepNumber: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF3FA', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: '#536B89' },
  stepPassed: { backgroundColor: '#E4F6EE' },
  stepPassedText: { color: '#1B7854' },
  stepBody: { flex: 1, minWidth: 0, gap: 5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: colors.projectCompletedBackground, color: colors.projectCompleted, padding: 8, borderRadius: 8, fontWeight: '700' },
  role: { color: colors.navy, padding: 8, borderRadius: 8, backgroundColor: colors.surface },
  card: { padding: 18, gap: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#E3EAF3', boxShadow: '0 5px 22px #16365B06' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.navy },
  label: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.navy },
  body: { fontSize: 16, lineHeight: 25, color: colors.textPrimary },
  small: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  warning: { fontSize: 16, lineHeight: 24, color: colors.error },
  notice: { padding: 14, backgroundColor: colors.primaryLight, borderRadius: 12, color: colors.navy, fontSize: 15, lineHeight: 24 },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: '#E9EFF7', borderRadius: 16, padding: 5 },
  tab: { flex: 1, minHeight: 48, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  selectedTab: { backgroundColor: colors.surface, boxShadow: '0 2px 8px #16365B12' },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  selectedText: { color: colors.primary },
  evidence: { gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border },
  report: { gap: 10, padding: 12, backgroundColor: colors.background, borderRadius: 12 },
  result: { gap: 6, borderLeftWidth: 3, borderColor: colors.border, paddingLeft: 12, paddingVertical: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 }
});

