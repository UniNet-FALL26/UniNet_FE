import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModulePage } from '@/components/ui/ModulePage';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { StudentVerificationModal } from '@/components/settings/StudentVerificationModal';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { StudentProfileStarter } from '@/components/profile/StudentProfileStarter';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { ProfilePhotoForm } from '@/components/profile/ProfilePhotoForm';
import type { ImagePickerAsset } from 'expo-image-picker';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { shouldShowPortfolio } from '@/utils/student-profile';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { updateProfileField } from '@/utils/profile-fields';
import { verificationReminder } from '@/utils/verification-reminder';
import { VerificationBanner } from '@/components/profile/VerificationBanner';
import type { PortfolioResponse } from '@/types/portfolio';

export default function ProfileScreen() {
  const { account, isAuthenticated } = useAuthStore();
  const student = account?.role === ACCOUNT_ROLE.STUDENT;
  const [loaded, setLoaded] = useState<{ accountId: string; data: PortfolioResponse } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [columnWidth, setColumnWidth] = useState(0);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [avatarPhoto, setAvatarPhoto] = useState<{ accountId: string; asset: ImagePickerAsset } | null>(null);
  const [reminderNow, setReminderNow] = useState(Date.now);
  const [dismissedReminderAccount, setDismissedReminderAccount] = useState<string | null>(null);
  const [verificationAccountId, setVerificationAccountId] = useState<string | null>(null);
  const showVerification = student && isAuthenticated && !!account && verificationAccountId === account.id;
  const verification = useStudentVerification(showVerification ? account.id : undefined);
  const photoController = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const profileWidth = desktop ? columnWidth || width - 456 : width;
  const data = isAuthenticated && loaded?.accountId === account?.id ? loaded?.data : null;
  useFocusEffect(useCallback(() => {
    setReminderNow(Date.now());
    const timer = setInterval(() => setReminderNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []));
  useFocusEffect(useCallback(() => {
    setLoaded(null); setError(''); setPhotoMessage(''); setPhotoError(false); setChangingPhoto(false); setAvatarPhoto(null);
    if (!student || !isAuthenticated || !account?.id) return;
    const controller = new AbortController();
    const accountId = account.id;
    portfolioService.getMine(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (!result.isOwner) throw new Error('Không tải được hồ sơ của bạn. Vui lòng thử lại.');
      setLoaded({ accountId, data: result });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ. Vui lòng thử lại.'); });
    return () => { controller.abort(); photoController.current?.abort(); photoController.current = null; setAvatarPhoto(null); };
  }, [account?.id, student, isAuthenticated, attempt]));
  const chooseTemplate = () => router.push('/profile/templates');
  const changePhoto = async (target: 'avatarUrl' | 'coverUrl') => {
    if (!data || !account?.id || photoController.current || avatarPhoto) return;
    const accountId = account.id;
    const controller = new AbortController(); photoController.current = controller;
    setChangingPhoto(true); setPhotoMessage(''); setPhotoError(false);
    try {
      const asset = await pickProfileImage();
      if (!asset || controller.signal.aborted) return;
      if (target === 'avatarUrl') { setAvatarPhoto({ accountId, asset }); return; }
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
  const saveAvatar = async (url: string) => {
    if (!data || !account?.id || avatarPhoto?.accountId !== account.id || photoController.current) return;
    const accountId = account.id;
    const controller = new AbortController(); photoController.current = controller;
    setAvatarPhoto(null); setChangingPhoto(true); setPhotoMessage(''); setPhotoError(false);
    try {
      const result = await portfolioService.saveEditor(updateProfileField(data, 'avatarUrl', url), controller.signal);
      if (!controller.signal.aborted) { setLoaded({ accountId, data: result }); setPhotoMessage('Đã cập nhật ảnh.'); }
    } catch (cause) {
      if (!controller.signal.aborted) { setPhotoError(true); setPhotoMessage(cause instanceof Error ? cause.message : 'Chưa cập nhật được ảnh. Vui lòng thử lại.'); }
    } finally {
      if (photoController.current === controller) { photoController.current = null; setChangingPhoto(false); }
    }
  };
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme);
  const reminder = verificationReminder(account?.createdAt, data?.profile.isVerified ?? account?.profile?.isVerified ?? false, reminderNow);
  const showReminder = isAuthenticated && !!reminder && dismissedReminderAccount !== account?.id;
  const compactHeader = profileWidth < 600 || !student;
  const showStarter = student && !!data && !shouldShowPortfolio(data);
  const header = <View style={[styles.header, desktop && student && styles.desktopHeader, showStarter && styles.starterHeader, showStarter && profileWidth < 700 && styles.compactStarterHeader, !student && { maxWidth: 600 }]}>
    <View style={styles.reminderSlot}>{showReminder && <VerificationBanner compact={compactHeader} onVerify={() => student && account ? setVerificationAccountId(account.id) : router.push('/settings')} onDismiss={() => setDismissedReminderAccount(account?.id ?? null)} />}</View>
    <View style={[styles.headerActions, compactHeader && styles.compactHeaderActions]}>
      {student && <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ" onPress={() => router.push({ pathname: '/profile/editor', params: { template: template.id, theme: theme.id } })} style={({ pressed }) => [styles.settings, compactHeader && styles.compactSettings, pressed && styles.pressed]}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={23} tintColor={colors.textPrimary} /></Pressable>}
      {(!desktop || !student) && <Pressable accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settings, compactHeader && styles.compactSettings, pressed && styles.pressed]}><SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={23} tintColor={colors.textPrimary} /></Pressable>}
    </View>
  </View>;
  if (!student) return <ModulePage title="Cá nhân" description="Thông tin và hoạt động của bạn trên UniNet." sections={['Hồ sơ của tôi', 'Bài viết đã lưu', 'Cài đặt']} header={header} />;
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={[styles.body, desktop && styles.desktopBody]}>
    <View testID="profile-main-column" style={[styles.mainColumn, desktop && styles.desktopMainColumn]} onLayout={event => { if (desktop) setColumnWidth(event.nativeEvent.layout.width); }}>
    {header}
    {changingPhoto && <View style={styles.photoStatus}><ActivityIndicator color={colors.primary} /><Text>Đang cập nhật ảnh…</Text></View>}
    {!!photoMessage && <Text accessibilityRole="alert" style={[styles.photoMessage, photoError && { color: colors.error }]}>{photoMessage}</Text>}
    {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data ? <View style={styles.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ" color={colors.primary} /></View>
      : <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data && shouldShowPortfolio(data) ? <View style={[styles.saved, desktop && styles.desktopSaved]}>
          <View testID="profile-template-frame" onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={template.id} data={data} theme={theme} width={desktop ? frameWidth || profileWidth : Math.min(frameWidth || width, 1120)} /></View>
        </View> : <StudentProfileStarter key={data.profile.id} profile={data.profile} width={profileWidth} onChooseTemplate={chooseTemplate} onChangePhoto={target => { void changePhoto(target); }} changingPhoto={changingPhoto} />}
      </ScrollView>}
    </View>
    {desktop && <View testID="profile-settings-column" style={styles.settingsColumn}><SettingsPanel embedded onPortfolioChanged={result => { if (account?.id && result.isOwner) setLoaded({ accountId: account.id, data: result }); }} /></View>}
    </View>
    {avatarPhoto && isAuthenticated && avatarPhoto.accountId === account?.id && <ProfilePhotoForm portrait initialAsset={avatarPhoto.asset} confirmationHint="Xác nhận để lưu ảnh đại diện này vào hồ sơ của bạn." onClose={() => setAvatarPhoto(null)} onConfirm={url => { void saveAvatar(url); }} />}
    {showVerification && <StudentVerificationModal key={account.id} account={account} name={account.profile?.displayName || account.profile?.fullName || account.email.split('@')[0]} schoolName={data?.profile.universityName} value={verification.value} loading={verification.loading} error={verification.error} onRefresh={verification.refresh} onSubmitted={verification.submitted} onClose={() => setVerificationAccountId(null)} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  body: { flex: 1, minHeight: 0 }, desktopBody: { width: '100%', maxWidth: 1800, alignSelf: 'center', flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }, mainColumn: { flex: 1, minWidth: 0, minHeight: 0 }, settingsColumn: { width: 400, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  desktopSaved: { alignSelf: 'flex-start', maxWidth: '100%' }, desktopHeader: { maxWidth: '100%', paddingHorizontal: 0 }, desktopMainColumn: { marginTop: -13 },
  starterHeader: { maxWidth: 1000, paddingHorizontal: 24 }, compactStarterHeader: { paddingHorizontal: 16 },
  safe: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.background }, scrollContent: { paddingBottom: 24 },
  photoStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }, photoMessage: { color: colors.textPrimary, textAlign: 'center', padding: 8 },
  header: { flexShrink: 0, zIndex: 1, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactHeaderActions: { gap: 4 }, compactSettings: { width: 32, height: 36 },
  reminderSlot: { flex: 1, minWidth: 0, flexDirection: 'row' }, settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, pressed: { opacity: 0.65 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }, error: { color: colors.error, fontSize: 14, lineHeight: 22, textAlign: 'center' }, saved: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
});
