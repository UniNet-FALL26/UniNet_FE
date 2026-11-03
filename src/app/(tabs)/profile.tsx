import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModulePage } from '@/components/ui/ModulePage';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { StudentVerificationModal } from '@/components/settings/StudentVerificationModal';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
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
  const [reminderNow, setReminderNow] = useState(Date.now);
  const [dismissedReminderAccount, setDismissedReminderAccount] = useState<string | null>(null);
  const [verificationAccountId, setVerificationAccountId] = useState<string | null>(null);
  const showVerification = student && isAuthenticated && !!account && verificationAccountId === account.id;
  const verification = useStudentVerification(showVerification ? account.id : undefined);
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
    setLoaded(null); setError('');
    if (!student || !isAuthenticated || !account?.id) return;
    const controller = new AbortController();
    const accountId = account.id;
    portfolioService.getMine(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (!result.isOwner) throw new Error('Không tải được hồ sơ của bạn. Vui lòng thử lại.');
      setLoaded({ accountId, data: result });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ. Vui lòng thử lại.'); });
    return () => controller.abort();
  }, [account?.id, student, isAuthenticated, attempt]));
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme);
  const reminder = verificationReminder(account?.createdAt, data?.profile.isVerified ?? account?.profile?.isVerified ?? false, reminderNow);
  const showReminder = isAuthenticated && !!reminder && dismissedReminderAccount !== account?.id;
  const compactHeader = profileWidth < 600 || !student;
  const header = <View style={[styles.header, desktop && student && styles.desktopHeader, !student && { maxWidth: 600 }]}>
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
    {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View>
      : !data ? <View style={styles.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ" color={colors.primary} /></View>
      : <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.saved, desktop && styles.desktopSaved]}>
          <View testID="profile-template-frame" onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}><ProfileTemplateRenderer templateId={template.id} data={data} theme={theme} width={desktop ? frameWidth || profileWidth : Math.min(frameWidth || width, 1120)} /></View>
        </View>
      </ScrollView>}
    </View>
    {desktop && <View testID="profile-settings-column" style={styles.settingsColumn}><SettingsPanel embedded /></View>}
    </View>
    {showVerification && <StudentVerificationModal key={account.id} account={account} name={account.profile?.displayName || account.profile?.fullName || account.email.split('@')[0]} schoolName={data?.profile.universityName} value={verification.value} loading={verification.loading} error={verification.error} onRefresh={verification.refresh} onSubmitted={verification.submitted} onClose={() => setVerificationAccountId(null)} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  body: { flex: 1, minHeight: 0 }, desktopBody: { width: '100%', maxWidth: 1800, alignSelf: 'center', flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }, mainColumn: { flex: 1, minWidth: 0, minHeight: 0 }, settingsColumn: { width: 400, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  desktopSaved: { alignSelf: 'flex-start', maxWidth: '100%' }, desktopHeader: { maxWidth: '100%', paddingHorizontal: 0 }, desktopMainColumn: { marginTop: -13 },
  safe: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.background }, scrollContent: { paddingBottom: 24 },
  header: { flexShrink: 0, zIndex: 1, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactHeaderActions: { gap: 4 }, compactSettings: { width: 32, height: 36 },
  reminderSlot: { flex: 1, minWidth: 0, flexDirection: 'row' }, settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, pressed: { opacity: 0.65 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }, error: { color: colors.error, fontSize: 14, lineHeight: 22, textAlign: 'center' }, saved: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
});
