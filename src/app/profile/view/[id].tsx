import { useScreenSafeAreaEdges } from '@/hooks/useScreenSafeAreaEdges';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { portfolioService } from '@/services/portfolio.service';
import { publicProfileService, type PublicRoleProfile } from '@/services/public-profile.service';
import { colors } from '@/constants/colors';
import type { PortfolioResponse } from '@/types/portfolio';
import { useAuthStore } from '@/store/auth.store';
import { FriendProfileActions } from '@/components/friends/FriendProfileActions';
import { CommunityProfilePosts } from '@/components/community/CommunityProfilePosts';
import CompanyProfile from '@/app/(company)/profile';
import type { CompanyProfile as CompanyProfileData } from '@/services/company.service';

type LoadedProfile = { publicProfile: PublicRoleProfile; studentPortfolio?: PortfolioResponse };

export default function RoleProfileViewer() {
  const safeAreaEdges = useScreenSafeAreaEdges();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const viewerKey = isAuthenticated ? account?.id : 'anonymous';
  const [loaded, setLoaded] = useState<{ id: string; viewerKey: string | undefined; data: LoadedProfile } | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const [frameWidth, setFrameWidth] = useState(0);
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    if (isLoading || !id) return;
    const controller = new AbortController(); setLoaded(null); setError('');
    void (async () => {
      try {
        const publicProfile = await publicProfileService.getById(id, controller.signal);
        const studentPortfolio = publicProfile.role === 0 ? await portfolioService.getById(id, controller.signal) : undefined;
        if (!controller.signal.aborted) setLoaded({ id, viewerKey, data: { publicProfile, studentPortfolio } });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể xem hồ sơ này.');
      }
    })();
    return () => controller.abort();
  }, [id, attempt, viewerKey, isLoading]);

  const data = loaded?.id === id && loaded.viewerKey === viewerKey ? loaded.data : null;
  const profile = data?.publicProfile;
  const viewedRole = profile?.role ?? (account?.profile?.id === id ? account.role : null);
  const title = viewedRole === 0 ? 'Hồ sơ sinh viên' : viewedRole === 1 ? 'Hồ sơ đối tác' : viewedRole === 2 ? 'Hồ sơ thẩm định viên' : viewedRole === null ? 'Hồ sơ' : 'Hồ sơ thành viên';
  const isOwnPartner = profile?.role === 1 && account?.role === 1 && account.profile?.id === id;
  const partnerProfile: CompanyProfileData | null = profile?.role === 1 ? {
    id: profile.id, companyName: profile.organizationName || profile.fullName, partnerType: profile.partnerType ?? 4,
    description: profile.bio, industry: profile.industry, website: profile.websites[0] ?? null, websites: profile.websites,
    phone: profile.phone, address: profile.address, contactEmail: profile.contactEmail,
    avatarUrl: profile.avatarUrl, coverUrl: profile.coverUrl, isVerified: profile.isVerified,
    updatedAt: '', openJobs: [], introduction: profile.introduction,
  } : null;

  if (isOwnPartner) return <SafeAreaView style={s.safe} edges={safeAreaEdges}>
    <DetailNavigation title="Hồ sơ đối tác" role={1} onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} />
    <CompanyProfile />
  </SafeAreaView>;
  if (partnerProfile) return <SafeAreaView style={s.safe} edges={safeAreaEdges}>
    <DetailNavigation title="Hồ sơ đối tác" role={1} onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} />
    <CompanyProfile publicProfile={partnerProfile} />
  </SafeAreaView>;

  return <SafeAreaView style={s.safe} edges={safeAreaEdges}>
    <DetailNavigation title={title} role={viewedRole ?? 0} onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} />
    {error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ" color={colors.primary} /></View>
      : profile?.role === 0 && data.studentPortfolio ? <StudentPortfolioView id={id} portfolio={data.studentPortfolio} isAuthenticated={isAuthenticated} viewerKey={viewerKey} width={width} frameWidth={frameWidth} setFrameWidth={setFrameWidth} />
      : profile ? <ScrollView contentContainerStyle={s.readOnlyContent}>
        <View testID="public-role-profile" style={s.identity}>
          {profile.coverUrl ? <Image accessibilityLabel="Ảnh bìa hồ sơ" source={{ uri: profile.coverUrl }} style={s.cover} /> : <View style={s.coverFallback} />}
          <View style={s.person}>
            <View style={s.avatar}>{profile.avatarUrl ? <Image accessibilityLabel={`Ảnh đại diện của ${profile.fullName}`} source={{ uri: profile.avatarUrl }} style={s.avatarImage} /> : <Text style={s.avatarText}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>}</View>
            <View style={s.personText}><Text accessibilityRole="header" style={s.name}>{profile.organizationName || profile.fullName}</Text>
              {!!profile.isVerified && <Text style={s.verified}>Đã xác minh</Text>}
              <Text style={s.role}>{profile.role === 2 ? 'Thẩm định viên' : 'Thành viên UniNet'}</Text>
              {profile.role === 2 && <FriendProfileActions profileId={profile.id} />}
            </View>
          </View>
          {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}
          {!!profile.universityName && <Text style={s.meta}>{profile.universityName}{profile.major ? ` · ${profile.major}` : ''}</Text>}
        </View>
        {isAuthenticated && <CommunityProfilePosts key={`${viewerKey}:${id}`} profileId={profile.id} readOnly showHeading title="Bài viết" emptyMessage="Chưa có bài viết công khai." communityHref="/(tabs)/community" />}
      </ScrollView> : null}
  </SafeAreaView>;
}

