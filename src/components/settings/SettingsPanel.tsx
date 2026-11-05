import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { ToastHost } from '@/components/ui/ToastHost';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { type Href, router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import type { NavigationProp } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { StudentVerificationModal } from '@/components/settings/StudentVerificationModal';
import { PartnerAccountModal } from '@/components/settings/PartnerAccountModal';
import type { PartnerVerificationStatus } from '@/services/company.service';
import { verificationPresentation } from '@/utils/student-verification';
import { portfolioService } from '@/services/portfolio.service';

export function SettingsPanel({ embedded = false, onPartnerVerificationStatusChange }: { embedded?: boolean; onPartnerVerificationStatusChange?: (value: PartnerVerificationStatus) => void }) {
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const { logout, loading: loggingOut, error: logoutError, clearError } = useAuth();
  const [dialog, setDialog] = useState<'account' | 'terms' | 'privacy' | null>(null);
  const params = useLocalSearchParams<{ account?: string }>();
  const navigation = useNavigation<NavigationProp<{ settings: { account?: string } }>>();
  const wide = useWindowDimensions().width >= 900 && !embedded;
  const student = account?.role === ACCOUNT_ROLE.STUDENT;
  const partner = account?.role === ACCOUNT_ROLE.PARTNER;
  const verification = useStudentVerification(student && isAuthenticated ? account?.id : undefined);
  const verificationStatus = verification.value ? verificationPresentation(verification.value) : null;
  const [school, setSchool] = useState<{ accountId: string; name: string | null } | null>(null);
  useFocusEffect(useCallback(() => {
    setSchool(null);
    if (!student || !isAuthenticated || !account?.id) return;
    const accountId = account.id, controller = new AbortController();
    // Keep the registered school available to the existing verification form.
    portfolioService.getMine(controller.signal).then(result => {
      if (!controller.signal.aborted && result.isOwner) setSchool({ accountId, name: result.profile.universityName });
    }).catch(() => {});
    return () => controller.abort();
  }, [student, isAuthenticated, account?.id]));
  useEffect(() => { setDialog(null); }, [account?.id]);
  useEffect(() => {
    if (params.account === '1' && student && isAuthenticated) {
      setDialog('account');
      navigation.setParams({ account: undefined });
    }
  }, [params.account, student, isAuthenticated, account?.id, navigation]);
  const signOut = async () => {
    if (await logout()) router.replace('/(auth)/login');
  };
  const name = account?.profile?.displayName || account?.profile?.fullName || account?.email.split('@')[0] || 'Tài khoản UniNet';
  const initials = name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
  const role = student ? 'Sinh vi\u00ean' : partner ? '\u0110\u1ed1i t\u00e1c' : account?.role === ACCOUNT_ROLE.ASSESSOR ? 'Th\u1ea9m \u0111\u1ecbnh vi\u00ean' : 'Qu\u1ea3n tr\u1ecb vi\u00ean';
  const busy = loggingOut;
  const openDialog = (value: 'account' | 'terms' | 'privacy') => { clearError(); setDialog(value); if (value === 'account' && student) void verification.refresh(); };
  const closeDialog = () => { if (!loggingOut) { setDialog(null); clearError(); } };
  return <SafeAreaView style={[s.safe, embedded && s.embeddedSafe]} edges={embedded ? [] : undefined}>
    {!embedded && <DetailNavigation title="Cài đặt" backLabel="Quay lại hồ sơ cá nhân" disabled={busy} />}
    <ScrollView showsVerticalScrollIndicator={!embedded} contentContainerStyle={[s.content, !wide && s.mobileContent, embedded && s.embeddedContent]}>
      {isLoading ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải phiên đăng nhập" color={colors.primary} /></View> : !isAuthenticated ? <View style={s.panel}><Text style={s.sectionTitle}>Chào mừng đến với UniNet</Text><Text style={s.body}>Đăng nhập để quản lý tài khoản và hồ sơ của bạn.</Text><Button style={s.actionButton} textStyle={s.actionButtonText} title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></View> : <View style={[s.columns, wide && s.wideColumns]}>
        {!embedded && <View style={[s.identity, wide && s.identityRail]}>
          <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
          <View style={s.identityCopy}><Text style={s.accountName}>{name}</Text><Text selectable style={s.email}>{account?.email}</Text><View style={s.roleBadge}><Text style={s.roleText}>{role}</Text></View></View>
          {wide && <View style={s.railNote}><Text style={s.noteTitle}>Một nơi, mọi tùy chỉnh.</Text><Text style={s.body}>Quản lý cách bạn xuất hiện và giữ tài khoản của mình an toàn.</Text></View>}
        </View>}
        <View style={s.main}>
          {embedded && <Text role="heading" aria-level={2} style={s.brand}>Cài đặt</Text>}
          {student && <View style={s.section}>
            <View style={s.sectionHeading}><Text role="heading" aria-level={2} style={s.sectionTitle}>Hồ sơ của bạn</Text><Text style={s.body}>Tạo dấu ấn riêng trong cộng đồng UniNet.</Text></View>
            <View style={s.group}>
              <SettingsRow title="Đổi mẫu hồ sơ" description="Chọn bố cục và màu sắc phù hợp với bạn." name={{ ios: 'square.grid.2x2', android: 'dashboard', web: 'dashboard' }} disabled={busy} onPress={() => router.push('/profile/templates')} />
            </View>
          </View>}
          <View style={s.section}>
            <View style={s.sectionHeading}><Text role="heading" aria-level={2} style={s.sectionTitle}>Tài khoản & bảo mật</Text><Text style={s.body}>Thông tin đăng nhập và quyền truy cập của bạn.</Text></View>
            <View style={s.group}>
              {account?.role === ACCOUNT_ROLE.ASSESSOR && <SettingsRow title="Ví thu nhập" description="Xem số dư, lịch sử và yêu cầu rút tiền." name={{ ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' }} disabled={busy} onPress={() => router.push('/wallet' as Href)} />}
              <SettingsRow title="Thông tin tài khoản" description={student ? verificationStatus?.description || (verification.error ? 'Chưa tải được trạng thái xác minh. Nhấn để thử lại.' : 'Đang tải trạng thái xác minh sinh viên…') : 'Xem email, vai trò và trạng thái xác minh.'} badge={student ? verificationStatus?.label || (verification.error ? 'Thử lại' : 'Đang tải') : undefined} badgeColor={verificationStatus?.color} badgeBackground={verificationStatus?.background} name={{ ios: 'person.crop.circle', android: 'person_outline', web: 'person_outline' }} disabled={busy} onPress={() => openDialog('account')} />
              <SettingsRow title="Đổi mật khẩu" description="Tính năng đang được phát triển." name={{ ios: 'key', android: 'key', web: 'key' }} disabled badge="Sắp có" />
            </View>
          </View>
          {partner && <View style={s.section}>
            <View style={s.sectionHeading}><Text role="heading" aria-level={2} style={s.sectionTitle}>Công cụ đối tác</Text><Text style={s.body}>Quản lý hoạt động quảng bá của tổ chức.</Text></View>
            <View style={s.group}><SettingsRow title="Quảng cáo" description="Quản lý chiến dịch và gói quảng cáo." name={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }} disabled={busy} onPress={() => router.push('/(company)/advertisement')} /></View>
          </View>}
          <View style={s.section}>
            <View style={s.sectionHeading}><Text role="heading" aria-level={2} style={s.sectionTitle}>Điều khoản & chính sách</Text><Text style={s.body}>Tìm hiểu các chính sách của UniNet.</Text></View>
            <View style={s.group}>
              <SettingsRow title="Điều khoản dịch vụ" description="Các điều khoản khi sử dụng UniNet." name={{ ios: 'doc.text', android: 'description', web: 'description' }} disabled={busy} onPress={() => openDialog('terms')} />
              <SettingsRow title="Chính sách bảo mật" description="Thông tin về quyền riêng tư của bạn." name={{ ios: 'hand.raised', android: 'privacy_tip', web: 'privacy_tip' }} disabled={busy} onPress={() => openDialog('privacy')} />
            </View>
          </View>
          <View style={s.logoutGroup}><SettingsRow title="Đăng xuất" description="Kết thúc phiên trên thiết bị này." name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} danger disabled={busy} loading={loggingOut} onPress={() => { void signOut(); }} /></View>
          {!!logoutError && <Text accessibilityRole="alert" style={s.error}>{logoutError}</Text>}
          {!embedded && <View style={s.footer} testID="settings-brand-footer">
            <View style={s.footerBrand}>
              <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={s.footerLogo} accessibilityLabel="Logo UniNet" />
              <Text style={s.footerName}>UniNet</Text>
            </View>
            <Text style={s.footerTagline}>Kết nối để cùng phát triển</Text>
          </View>}
        </View>
      </View>}
    </ScrollView>
    {dialog === 'account' && student && account && isAuthenticated && <StudentVerificationModal key={account.id} account={account} name={name} schoolName={school?.accountId === account.id ? school.name : undefined} value={verification.value} loading={verification.loading} error={verification.error} onRefresh={verification.refresh} onSubmitted={verification.submitted} onClose={closeDialog} />}
    {dialog === 'account' && partner && account && isAuthenticated && <PartnerAccountModal key={account.id} account={account} name={name} onClose={closeDialog} onStatusChange={onPartnerVerificationStatusChange} />}
    <Modal visible={dialog !== null && !(dialog === 'account' && (student || partner))} transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={s.scrim}>{dialog !== null && <ToastHost modal />}<View role="dialog" aria-modal accessibilityViewIsModal style={s.dialog}>
        <View style={s.dialogHeading}><Text role="heading" aria-level={2} style={[s.sectionTitle, { flex: 1 }]}>{dialog === 'account' ? 'Thông tin tài khoản' : dialog === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" disabled={loggingOut} onPress={closeDialog} style={({ pressed }) => [s.back, pressed && s.pressed]}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textPrimary} /></Pressable></View>
        {dialog === 'account' ? <>
          <View style={s.detail}><Text style={s.body}>Tên hiển thị</Text><Text selectable style={s.detailValue}>{name}</Text></View>
          <View style={s.detail}><Text style={s.body}>Email đăng nhập</Text><Text selectable style={s.detailValue}>{account?.email}</Text></View>
          <View style={s.detail}><Text style={s.body}>Vai trò</Text><Text style={s.detailValue}>{role}</Text></View>
          <View style={s.detail}><Text style={s.body}>Xác minh hồ sơ</Text><Text style={s.detailValue}>{account?.profile?.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}</Text></View>
          <Button style={s.actionButton} textStyle={s.actionButtonText} title="Đóng thông tin" variant="outline" onPress={closeDialog} />
        </> : <>
          <Text style={s.body}>{dialog === 'terms' ? 'Điều khoản dịch vụ chưa được cung cấp.' : 'Chính sách bảo mật chưa được cung cấp.'}</Text>
          <Button style={s.actionButton} textStyle={s.actionButtonText} title="Đã hiểu" variant="outline" onPress={closeDialog} />
        </>}
      </View></View>
    </Modal>
  </SafeAreaView>;
}

type IconName = ComponentProps<typeof SymbolView>['name'];
function SettingsIcon({ name, danger = false }: { name: IconName; danger?: boolean }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[s.icon, danger && s.dangerIcon]}><SymbolView name={name} size={19} tintColor={danger ? colors.error : colors.primary} /></View>;
}
function SettingsRow({ title, description, name, onPress, disabled, badge, badgeColor, badgeBackground, danger, loading }: { title: string; description: string; name: IconName; onPress?: () => void; disabled?: boolean; badge?: string; badgeColor?: string; badgeBackground?: string; danger?: boolean; loading?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.row, s.actionRow, pressed && s.pressed, disabled && !badge && s.disabled]}>
    <SettingsIcon name={name} danger={danger} /><View style={s.rowCopy}><Text style={[s.label, danger && s.dangerText]}>{title}</Text><Text style={s.body}>{description}</Text></View>
    {loading ? <ActivityIndicator size="small" color={colors.error} /> : badge ? <Text style={[s.soon, badgeColor ? { color: badgeColor, backgroundColor: badgeBackground, maxWidth: 100, flexShrink: 1 } : undefined]}>{badge}</Text> : <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={danger ? colors.error : colors.textSecondary} />}
  </Pressable>;
}
const s = StyleSheet.create({
  actionButton: { minHeight: 44, paddingHorizontal: 14 }, actionButtonText: { fontSize: 14, lineHeight: 20 },
  embeddedSafe: { backgroundColor: '#FFFFFF', minHeight: 0 }, embeddedContent: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 24 },
  safe: { flex: 1, backgroundColor: colors.background }, topBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, topInner: { width: '100%', maxWidth: 1040, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 }, back: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, brand: { fontSize: 18, fontWeight: '800', color: colors.navy }, breadcrumb: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 40, paddingBottom: 48 }, mobileContent: { paddingHorizontal: 20, paddingTop: 28 },
  columns: { gap: 28 }, wideColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border }, identityRail: { width: 236, flexDirection: 'column', alignItems: 'flex-start', paddingTop: 4, borderBottomWidth: 0 }, avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }, initials: { color: colors.primaryDark, fontSize: 23, fontWeight: '700' }, identityCopy: { flexShrink: 1, gap: 6, maxWidth: '100%' }, accountName: { color: colors.navy, fontSize: 19, lineHeight: 26, fontWeight: '700' }, email: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, flexShrink: 1 }, roleBadge: { alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, marginTop: 4 }, roleText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' }, railNote: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }, noteTitle: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  main: { flex: 1, minWidth: 0, gap: 28 }, section: { gap: 14 }, sectionHeading: { gap: 5 }, sectionTitle: { color: colors.navy, fontSize: 18, lineHeight: 26, fontWeight: '700' }, group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden' }, panel: { backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, minHeight: 72 }, actionRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, rowCopy: { flex: 1, minWidth: 0, gap: 5 }, label: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '600' }, body: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }, dangerIcon: { backgroundColor: colors.error + '0D' }, dangerText: { color: colors.error }, pressed: { backgroundColor: colors.primaryLight }, disabled: { opacity: 0.55 }, soon: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', backgroundColor: colors.background, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6 },
  feedback: { marginHorizontal: 18, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, state: { padding: 24, gap: 16 }, error: { color: colors.error, fontSize: 13, lineHeight: 21 }, success: { color: colors.success, fontSize: 13, lineHeight: 21 }, logoutGroup: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden' },
  footer: { alignItems: 'center', gap: 7, paddingVertical: 6 }, footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, footerLogo: { width: 30, height: 30 }, footerName: { color: colors.navy, fontSize: 17, lineHeight: 24, fontWeight: '800' }, footerTagline: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: colors.navy + '66', alignItems: 'center', justifyContent: 'center', padding: 20 }, dialog: { backgroundColor: colors.surface, width: '100%', maxWidth: 440, borderRadius: 22, padding: 24, gap: 16 }, dialogHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, detail: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 14, gap: 4 }, detailValue: { color: colors.textPrimary, fontSize: 15, lineHeight: 23, fontWeight: '500' },
});
