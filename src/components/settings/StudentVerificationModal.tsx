import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationDocumentPicker } from './VerificationDocumentPicker';
import { colors } from '@/constants/colors';
import { ApiError } from '@/services/api';
import { studentVerificationService } from '@/services/student-verification.service';
import { validateStudentVerification, verificationPresentation } from '@/utils/student-verification';
import type { AuthAccount } from '@/types/auth';
import type { StudentVerification, StudentVerificationDraft, VerificationDocument } from '@/types/student-verification';

type Props = { account: AuthAccount; name: string; schoolName?: string | null; value: StudentVerification | null; loading: boolean; error: string; onRefresh: () => Promise<StudentVerification | null>; onSubmitted: (value: StudentVerification) => Promise<void>; onClose: () => void };

export function StudentVerificationBadge({ value }: { value: StudentVerification }) {
  const presentation = verificationPresentation(value);
  return <View style={[s.badge, { backgroundColor: presentation.background }]}><Text style={[s.badgeText, { color: presentation.color }]}>{presentation.label}</Text></View>;
}

export function StudentVerificationModal({ account, name, schoolName, value, loading, error, onRefresh, onSubmitted, onClose }: Props) {
  const [stage, setStage] = useState<'account' | 'form'>('account');
  const [draft, setDraft] = useState<StudentVerificationDraft>({ fullName: '', schoolName: '', studentCode: '' });
  const [document, setDocument] = useState<VerificationDocument | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StudentVerificationDraft, string>>>({});
  const [documentError, setDocumentError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitRequest = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const closeButton = useRef<View | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; submitRequest.current?.abort(); }; }, []);
  useEffect(() => {
    if (stage !== 'account') return;
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [stage]);
  const presentation = value ? verificationPresentation(value) : null;
  const editable = presentation?.state === 'unverified' || presentation?.state === 'rejected';
  useEffect(() => {
    if (stage === 'form' && presentation && !editable && !submitting) { setStage('account'); setDocument(null); }
  }, [stage, presentation?.state, editable, submitting]);
  const openForm = () => {
    if (!editable || submitting) return;
    setDraft({ fullName: value?.fullName || account.profile?.fullName || '', schoolName: value?.schoolName || schoolName || '', studentCode: value?.studentCode || '' });
    setFieldErrors({}); setDocument(null); setDocumentError(''); setSubmitError(''); setStage('form');
  };
  const cancel = () => { if (!submitting) { setStage('account'); setDocument(null); } };
  const close = () => { if (!submitting) { if (stage === 'form') cancel(); else onClose(); } };
  const updateField = (key: keyof StudentVerificationDraft, text: string) => {
    setDraft(current => ({ ...current, [key]: text })); setFieldErrors(current => ({ ...current, [key]: undefined })); setSubmitError('');
  };
  const submit = async () => {
    if (submitRequest.current || !editable) return;
    const errors = validateStudentVerification(draft); setFieldErrors(errors);
    const missingDocument = !document ? 'Vui lòng chọn giấy tờ xác minh JPG, PNG hoặc PDF.' : '';
    setDocumentError(missingDocument); setSubmitError('');
    if (Object.keys(errors).length || !document) return;
    const controller = new AbortController(); submitRequest.current = controller; setSubmitting(true);
    try {
      const result = await studentVerificationService.submit(draft, document, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      await onSubmitted(result);
      if (alive.current && !controller.signal.aborted) { setStage('account'); setDocument(null); }
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      setSubmitError(cause instanceof Error ? cause.message : 'Chưa gửi được yêu cầu xác minh. Vui lòng thử lại.');
      if (cause instanceof ApiError && cause.status === 409) {
        const current = await onRefresh();
        if (alive.current && current && (current.status === 0 || current.isVerified)) { setStage('account'); setDocument(null); }
      }
    } finally {
      if (submitRequest.current === controller) submitRequest.current = null;
      if (alive.current) setSubmitting(false);
    }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={close} accessibilityLabel={stage === 'form' ? 'Xác minh sinh viên' : 'Thông tin tài khoản'}>
    <KeyboardAvoidingView style={s.scrim} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}><View testID="student-verification-panel" accessibilityViewIsModal style={s.dialog}>
      <View style={s.heading}><Text role="heading" aria-level={2} style={s.title}>{stage === 'form' ? 'Xác minh sinh viên' : 'Thông tin tài khoản'}</Text><Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel={stage === 'form' ? 'Đóng xác minh sinh viên' : 'Đóng thông tin tài khoản'} onPress={close} disabled={submitting} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={19} tintColor={colors.navy} /></Pressable></View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        {stage === 'form' ? <>
          <Text style={s.body}>Cung cấp thông tin và giấy tờ để xác minh bạn là sinh viên.</Text>
          <View style={s.studentNote}><View style={s.noteIcon}><SymbolView name={{ ios: 'graduationcap', android: 'school', web: 'school' }} size={26} tintColor={colors.primary} /></View><View style={s.copy}><Text style={s.noteTitle}>Chỉ dành cho sinh viên đang theo học</Text><Text style={s.small}>Thông tin xác minh của bạn được bảo mật và chỉ sử dụng cho mục đích xét duyệt.</Text></View></View>
          <Input label="Họ và tên" value={draft.fullName} onChangeText={text => updateField('fullName', text)} placeholder="Họ và tên đúng theo giấy tờ" error={fieldErrors.fullName} editable={!submitting} maxLength={255} autoFocus autoComplete="name" style={s.input} />
          <Input label="Trường đại học / cao đẳng" value={draft.schoolName} onChangeText={text => updateField('schoolName', text)} placeholder="Nhập tên trường bạn đang theo học" error={fieldErrors.schoolName} editable={!submitting} maxLength={255} style={s.input} />
          <Input label="Mã số sinh viên" value={draft.studentCode} onChangeText={text => updateField('studentCode', text)} placeholder="Nhập mã số sinh viên" error={fieldErrors.studentCode} editable={!submitting} maxLength={50} autoCapitalize="none" style={s.input} />
          <VerificationDocumentPicker value={document} onChange={setDocument} error={documentError} onError={setDocumentError} disabled={submitting} />
          <View style={s.studentNote}><SymbolView name={{ ios: 'lock', android: 'lock_outline', web: 'lock_outline' }} size={19} tintColor={colors.primary} /><View style={s.copy}><Text style={s.noteTitle}>Lưu ý</Text><Text style={s.small}>• Ảnh phải rõ nét, đầy đủ thông tin.{`\n`}• Thông tin cần trùng khớp với giấy tờ đang sử dụng.{`\n`}• Chúng tôi sẽ thông báo khi có kết quả xét duyệt.</Text></View></View>
          {!!submitError && <Text accessibilityRole="alert" style={s.error}>{submitError}</Text>}
        </> : <>
          <Detail label="Tên hiển thị" value={name} />
          <Detail label="Email đăng nhập" value={account.email} />
          <Detail label="Vai trò" value="Sinh viên" />
          <View style={s.detail}><Text style={s.small}>Xác minh hồ sơ</Text>{value ? <StudentVerificationBadge value={value} /> : loading ? <ActivityIndicator accessibilityLabel="Đang tải trạng thái xác minh" color={colors.primary} /> : <Text style={s.body}>Chưa tải được trạng thái xác minh.</Text>}</View>
          {value && presentation && <>
            <View style={[s.notice, { backgroundColor: presentation.background }]}>
              <View style={[s.noticeIcon, { backgroundColor: presentation.color + '12' }]}><SymbolView name={presentation.state === 'pending' ? { ios: 'clock', android: 'schedule', web: 'schedule' } : presentation.state === 'approved' ? { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' } : { ios: 'exclamationmark.shield', android: 'gpp_maybe', web: 'gpp_maybe' }} size={29} tintColor={presentation.color} /></View>
              <View style={s.copy}><Text style={[s.noticeTitle, { color: presentation.color }]}>{presentation.state === 'pending' ? 'Yêu cầu xác minh đã được gửi' : presentation.state === 'approved' ? 'Đã xác minh sinh viên' : presentation.state === 'rejected' ? 'Yêu cầu xác minh chưa được chấp thuận' : 'Tài khoản chưa xác minh sinh viên'}</Text><Text style={s.small}>{presentation.state === 'unverified' ? 'Xác minh tài khoản sinh viên để tăng độ tin cậy cho hồ sơ và sử dụng các quyền lợi dành riêng cho sinh viên trên UniNet.' : presentation.state === 'pending' ? 'Thông tin xác minh của bạn đã được gửi thành công và đang chờ xét duyệt. Chúng tôi sẽ thông báo khi có kết quả.' : presentation.state === 'rejected' ? value.rejectReason || 'Vui lòng kiểm tra lại thông tin và giấy tờ trước khi gửi lại.' : 'Thông tin sinh viên của bạn đã được phê duyệt.'}</Text></View>
            </View>
            {presentation.state === 'unverified' ? <View style={s.benefits}><Text style={s.small}>✧ Tăng độ tin cậy cho hồ sơ cá nhân</Text><Text style={s.small}>✧ Kết nối với cộng đồng sinh viên trên UniNet</Text></View> : <View style={s.submitted}>
              <View style={s.submittedHeading}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={18} tintColor={colors.primary} /><Text style={s.noteTitle}>{presentation.state === 'approved' ? 'Thông tin đã được duyệt' : 'Thông tin đã gửi'}</Text></View>
              <SnapshotRow label="Họ và tên" value={value.fullName} /><SnapshotRow label="Trường" value={value.schoolName} /><SnapshotRow label="Mã sinh viên" value={value.studentCode} /><SnapshotRow label="Ngày gửi" value={formatDate(value.submittedAt)} />
              {value.reviewedAt && <SnapshotRow label={presentation.state === 'approved' ? 'Ngày xác minh' : 'Ngày xét duyệt'} value={formatDate(value.reviewedAt)} />}
              <SnapshotRow label="Trạng thái" value={presentation.label} />
            </View>}
            {presentation.state === 'pending' && <Text style={s.small}>Bạn có thể chỉnh sửa và gửi lại nếu thông tin bị từ chối.</Text>}
          </>}
          {!!error && <View style={s.retry}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử tải trạng thái lại" variant="outline" onPress={() => { void onRefresh(); }} disabled={loading} style={s.secondaryButton} /></View>}
        </>}
      </ScrollView>
      <View style={s.footer}>{stage === 'form' ? <><Button title="Hủy" variant="outline" disabled={submitting} onPress={cancel} style={s.cancelButton} textStyle={{ fontSize: 12, lineHeight: 18, textAlign: 'center' }} /><Button title="Gửi yêu cầu xác minh" loading={submitting} onPress={() => { void submit(); }} style={s.submitButton} textStyle={{ fontSize: 12, lineHeight: 18, textAlign: 'center' }} /></> : editable ? <Button title={presentation?.state === 'rejected' ? 'Cập nhật và gửi lại →' : 'Xác minh tài khoản →'} accessibilityLabel={presentation?.state === 'rejected' ? 'Cập nhật và gửi lại' : 'Xác minh tài khoản'} onPress={openForm} style={s.redButton} /> : <Button title="Đóng" variant="outline" onPress={onClose} style={s.fullButton} />}</View>
    </View></KeyboardAvoidingView>
  </Modal>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={s.detail}><Text style={s.small}>{label}</Text><Text selectable style={s.detailValue}>{value}</Text></View>; }
function SnapshotRow({ label, value }: { label: string; value?: string | null }) { return <View style={s.snapshotRow}><Text style={s.snapshotLabel}>{label}</Text><Text selectable style={s.snapshotValue}>{value || 'Chưa có thông tin'}</Text></View>; }
function formatDate(value: string | null) { if (!value || Number.isNaN(Date.parse(value))) return null; return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)); }

const s = StyleSheet.create({
  scrim: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.55)', justifyContent: 'center', alignItems: 'center' }, dialog: { backgroundColor: colors.surface, width: '100%', maxWidth: 460, maxHeight: '94%', borderRadius: 18, overflow: 'hidden', boxShadow: '0 16px 48px rgba(16,40,75,0.15)' }, heading: { paddingLeft: 22, paddingRight: 12, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { flex: 1, color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '800' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, scroll: { flexShrink: 1 }, content: { paddingHorizontal: 22, paddingBottom: 18, gap: 15 }, detail: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 6 }, detailValue: { color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '600' }, body: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 }, small: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, copy: { flex: 1, minWidth: 0, gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, alignSelf: 'flex-start' }, badgeText: { fontSize: 11, lineHeight: 16, fontWeight: '700' }, notice: { padding: 15, borderRadius: 13, gap: 12, flexDirection: 'row', alignItems: 'flex-start' }, noticeIcon: { width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }, noticeTitle: { fontSize: 13, lineHeight: 20, fontWeight: '700' }, benefits: { gap: 7, paddingHorizontal: 12 }, studentNote: { backgroundColor: '#EFF5FF', padding: 13, borderRadius: 11, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, noteIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#DCEAFF', alignItems: 'center', justifyContent: 'center' }, noteTitle: { color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '700' }, input: { fontSize: 13 },
  submitted: { backgroundColor: '#F5F8FF', borderRadius: 12, padding: 14, gap: 10 }, submittedHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }, snapshotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, snapshotLabel: { flex: 0.42, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }, snapshotValue: { flex: 0.58, minWidth: 0, color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '500' }, error: { color: colors.error, fontSize: 12, lineHeight: 19 }, retry: { gap: 10 }, footer: { paddingHorizontal: 22, paddingBottom: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', gap: 8 }, redButton: { flex: 1, backgroundColor: '#F63740', minHeight: 48 }, fullButton: { flex: 1, minHeight: 46 }, cancelButton: { flex: 0.3, paddingHorizontal: 8, minHeight: 46 }, submitButton: { flex: 0.7, paddingHorizontal: 8, minHeight: 46 }, secondaryButton: { minHeight: 44 },
});