function StudentPortfolioView({ id, portfolio, isAuthenticated, viewerKey, width, frameWidth, setFrameWidth }: { id: string; portfolio: PortfolioResponse; isAuthenticated: boolean; viewerKey: string | undefined; width: number; frameWidth: number; setFrameWidth: (width: number) => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');
  useEffect(() => { setActiveTab('profile'); }, [id, viewerKey]);
  return <>
    <View testID="profile-view-header" style={[s.toolbar, width < 600 && s.mobileToolbar]}>
      <View role="tablist" aria-label="Nội dung hồ sơ" style={s.tabs}>
        {([{ id: 'profile', label: 'Hồ sơ' }, { id: 'posts', label: 'Bài viết' }] as const).map(tab => <Pressable key={tab.id} role="tab" aria-label={tab.label} aria-selected={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} style={[s.tab, activeTab === tab.id && s.activeTab]}><Text style={[s.tabLabel, activeTab === tab.id && s.activeLabel]}>{tab.label}</Text></Pressable>)}
      </View>
      <View testID="profile-view-actions" style={s.actions}><FriendProfileActions profileId={portfolio.profile.id} /></View>
    </View>
    <ScrollView key={`${id}:${activeTab}`} contentContainerStyle={s.content}>
      {activeTab === 'profile' ? <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={getProfileTemplate(portfolio.portfolio.appearance.profile.template).id} data={portfolio} theme={getProfileTheme(getProfileTemplate(portfolio.portfolio.appearance.profile.template).id, portfolio.portfolio.appearance.profile.theme)} width={Math.min(frameWidth || width, 1120)} /></View>
        : isAuthenticated ? <View style={s.posts}><CommunityProfilePosts key={`${viewerKey}:${id}`} profileId={portfolio.profile.id} readOnly showHeading={false} title="Bài viết" emptyMessage="Chưa có bài viết công khai." communityHref="/(tabs)/community" /></View> : <Text style={s.signIn}>Đăng nhập để xem bài viết.</Text>}
    </ScrollView>
  </>;
}

const s = StyleSheet.create({
  toolbar: { width: '100%', maxWidth: 1120, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 4, borderBottomWidth: 1, borderColor: '#E2E9F5', backgroundColor: '#F8FAFE' }, mobileToolbar: { paddingHorizontal: 10, gap: 6 }, tabs: { flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 0 }, tab: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: colors.primary }, tabLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' }, activeLabel: { color: colors.primary }, actions: { marginLeft: 'auto', maxWidth: '100%', paddingVertical: 4 },
  safe: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, posts: { padding: 16 }, signIn: { padding: 24, color: colors.textSecondary, textAlign: 'center' }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, error: { color: colors.error, textAlign: 'center', lineHeight: 22 },
  readOnlyContent: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 16, gap: 16 }, identity: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, cover: { width: '100%', height: 180, resizeMode: 'cover' }, coverFallback: { height: 140, backgroundColor: colors.primaryLight }, person: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }, avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: colors.primary, fontSize: 25, fontWeight: '800' }, personText: { flex: 1, gap: 4 }, name: { color: colors.navy, fontSize: 20, fontWeight: '800' }, role: { color: colors.textSecondary, fontSize: 13 }, verified: { color: colors.primary, fontSize: 12, fontWeight: '700' }, bio: { paddingHorizontal: 18, paddingBottom: 12, color: colors.textPrimary, fontSize: 14, lineHeight: 22 }, meta: { paddingHorizontal: 18, paddingBottom: 18, color: colors.textSecondary, fontSize: 13 },
});
