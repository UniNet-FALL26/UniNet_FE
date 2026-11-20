import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { portfolioService } from '@/services/portfolio.service';
import { colors } from '@/constants/colors';
import type { PortfolioResponse } from '@/types/portfolio';
import { useAuthStore } from '@/store/auth.store';
import { FriendProfileActions } from '@/components/friends/FriendProfileActions';
import { CommunityProfilePosts } from '@/components/community/CommunityProfilePosts';

export default function StudentProfileViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const viewerKey = isAuthenticated ? account?.id : 'anonymous';
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');
  useEffect(() => { setActiveTab('profile'); }, [id, viewerKey]);
  const [loaded, setLoaded] = useState<{ id: string; viewerKey: string | undefined; data: PortfolioResponse } | null>(null);
  const data = !isLoading && loaded?.id === id && loaded?.viewerKey === viewerKey ? loaded?.data : null;
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const [frameWidth, setFrameWidth] = useState(0);
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    const controller = new AbortController(); setLoaded(null); setError('');
    if (isLoading) return () => controller.abort();
    const request = portfolioService.getById(id, controller.signal);
    request.then(result => { if (!controller.signal.aborted) setLoaded({ id, viewerKey, data: result }); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể xem hồ sơ này.'); });
    return () => controller.abort();
  }, [id, attempt, viewerKey, isLoading, isAuthenticated]);
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme);
  return <SafeAreaView style={s.safe}>
    <DetailNavigation title="Hồ sơ sinh viên" onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} />
    {error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : !data ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ sinh viên" color={colors.primary} /></View> : <>
      <View testID="profile-view-header" style={[s.toolbar, width < 600 && s.mobileToolbar]}>
        <View role="tablist" aria-label="Nội dung hồ sơ" style={s.tabs}>
          {([{ id: 'profile', label: 'Hồ sơ', icon: { ios: 'person.crop.rectangle', android: 'badge', web: 'badge' } }, { id: 'posts', label: 'Bài viết', icon: { ios: 'doc.text', android: 'article', web: 'article' } }] as const).map(tab => <Pressable key={tab.id} role="tab" aria-label={tab.label} aria-selected={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} style={({ pressed }) => [s.tab, activeTab === tab.id && s.activeTab, pressed && s.pressed]}>
            <SymbolView name={tab.icon} size={17} tintColor={activeTab === tab.id ? colors.primary : colors.textSecondary} accessible={false} /><Text style={[s.tabLabel, activeTab === tab.id && s.activeLabel]}>{tab.label}</Text>
          </Pressable>)}
        </View>
        <View testID="profile-view-actions" style={s.actions}><FriendProfileActions profileId={data.profile.id} /></View>
      </View>
      <ScrollView key={`${id}:${activeTab}`} contentContainerStyle={s.content}>
        <View role="tabpanel" aria-label={activeTab === 'profile' ? 'Hồ sơ' : 'Bài viết'} style={s.tabPanel}>
          {activeTab === 'profile' ? <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={template.id} data={data} theme={theme} width={Math.min(frameWidth || width, 1120)} /></View>
            : isAuthenticated ? <View style={s.posts}><CommunityProfilePosts key={`${viewerKey}:${id}`} profileId={data.profile.id} readOnly={!data.isOwner} showHeading={false} title="Bài viết" emptyMessage="Chưa có bài viết công khai." communityHref="/(tabs)/community" /></View> : <Text style={s.signIn}>Đăng nhập để xem bài viết.</Text>}
        </View>
      </ScrollView>
    </>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  toolbar: { width: '100%', maxWidth: 1120, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 4, borderBottomWidth: 1, borderColor: '#E2E9F5', backgroundColor: '#F8FAFE' },
  mobileToolbar: { paddingHorizontal: 10, gap: 6 }, tabs: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  tab: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 2, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: colors.primary },
  tabLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' }, activeLabel: { color: colors.primary }, pressed: { opacity: 0.7 },
  actions: { marginLeft: 'auto', maxWidth: '100%', paddingVertical: 4 }, tabPanel: { width: '100%' }, posts: { padding: 16 }, signIn: { padding: 24, color: colors.textSecondary, textAlign: 'center' },
  safe: { flex: 1, backgroundColor: colors.background }, header: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, error: { color: colors.error, textAlign: 'center', lineHeight: 22 },
});
