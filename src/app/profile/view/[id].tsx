import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { StudentProfileStarter } from '@/components/profile/StudentProfileStarter';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { portfolioService } from '@/services/portfolio.service';
import { shouldShowPortfolio } from '@/utils/student-profile';
import { colors } from '@/constants/colors';
import type { PortfolioResponse } from '@/types/portfolio';
import { useAuthStore } from '@/store/auth.store';

export default function StudentProfileViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const viewerKey = isAuthenticated ? account?.id : 'anonymous';
  const [loaded, setLoaded] = useState<{ id: string; viewerKey: string | undefined; data: PortfolioResponse } | null>(null);
  const data = !isLoading && loaded?.id === id && loaded?.viewerKey === viewerKey ? loaded?.data : null;
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const [frameWidth, setFrameWidth] = useState(0);
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    const controller = new AbortController(); setLoaded(null); setError('');
    if (isLoading) return () => controller.abort();
    portfolioService.getById(id, controller.signal).then(result => { if (!controller.signal.aborted) setLoaded({ id, viewerKey, data: result }); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể xem hồ sơ này.'); });
    return () => controller.abort();
  }, [id, attempt, viewerKey, isLoading]);
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme);
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} style={s.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.textPrimary} /></Pressable><Text role="heading" aria-level={1} style={s.title}>Hồ sơ sinh viên</Text></View>
    {error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : !data ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ sinh viên" color={colors.primary} /></View> : <ScrollView contentContainerStyle={s.content}>
      {shouldShowPortfolio(data) ? <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={template.id} data={data} theme={theme} width={Math.min(frameWidth || width, 1120)} /></View> : <StudentProfileStarter profile={data.profile} width={width} />}
    </ScrollView>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, error: { color: colors.error, textAlign: 'center', lineHeight: 22 },
});
