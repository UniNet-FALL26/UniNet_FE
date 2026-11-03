import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { ToastHost } from '@/components/ui/ToastHost';
import { PartnerVerification } from '@/components/company/PartnerVerification';
import { usePartnerVerification } from '@/hooks/usePartnerVerification';
import { verificationPresentation } from '@/utils/student-verification';
import type { AuthAccount } from '@/types/auth';
import type { PartnerVerificationStatus } from '@/services/company.service';

type Props = { account: AuthAccount; name: string; onClose: () => void; onStatusChange?: (value: PartnerVerificationStatus) => void };

export function PartnerAccountModal({ account, name, onClose, onStatusChange }: Props) {
  const [stage, setStage] = useState<'account' | 'form'>('account');
  const verification = usePartnerVerification(account.id, stage === 'account', onStatusChange);
  const { value, loading, error, refresh, apply } = verification;
  const closeButton = useRef<View | null>(null);
  useEffect(() => {
    if (stage !== 'account') return;
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [stage]);
  const formStatusChanged = useCallback((next: PartnerVerificationStatus) => {
    apply(next);
    if (next.status === 0 || next.status === 1) setStage('account');
  }, [apply]);
  if (stage === 'form') return <PartnerVerification onClose={() => setStage('account')} onStatusChange={formStatusChanged} />;
  const presentation = value && !error ? verificationPresentation({ status: value.status === 3 ? null : value.status, isVerified: value.status === 1 || (value.status === null && !!account.profile?.isVerified) }) : null;
  const editable = presentation?.state === 'unverified' || presentation?.state === 'rejected';
  const title = presentation?.state === 'pending' ? 'Yêu cầu xác minh đã được gửi' : presentation?.state === 'approved' ? 'Đã xác minh đối tác' : presentation?.state === 'rejected' ? 'Yêu cầu xác minh chưa được chấp thuận' : value?.status === 3 ? 'Tài khoản đối tác cần xác minh lại' : 'Tài khoản đối tác chưa xác minh';
  const description = presentation?.state === 'pending' ? 'Thông tin xác minh của tổ chức đã được gửi thành công và đang chờ xét duyệt. Chúng tôi sẽ thông báo khi có kết quả.' : presentation?.state === 'approved' ? 'Thông tin tổ chức của bạn đã được phê duyệt trên UniNet.' : presentation?.state === 'rejected' ? value?.rejectReason || 'Vui lòng kiểm tra lại thông tin và giấy tờ trước khi gửi lại.' : 'Xác minh thông tin tổ chức để tăng độ tin cậy cho hồ sơ và kết nối với cộng đồng sinh viên trên UniNet.';
  const submittedAt = formatDate(value?.submittedAt);
  const reviewedAt = formatDate(value?.reviewedAt);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose} accessibilityLabel="Thông tin tài khoản">
    <View style={s.scrim}><ToastHost modal /><View testID="partner-account-panel" accessibilityViewIsModal style={s.dialog}>
      <View style={s.heading}><Text role="heading" aria-level={2} style={s.title}>Thông tin tài khoản</Text><Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel="Đóng thông tin tài khoản" onPress={onClose} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={19} tintColor={colors.navy} /></Pressable></View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Detail label="Tên hiển thị" value={name} />
        <Detail label="Email đăng nhập" value={account.email} />
        <Detail label="Vai trò" value="Đối tác" />
        <View style={s.detail}><Text style={s.small}>Trạng thái xác minh</Text>{presentation ? <View style={[s.badge, { backgroundColor: presentation.background }]}><Text style={[s.badgeText, { color: presentation.color }]}>{presentation.label}</Text></View> : loading ? <ActivityIndicator accessibilityLabel="Đang tải trạng thái xác minh" color={colors.primary} /> : <Text style={s.small}>Chưa tải được trạng thái xác minh.</Text>}</View>
        {presentation && <>
          <View style={[s.notice, { backgroundColor: presentation.background }]}>
            <View style={[s.noticeIcon, { backgroundColor: presentation.color + '12' }]}><SymbolView name={presentation.state === 'pending' ? { ios: 'clock', android: 'schedule', web: 'schedule' } : presentation.state === 'approved' ? { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' } : { ios: 'exclamationmark.shield', android: 'gpp_maybe', web: 'gpp_maybe' }} size={29} tintColor={presentation.color} /></View>
            <View style={s.copy}><Text style={[s.noticeTitle, { color: presentation.color }]}>{title}</Text><Text style={s.small}>{description}</Text></View>
          </View>
          {presentation.state === 'unverified' ? <View style={s.benefits}><Text style={s.small}>✧ Tăng độ tin cậy cho hồ sơ tổ chức</Text><Text style={s.small}>✧ Kết nối với cộng đồng sinh viên trên UniNet</Text></View> : <View style={s.submitted}>
            <View style={s.submittedHeading}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={18} tintColor={colors.primary} /><Text style={s.noteTitle}>{presentation.state === 'approved' ? 'Thông tin đã được duyệt' : 'Thông tin đã gửi'}</Text></View>
            <SnapshotRow label="Tên tổ chức" value={value?.organizationName} />
            <SnapshotRow label="Mã số thuế / mã đăng ký" value={value?.taxCode} />
            <SnapshotRow label="Người đại diện" value={value?.representativeName} />
            <SnapshotRow label="Ngày gửi" value={submittedAt} />
            {!!reviewedAt && <SnapshotRow label={presentation.state === 'approved' ? 'Ngày xác minh' : 'Ngày xét duyệt'} value={reviewedAt} />}
            <SnapshotRow label="Trạng thái" value={presentation.label} />
          </View>}
          {presentation.state === 'pending' && <Text style={s.small}>Bạn có thể chỉnh sửa và gửi lại nếu thông tin bị từ chối.</Text>}
        </>}
        {!!error && <View style={s.retry}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử tải trạng thái lại" variant="outline" onPress={() => { void refresh(); }} disabled={loading} style={s.secondaryButton} textStyle={s.actionButtonText} /></View>}
      </ScrollView>
      {editable && <View style={s.footer}><Button title={presentation?.state === 'rejected' ? 'Cập nhật và gửi lại →' : 'Xác minh tài khoản →'} accessibilityLabel={presentation?.state === 'rejected' ? 'Cập nhật và gửi lại' : 'Xác minh tài khoản'} onPress={() => setStage('form')} disabled={loading} style={s.redButton} textStyle={s.actionButtonText} /></View>}
    </View></View>
  </Modal>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={s.detail}><Text style={s.small}>{label}</Text><Text selectable style={s.detailValue}>{value}</Text></View>; }
function SnapshotRow({ label, value }: { label: string; value?: string | null }) { return <View style={s.snapshotRow}><Text style={s.snapshotLabel}>{label}</Text><Text selectable style={s.snapshotValue}>{value || 'Chưa có thông tin'}</Text></View>; }
function formatDate(value?: string | null) { return value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : null; }

const s = StyleSheet.create({
  secondaryButton: { minHeight: 44, paddingHorizontal: 14 }, actionButtonText: { fontSize: 14, lineHeight: 20 },
  scrim: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.55)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: colors.surface, width: '100%', maxWidth: 460, maxHeight: '94%', borderRadius: 18, overflow: 'hidden', boxShadow: '0 16px 48px rgba(16,40,75,0.15)' },
  heading: { paddingLeft: 22, paddingRight: 12, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '800' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { paddingHorizontal: 22, paddingBottom: 18, gap: 15 },
  detail: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 6 }, detailValue: { color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  small: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, alignSelf: 'flex-start' }, badgeText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  notice: { padding: 15, borderRadius: 13, gap: 12, flexDirection: 'row', alignItems: 'flex-start' }, noticeIcon: { width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 6 }, noticeTitle: { fontSize: 13, lineHeight: 20, fontWeight: '700' }, benefits: { gap: 7, paddingHorizontal: 12 },
  submitted: { backgroundColor: '#F5F8FF', borderRadius: 12, padding: 14, gap: 10 }, submittedHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }, noteTitle: { color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '700' }, snapshotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, snapshotLabel: { flex: 0.42, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, snapshotValue: { flex: 0.58, minWidth: 0, color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '500' },
  retry: { gap: 10 }, error: { color: colors.error, fontSize: 12, lineHeight: 19 }, footer: { paddingHorizontal: 22, paddingBottom: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, redButton: { backgroundColor: '#F63740', minHeight: 44 },
});
