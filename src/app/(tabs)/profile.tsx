import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModulePage } from '@/components/ui/ModulePage';
import { Button } from '@/components/ui/Button';
import { StudentProfileStarter } from '@/components/profile/StudentProfileStarter';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { hasStudentPortfolioContent, shouldShowPortfolio } from '@/utils/student-profile';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { updateProfileField } from '@/utils/profile-fields';
import type { PortfolioResponse } from '@/types/portfolio';

export default function ProfileScreen() {
  const { account, isAuthenticated } = useAuthStore();
  const student = account?.role === ACCOUNT_ROLE.STUDENT;
  const [loaded, setLoaded] = useState<{ accountId: string; data: PortfolioResponse } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const photoController = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const data = isAuthenticated && loaded?.accountId === account?.id ? loaded?.data : null;
  useFocusEffect(useCallback(() => {
    setLoaded(null); setError(''); setPhotoMessage(''); setPhotoError(false); setChangingPhoto(false);
    if (!student || !isAuthenticated || !account?.id) return;
    const controller = new AbortController();
    const accountId = account.id;
    portfolioService.getMine(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (!result.isOwner) throw new Error('Không tải được hồ sơ của bạn. Vui lòng thử lại.');
      setLoaded({ accountId, data: result });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ. Vui lòng thử lại.'); });
    return () => { controller.abort(); photoController.current?.abort(); photoController.current = null; };
  }, [account?.id, student, isAuthenticated, attempt]));
  const chooseTemplate = () => router.push('/profile/templates');
  const changePhoto = async (target: 'avatarUrl' | 'coverUrl') => {
    if (target === 'avatarUrl') { router.push({ pathname: '/profile/editor', params: { photo: 'avatar' } }); return; }
    if (!data || !account?.id || photoController.current) return;
    const accountId = account.id;
    const controller = new AbortController(); photoController.current = controller;
    setChangingPhoto(true); setPhotoMessage(''); setPhotoError(false);
    try {
      const asset = await pickProfileImage();
      if (!asset || controller.signal.aborted) return;
      const url = await uploadProfileImage(asset, controller.signal);
      if (controller.signal.aborted) return;
      const result = await portfolioService.saveEditor(updateProfileField(data, target, url), controller.signal);
      if (!controller.signal.aborted) { setLoaded({ accountId, data: result }); setPhotoMessage('Đã cập nhật ảnh.'); }
    } catch (cause) {
      if (!controller.signal.aborted) { setPhotoError(true); setPhotoMessage(cause instanceof Error ? cause.message : 'Chưa cập nhật được ảnh. Vui lòng thử lại.'); }
    } finally {
      if (photoController.current === controller) { photoController.current = null; setChangingPhoto(false); }
    }
  };
  const hasContent = data && hasStudentPortfolioContent(data);
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme);
  const header = <View style={[styles.header, !student && { maxWidth: 600 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mẫu hồ sơ" onPress={chooseTemplate} style={({ pressed }) => [styles.templates, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'rectangle.grid.2x2', android: 'dashboard', web: 'dashboard' }} size={18} tintColor={colors.primary} /><Text style={styles.label}>Mẫu hồ sơ</Text>
    </Pressable>
    <View style={styles.headerActions}>
      {student && hasContent && <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ" onPress={() => router.push({ pathname: '/profile/editor', params: { template: template.id, theme: theme.id } })} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={23} tintColor={colors.textPrimary} /></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}><SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={23} tintColor={colors.textPrimary} /></Pressable>
    </View>
  </View>;
  if (!student) return <ModulePage title="Cá nhân" description="Thông tin và hoạt động của bạn trên UniNet." sections={['Hồ sơ của tôi', 'Bài viết đã lưu', 'Cài đặt']} header={header} />;
  return <SafeAreaView style={styles.safe} edges={['top']}>
    {header}
    {changingPhoto && <View style={styles.photoStatus}><ActivityIndicator color={colors.primary} /><Text>Đang cập nhật ảnh…</Text></View>}
    {!!photoMessage && <Text accessibilityRole="alert" style={[styles.photoMessage, photoError && { color: colors.error }]}>{photoMessage}</Text>}
    {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data ? <View style={styles.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ" color={colors.primary} /></View>
      : <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data && shouldShowPortfolio(data) ? <View style={styles.saved}>
          <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={template.id} data={data} theme={theme} width={Math.min(frameWidth || width, 1120)} /></View>
        </View> : <StudentProfileStarter key={data.profile.id} profile={data.profile} width={width} onChooseTemplate={chooseTemplate} onChangePhoto={target => { void changePhoto(target); }} changingPhoto={changingPhoto} />}
      </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, scrollContent: { paddingBottom: 24 },
  photoStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }, photoMessage: { color: colors.textPrimary, textAlign: 'center', padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templates: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.primaryLight }, label: { color: colors.primary, fontSize: 13, fontWeight: '700' }, settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, pressed: { opacity: 0.65 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }, error: { color: colors.error, fontSize: 14, lineHeight: 22, textAlign: 'center' }, saved: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
});
