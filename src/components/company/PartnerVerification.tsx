import { ActionFeedback } from '@/components/ui/ActionFeedback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CompanyIcon, CompanyPage, companyColors as c, PageScroll } from '@/components/company/company-ui';
import { Button } from '@/components/ui/Button';
import { ToastHost } from '@/components/ui/ToastHost';
import { companyService, type CompanyProfile, type PartnerVerificationStatus, type VerificationDocumentType } from '@/services/company.service';
import { VerificationDocumentPicker } from '@/components/settings/VerificationDocumentPicker';
import type { VerificationDocument } from '@/types/student-verification';
import { authStore, useAuthStore } from '@/store/auth.store';

const statusText = (status: PartnerVerificationStatus['status']) => status === 0 ? 'Hồ sơ đang được xét duyệt' : status === 1 ? 'Tài khoản đã được xác minh' : status === 2 ? 'Hồ sơ cần bổ sung' : status === 3 ? 'Cần xác minh lại' : 'Chưa gửi hồ sơ';
const documentTypeFor = (partnerType: number): VerificationDocumentType => partnerType === 0 || partnerType === 2 ? 3 : partnerType === 1 || partnerType === 3 ? 4 : 5;
const isValidHttpsUrl = (value: string) => {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname;
  } catch { return false; }
};

type DocumentDraft = { id: string; fileName: string; mode: 'url' | 'file'; url: string; file: VerificationDocument | null };

function Field({ label, value, onChangeText, placeholder, error, disabled, optional, url = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; error?: string; disabled?: boolean; optional?: boolean; url?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}><View style={s.labelRow}><Text style={s.label}>{label}</Text>{optional && <Text style={s.optional}>Không bắt buộc</Text>}</View><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} editable={!disabled} autoCapitalize="none" autoCorrect={false} keyboardType={url ? 'url' : 'default'} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, focused && s.inputFocused, !!error && s.inputError]} />{!!error && <Text accessibilityRole="alert" style={s.fieldError}>{error}</Text>}</View>;
}

type Props = { onClose?: () => void; onStatusChange?: (status: PartnerVerificationStatus) => void };

export function PartnerVerification({ onClose, onStatusChange }: Props) {
  const { account } = useAuthStore();
  const accountRef = useRef(account); accountRef.current = account;
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [status, setStatus] = useState<PartnerVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [documents, setDocuments] = useState<DocumentDraft[]>([{ id: 'document-1', fileName: '', mode: 'url', url: '', file: null }]);
  const [nextDocumentId, setNextDocumentId] = useState(2);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>('document-1');
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const submitRequest = useRef<AbortController | null>(null);
  useEffect(() => () => submitRequest.current?.abort(), []);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void Promise.all([companyService.getProfile(controller.signal), companyService.getVerificationStatus(controller.signal)])
      .then(([nextProfile, nextStatus]) => {
        if (controller.signal.aborted) return;
        setProfile(nextProfile); setStatus(nextStatus); onStatusChange?.(nextStatus);
        const current = accountRef.current;
        if (current?.profile?.id === nextProfile.id && current.profile.isVerified !== nextProfile.isVerified)
          authStore.updateAccount({ ...current, profile: { ...current.profile, isVerified: nextProfile.isVerified } });
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái xác minh.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, onStatusChange]));

  const submit = async () => {
    if (!profile || saving || submitRequest.current) return;
    if (status?.status === 0 || status?.status === 1) return;
    if (taxCode.trim().length > 50 || representativeName.trim().length > 255) {
      setFormNotice({ type: 'error', title: 'Thông tin xác minh quá dài', message: taxCode.trim().length > 50 ? 'Mã số thuế tối đa 50 ký tự.' : 'Tên người đại diện tối đa 255 ký tự.' });
      return;
    }
    const errors: Record<string, string> = {};
    for (const document of documents) {
      if (!document.fileName.trim()) errors[document.id] = 'Nhập tên tài liệu.';
      else if (document.fileName.trim().length > 255) errors[document.id] = 'Tên tài liệu không được dài quá 255 ký tự.';
      else if (document.mode === 'url' && !isValidHttpsUrl(document.url.trim())) errors[document.id] = 'Nhập URL HTTPS hợp lệ (tối đa 2.048 ký tự).';
      else if (document.mode === 'file' && documentErrors[document.id]) errors[document.id] = documentErrors[document.id];
      else if (document.mode === 'file' && !document.file) errors[document.id] = 'Chọn ảnh hoặc tệp PDF.';
    }
    setDocumentErrors(errors);
    if (documents.length === 0 || Object.keys(errors).length > 0) {
      setExpandedDocumentId(documents.find(document => errors[document.id])?.id ?? null);
      setFormNotice({ type: 'error', title: 'Chưa thể gửi hồ sơ', message: documents.length === 0 ? 'Thêm ít nhất một tài liệu xác minh.' : `Có ${Object.keys(errors).length} tài liệu cần kiểm tra. Lỗi được ghi bên dưới từng tài liệu.` });
      return;
    }
    setFormNotice(null);
    setSaving(true);
    const controller = new AbortController();
    submitRequest.current = controller;
    try {
      const next = await companyService.submitVerification({
        taxCode: taxCode.trim() || null,
        representativeName: representativeName.trim() || null,
        documents: documents.map(document => ({
          type: documentTypeFor(profile.partnerType), fileName: document.fileName.trim(),
          url: document.mode === 'url' ? document.url.trim() : null,
          document: document.mode === 'file' ? document.file : null,
        })),
      }, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(next);
      onStatusChange?.(next);
      setFormNotice({ type: 'success', title: 'Đã gửi hồ sơ', message: 'Admin sẽ xem xét hồ sơ xác minh tài khoản đối tác của bạn.' });
    } catch (cause) {
      if (!controller.signal.aborted) setFormNotice({ type: 'error', title: 'Không gửi được hồ sơ', message: cause instanceof Error ? cause.message : 'Vui lòng thử lại.' });
    } finally { submitRequest.current = null; if (!controller.signal.aborted) setSaving(false); }
  };

  const updateDocument = (id: string, update: Partial<DocumentDraft>) => {
    setDocuments(current => current.map(item => item.id === id ? { ...item, ...update } : item));
    // The picker reports validation errors before clearing an invalid file.
    if (update.file !== null) setDocumentErrors(current => { const next = { ...current }; delete next[id]; return next; });
    setFormNotice(null);
  };
  const addDocument = () => {
    if (documents.length >= 10) return;
    const id = `document-${nextDocumentId}`;
    setNextDocumentId(value => value + 1);
    setDocuments(current => [...current, { id, fileName: '', mode: 'url', url: '', file: null }]);
    setExpandedDocumentId(id);
    setFormNotice(null);
  };

  const locked = status?.status === 0 || status?.status === 1;
  const typeLabel = profile?.partnerType === 0 ? 'Doanh nghiệp' : profile?.partnerType === 1 ? 'Trường học' : profile?.partnerType === 2 ? 'Cửa hàng / Thương hiệu' : profile?.partnerType === 3 ? 'Trung tâm đào tạo' : 'Đối tác khác';
  const close = () => { if (!submitRequest.current) { if (onClose) onClose(); else router.back(); } };
  const statusDescription = status?.status === 0 ? 'Chúng tôi đã nhận hồ sơ. Bạn có thể đóng cửa sổ và theo dõi kết quả tại đây.' : status?.status === 1 ? 'Thông tin tổ chức của bạn đã được xác thực trên UniNet.' : status?.status === 2 ? status.rejectReason || 'Vui lòng kiểm tra thông tin và bổ sung giấy tờ trước khi gửi lại.' : status?.status === 3 ? 'Hồ sơ trước không còn hiệu lực. Vui lòng kiểm tra thông tin và gửi lại.' : 'Hoàn thiện thông tin và thêm giấy tờ để xác minh tổ chức của bạn.';
  const header = <View style={s.header}>
    <View style={s.headerIcon}><CompanyIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} size={22} /></View>
    <View style={s.heading}><Text role="heading" aria-level={onClose ? 2 : 1} style={s.title}>{onClose ? 'Xác minh tài khoản đối tác' : 'Xác minh tổ chức'}</Text><Text numberOfLines={1} style={s.subtitle}>{profile?.companyName || 'Hồ sơ tổ chức UniNet'}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng xác minh đối tác" disabled={saving} onPress={close} style={({ pressed }) => [s.close, pressed && s.pressed]}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color={c.muted} /></Pressable>
  </View>;
  const form = <>
    {!!formNotice && <ActionFeedback type={formNotice.type} message={formNotice.message} />}
    {loading ? <View style={s.loading}><ActivityIndicator color={c.blue} /><Text style={s.help}>Đang tải hồ sơ xác minh…</Text></View> : error ? <View style={s.section}><Text accessibilityRole="alert" style={s.fieldError}>{error}</Text><Button title="Thử lại" variant="outline" onPress={() => setReload(value => value + 1)} /></View> : <>
      <View style={[s.status, status?.status === 1 && s.approved, status?.status === 2 && s.rejected]}>
        <View style={s.statusIcon}><CompanyIcon name={status?.status === 0 ? { ios: 'clock', android: 'schedule', web: 'schedule' } : { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} size={23} color={status?.status === 1 ? '#21845A' : status?.status === 2 ? '#B94824' : c.blue} /></View>
        <View style={s.statusCopy}><Text style={s.statusTitle}>{statusText(status?.status ?? null)}</Text><Text style={s.help}>{statusDescription}</Text></View>
      </View>
      {!!profile && !locked && <>
        <View style={s.section}>
          <View style={s.sectionHeading}><View style={s.step}><Text style={s.stepLabel}>1</Text></View><Text style={s.sectionTitle}>Thông tin tổ chức</Text></View>
          <View style={s.organization}><Text style={s.orgName}>{profile.companyName}</Text><Text style={s.help}>{typeLabel} · Thông tin hiện tại sẽ được gửi kèm hồ sơ.</Text></View>
          <Field label="Mã số thuế / mã đăng ký" optional value={taxCode} onChangeText={setTaxCode} placeholder="Nhập mã số trên giấy đăng ký, nếu có" disabled={saving} />
          <Field label="Người đại diện" value={representativeName} onChangeText={setRepresentativeName} placeholder="Họ tên người đại diện tổ chức" disabled={saving} />
        </View>
        <View style={s.section}>
          <View style={s.sectionHeading}><View style={s.step}><Text style={s.stepLabel}>2</Text></View><Text style={s.sectionTitle}>Tài liệu xác minh</Text><Text style={s.documentCount}>{documents.length}/10</Text></View>
          <Text style={s.help}>Thêm ít nhất một giấy tờ chính thức của tổ chức. Bạn có thể dán liên kết hoặc tải tệp lên.</Text>
          {documents.map((document, index) => <View key={document.id} testID={`verification-document-${document.id}`} style={s.document}>
            <View style={s.documentHeading}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Tài liệu ${index + 1}`} accessibilityState={{ expanded: expandedDocumentId === document.id }} disabled={saving} onPress={() => setExpandedDocumentId(current => current === document.id ? null : document.id)} style={s.documentToggle}>
                <View style={s.documentIcon}><CompanyIcon name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={19} /></View>
                <View style={s.documentCopy}><Text style={s.documentTitle}>Tài liệu {index + 1}</Text><Text numberOfLines={1} style={s.documentSummary}>{document.fileName.trim() || 'Chưa thêm thông tin tài liệu'}</Text></View>
                <CompanyIcon name={expandedDocumentId === document.id ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={17} color={c.muted} />
              </Pressable>
              {documents.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa tài liệu ${index + 1}`} disabled={saving} onPress={() => { setDocuments(current => current.filter(item => item.id !== document.id)); setDocumentErrors(current => { const next = { ...current }; delete next[document.id]; return next; }); setExpandedDocumentId(current => current === document.id ? documents.find(item => item.id !== document.id)?.id ?? null : current); }} style={s.deleteDocument}><CompanyIcon name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={18} color={c.rose} /></Pressable>}
            </View>
            {expandedDocumentId === document.id && <View style={s.documentBody}>
              <Field label="Tên tài liệu *" value={document.fileName} onChangeText={value => updateDocument(document.id, { fileName: value })} placeholder="Ví dụ: Giấy đăng ký doanh nghiệp" error={documentErrors[document.id]?.startsWith('Nhập tên') || documentErrors[document.id]?.startsWith('Tên tài liệu') ? documentErrors[document.id] : undefined} disabled={saving} />
              <View style={s.field}><Text style={s.label}>Nguồn tài liệu</Text><View style={s.sourceOptions}>
                {(['url', 'file'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={mode === 'url' ? 'Liên kết online' : 'Tải ảnh / PDF'} accessibilityState={{ selected: document.mode === mode }} disabled={saving} onPress={() => updateDocument(document.id, { mode })} style={[s.sourceOption, document.mode === mode && s.sourceSelected]}><CompanyIcon name={mode === 'url' ? { ios: 'link', android: 'link', web: 'link' } : { ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }} size={16} color={document.mode === mode ? c.blue : c.muted} /><Text style={[s.sourceText, document.mode === mode && s.sourceTextSelected]}>{mode === 'url' ? 'Liên kết' : 'Ảnh / PDF'}</Text></Pressable>)}
              </View></View>
              {document.mode === 'url' ? <Field label="URL HTTPS của tài liệu *" value={document.url} onChangeText={value => updateDocument(document.id, { url: value })} placeholder="https://..." error={documentErrors[document.id]?.startsWith('Nhập URL') ? documentErrors[document.id] : undefined} disabled={saving} url /> : <VerificationDocumentPicker title="Ảnh hoặc PDF của giấy tờ *" value={document.file} onChange={file => updateDocument(document.id, { file })} error={documentErrors[document.id]} onError={message => setDocumentErrors(current => ({ ...current, [document.id]: message }))} disabled={saving} />}
            </View>}
          </View>)}
          <Pressable accessibilityRole="button" accessibilityLabel="Thêm tài liệu" disabled={saving || documents.length >= 10} onPress={addDocument} style={({ pressed }) => [s.addDocument, pressed && s.pressed, documents.length >= 10 && s.disabled]}><CompanyIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={17} /><Text style={s.addLabel}>{documents.length >= 10 ? 'Tối đa 10 tài liệu' : 'Thêm tài liệu'}</Text></Pressable>
          <View style={s.tip}><CompanyIcon name={{ ios: 'lock.shield', android: 'admin_panel_settings', web: 'admin_panel_settings' }} size={15} color={c.muted} /><Text style={s.tipText}>JPG, PNG hoặc PDF · Tối đa 5 MB mỗi tệp. Liên kết phải dùng HTTPS.</Text></View>
        </View>
      </>}
    </>}
  </>;
  const footer = <View style={s.footer}>
    {!loading && !error && profile && !locked ? <><Button title="Hủy" variant="outline" disabled={saving} onPress={close} style={s.cancelButton} textStyle={s.buttonLabel} /><Button title="Gửi hồ sơ xác minh" loading={saving} disabled={saving} onPress={() => { void submit(); }} style={s.submitButton} textStyle={s.buttonLabel} /></> : <>
      {!loading && !error && locked && <Button title="Kiểm tra trạng thái" variant="outline" onPress={() => setReload(value => value + 1)} style={s.fullButton} textStyle={s.buttonLabel} />}
      <Button title="Đóng" variant="outline" onPress={close} style={s.fullButton} textStyle={s.buttonLabel} />
    </>}
  </View>;
  if (onClose) return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={s.scrim} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      <ToastHost modal />
      <View testID="partner-verification-dialog" role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel="Xác minh tài khoản đối tác" style={s.dialog}>
        {header}<ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{form}</ScrollView>{footer}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
  return <CompanyPage><PageScroll contentStyle={s.pageContent}><View style={s.pageCard}>{header}<View style={s.content}>{form}</View>{footer}</View></PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  scrim: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.5)', alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 600, maxHeight: '94%', backgroundColor: c.white, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(16,40,75,0.18)' },
  pageContent: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: 20, paddingBottom: 32 },
  pageCard: { borderWidth: 1, borderColor: c.line, backgroundColor: c.white, borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: c.ink, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 12, lineHeight: 18 },
  close: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  scroll: { flexShrink: 1 },
  content: { padding: 20, gap: 20 },
  loading: { paddingVertical: 40, gap: 12, alignItems: 'center' },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, backgroundColor: '#EEF5FF' },
  approved: { backgroundColor: '#ECF9F1' },
  rejected: { backgroundColor: '#FFF2EB' },
  statusIcon: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, minWidth: 0, gap: 5 },
  statusTitle: { color: c.ink, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  help: { color: '#53657D', fontSize: 12, lineHeight: 19 },
  section: { gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  step: { width: 24, height: 24, borderRadius: 8, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: c.blue, fontSize: 12, fontWeight: '800' },
  sectionTitle: { flex: 1, color: c.ink, fontSize: 14, fontWeight: '800' },
  organization: { padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: '#FAFCFF', gap: 4 },
  orgName: { color: c.ink, fontSize: 14, fontWeight: '700' },
  field: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  label: { color: c.ink, fontSize: 12, fontWeight: '600' },
  optional: { color: c.muted, fontSize: 10 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 10, color: c.ink, fontSize: 13, backgroundColor: c.white, outlineWidth: 0 },
  inputFocused: { borderColor: c.blue, boxShadow: '0 0 0 3px rgba(23,105,224,0.08)' },
  inputError: { borderColor: c.rose },
  fieldError: { color: c.rose, fontSize: 12, lineHeight: 18 },
  documentCount: { color: c.muted, fontSize: 11 },
  document: { borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden' },
  documentHeading: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFCFF', paddingHorizontal: 12 },
  documentToggle: { flex: 1, minWidth: 0, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  documentIcon: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  documentCopy: { flex: 1, minWidth: 0, gap: 4 },
  documentTitle: { color: c.ink, fontSize: 12, fontWeight: '700' },
  documentSummary: { color: c.muted, fontSize: 10 },
  documentBody: { padding: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 14 },
  deleteDocument: { width: 32, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  sourceOptions: { flexDirection: 'row', gap: 8 },
  sourceOption: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: c.line, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sourceSelected: { borderColor: c.blue, backgroundColor: c.purpleSoft },
  sourceText: { color: c.muted, fontSize: 12, fontWeight: '600' },
  sourceTextSelected: { color: c.blue },
  addDocument: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B8CFF4', borderRadius: 10, backgroundColor: '#F8FBFF' },
  addLabel: { color: c.blue, fontSize: 12, fontWeight: '700' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  tipText: { flex: 1, color: c.muted, fontSize: 11, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FAFCFF' },
  cancelButton: { flex: 0.3, minHeight: 44, paddingHorizontal: 10 },
  submitButton: { flex: 0.7, minHeight: 44, paddingHorizontal: 10 },
  fullButton: { flex: 1, minHeight: 44 },
  buttonLabel: { fontSize: 13 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
