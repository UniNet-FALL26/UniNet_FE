import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyService, type CompanyProfile, type PartnerVerificationStatus, type VerificationDocumentType } from '@/services/company.service';
import { VerificationDocumentPicker } from '@/components/settings/VerificationDocumentPicker';
import type { VerificationDocument } from '@/types/student-verification';

const statusText = (status: PartnerVerificationStatus['status']) => status === 0 ? 'Đang chờ admin duyệt' : status === 1 ? 'Đã xác minh tài khoản' : status === 2 ? 'Bị từ chối' : status === 3 ? 'Yêu cầu cũ đã hết hiệu lực' : 'Chưa gửi hồ sơ';
const statusTone = (status: PartnerVerificationStatus['status']): 'green' | 'amber' | 'rose' | 'gray' => status === 1 ? 'green' : status === 0 ? 'amber' : status === 2 ? 'rose' : 'gray';
const documentTypeFor = (partnerType: number): VerificationDocumentType => partnerType === 0 || partnerType === 2 ? 3 : partnerType === 1 || partnerType === 3 ? 4 : 5;

type DocumentDraft = { id: string; fileName: string; mode: 'url' | 'file'; url: string; file: VerificationDocument | null };

function Field({ label, value, onChangeText, placeholder, multiline = false, error }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; error?: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} autoCapitalize="none" textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.textarea, !!error && s.inputError]} />{!!error && <Text accessibilityRole="alert" style={s.fieldError}>{error}</Text>}</View>;
}

export default function PartnerVerificationScreen() {
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

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void Promise.all([companyService.getProfile(controller.signal), companyService.getVerificationStatus(controller.signal)])
      .then(([nextProfile, nextStatus]) => { setProfile(nextProfile); setStatus(nextStatus); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái xác minh.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]));

  const submit = async () => {
    if (!profile || saving) return;
    if (status?.status === 0 || status?.status === 1) return;
    const errors: Record<string, string> = {};
    for (const document of documents) {
      if (!document.fileName.trim()) errors[document.id] = 'Nhập tên tài liệu.';
      else if (document.mode === 'url' && (!document.url.trim() || !/^https:\/\//i.test(document.url.trim()))) errors[document.id] = 'Nhập URL HTTPS hợp lệ.';
      else if (document.mode === 'file' && documentErrors[document.id]) errors[document.id] = documentErrors[document.id];
      else if (document.mode === 'file' && !document.file) errors[document.id] = 'Chọn ảnh hoặc tệp PDF.';
    }
    setDocumentErrors(errors);
    if (documents.length === 0 || Object.keys(errors).length > 0) {
      setFormNotice({ type: 'error', title: 'Chưa thể gửi hồ sơ', message: documents.length === 0 ? 'Thêm ít nhất một tài liệu xác minh.' : `Có ${Object.keys(errors).length} tài liệu cần kiểm tra. Lỗi được ghi bên dưới từng tài liệu.` });
      return;
    }
    setFormNotice(null);
    setSaving(true);
    try {
      const next = await companyService.submitVerification({
        taxCode: taxCode.trim() || null,
        representativeName: representativeName.trim() || null,
        documents: documents.map(document => ({
          type: documentTypeFor(profile.partnerType), fileName: document.fileName.trim(),
          url: document.mode === 'url' ? document.url.trim() : null,
          document: document.mode === 'file' ? document.file : null,
        })),
      });
      setStatus(next);
      setFormNotice({ type: 'success', title: 'Đã gửi hồ sơ', message: 'Admin sẽ xem xét hồ sơ xác minh tài khoản đối tác của bạn.' });
    } catch (cause) {
      setFormNotice({ type: 'error', title: 'Không gửi được hồ sơ', message: cause instanceof Error ? cause.message : 'Vui lòng thử lại.' });
    } finally { setSaving(false); }
  };

  const updateDocument = (id: string, update: Partial<DocumentDraft>) => {
    setDocuments(current => current.map(item => item.id === id ? { ...item, ...update } : item));
    setDocumentErrors(current => { const next = { ...current }; delete next[id]; return next; });
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

  return <CompanyPage><PageScroll>
    <View style={s.nav}><Pressable onPress={() => router.back()} style={s.back}><CompanyIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} color={c.ink} /></Pressable><View><Text style={s.navTitle}>Xác minh tài khoản đối tác</Text><Text style={s.helper}>{profile?.companyName || 'UniNet'}</Text></View></View>
    <PageTitle title="Xác minh tổ chức" subtitle="Admin xác minh tài khoản Partner một lần; bài tuyển dụng do tổ chức tự đăng và quản lý." />
    {!!formNotice && <View accessibilityRole="alert" style={[s.notice, formNotice.type === 'success' ? s.noticeSuccess : s.noticeError]}><Text style={s.noticeTitle}>{formNotice.title}</Text><Text style={s.noticeMessage}>{formNotice.message}</Text></View>}
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải trạng thái…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!!status && <Card><View style={s.statusHead}><Text style={s.sectionTitle}>Trạng thái hồ sơ</Text><Tag tone={statusTone(status.status)}>{statusText(status.status)}</Tag></View>{status.status === 2 && !!status.rejectReason && <Text style={s.reject}>{status.rejectReason}</Text>}{status.status === 0 && <Text style={s.helper}>Bạn vẫn đăng nhập và lưu bản nháp được. Có thể đăng tuyển công khai sau khi tài khoản được duyệt.</Text>}{status.status === 1 && <Text style={s.helper}>Tài khoản đã được xác minh. Bạn có thể chủ động đăng tuyển mà không cần duyệt từng bài.</Text>}</Card>}
    {!!profile && status?.status !== 1 && status?.status !== 0 && <>
      <Card><Text style={s.sectionTitle}>Thông tin tổ chức</Text><Text style={s.orgName}>{profile.companyName}</Text><Text style={s.helper}>{typeLabel} · Thông tin được chụp lại khi gửi để admin đối chiếu.</Text>
        <Field label="Mã số thuế / mã đăng ký (không bắt buộc)" value={taxCode} onChangeText={setTaxCode} placeholder="Nếu có, nhập mã số trên giấy đăng ký" />
        <Field label="Người đại diện" value={representativeName} onChangeText={setRepresentativeName} placeholder="Họ tên người đại diện tổ chức" />
      </Card>
      <Card><Text style={s.sectionTitle}>Tài liệu xác minh *</Text><Text style={s.helper}>Thêm các giấy tờ chính thức tổ chức hiện có. Mỗi tài liệu có thể là liên kết HTTPS hoặc ảnh/PDF tải lên.</Text>
        {documents.map((document, index) => <View key={document.id} style={s.documentDraft}>
          <View style={s.documentHeading}><Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedDocumentId === document.id }} onPress={() => setExpandedDocumentId(current => current === document.id ? null : document.id)} style={s.documentToggle}><Text style={s.documentHeadingText}>Tài liệu {index + 1}</Text><Text numberOfLines={1} style={s.documentSummary}>{document.fileName.trim() || 'Chưa đặt tên'} · {document.mode === 'url' ? 'Liên kết online' : document.file?.name || 'Ảnh / PDF'}</Text><Text style={s.documentChevron}>{expandedDocumentId === document.id ? 'Thu gọn −' : 'Mở +'}</Text></Pressable>{documents.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa tài liệu ${index + 1}`} onPress={() => { setDocuments(current => current.filter(item => item.id !== document.id)); setDocumentErrors(current => { const next = { ...current }; delete next[document.id]; return next; }); setExpandedDocumentId(current => current === document.id ? documents.find(item => item.id !== document.id)?.id ?? null : current); }}><Text style={s.removeDocument}>Xóa</Text></Pressable>}</View>
          {expandedDocumentId === document.id && <>
          <Field label="Tên tài liệu *" value={document.fileName} onChangeText={value => updateDocument(document.id, { fileName: value })} placeholder="Ví dụ: Giấy chứng nhận đăng ký doanh nghiệp" error={documentErrors[document.id]?.startsWith('Nhập tên') ? documentErrors[document.id] : undefined} />
          <View style={s.field}><Text style={s.label}>Nguồn tài liệu *</Text><View style={s.sourceOptions}>
            {(['url', 'file'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: document.mode === mode }} onPress={() => updateDocument(document.id, { mode })} style={[s.sourceOption, document.mode === mode && s.sourceOptionSelected]}><Text style={[s.sourceOptionText, document.mode === mode && s.sourceOptionTextSelected]}>{mode === 'url' ? 'Liên kết online' : 'Tải ảnh / PDF'}</Text></Pressable>)}
          </View></View>
          {document.mode === 'url' ? <Field label="URL HTTPS của tài liệu *" value={document.url} onChangeText={value => updateDocument(document.id, { url: value })} placeholder="https://..." error={documentErrors[document.id]?.startsWith('Nhập URL') ? documentErrors[document.id] : undefined} /> : <VerificationDocumentPicker title="Ảnh hoặc PDF của giấy tờ *" value={document.file} onChange={file => updateDocument(document.id, { file })} error={documentErrors[document.id]} onError={message => setDocumentErrors(current => ({ ...current, [document.id]: message }))} disabled={saving} />}
          </>}
        </View>)}
        <Pressable accessibilityRole="button" disabled={documents.length >= 10} onPress={addDocument} style={[s.addDocument, documents.length >= 10 && { opacity: 0.5 }]}><Text style={s.addDocumentText}>{documents.length >= 10 ? 'Đã đạt tối đa 10 tài liệu' : '+ Thêm tài liệu'}</Text></Pressable>
        <View style={s.tip}><CompanyIcon name={{ ios: 'lock.shield', android: 'admin_panel_settings', web: 'admin_panel_settings' }} size={15} color={c.blue} /><Text style={s.tipText}>Mỗi tệp tối đa 5 MB. Hỗ trợ JPG, PNG và PDF; link phải dùng HTTPS.</Text></View>
      </Card>
      <ActionButton title={saving ? 'Đang gửi…' : 'Gửi hồ sơ xác minh'} onPress={() => void submit()} icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} />
    </>}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ nav: { flexDirection: 'row', alignItems: 'center', gap: 9 }, back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, navTitle: { color: c.ink, fontSize: 13, fontWeight: '900' }, helper: { color: c.muted, fontSize: 10, lineHeight: 15 }, field: { marginTop: 12, gap: 5 }, label: { color: c.ink, fontSize: 10, fontWeight: '700' }, input: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, color: c.ink, fontSize: 11 }, inputError: { borderColor: c.rose }, fieldError: { color: c.rose, fontSize: 10, lineHeight: 14 }, textarea: { minHeight: 76, paddingTop: 10 }, sectionTitle: { color: c.ink, fontSize: 14, fontWeight: '900' }, statusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }, reject: { color: c.rose, fontSize: 11, lineHeight: 16, marginTop: 5 }, orgName: { color: c.ink, fontSize: 13, fontWeight: '800', marginTop: 8 }, tip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#F5F8FF' }, tipText: { flex: 1, color: c.muted, fontSize: 9, lineHeight: 14 }, sourceOptions: { flexDirection: 'row', gap: 8 }, sourceOption: { borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFF' }, sourceOptionSelected: { borderColor: c.blue, backgroundColor: '#EDF4FF' }, sourceOptionText: { color: c.muted, fontSize: 10, fontWeight: '700' }, sourceOptionTextSelected: { color: c.blue }, documentDraft: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.line }, documentHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, documentToggle: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 4 }, documentHeadingText: { color: c.ink, fontSize: 11, fontWeight: '800' }, documentSummary: { color: c.muted, fontSize: 9 }, documentChevron: { color: c.blue, fontSize: 9, fontWeight: '700' }, removeDocument: { color: c.rose, fontSize: 10, fontWeight: '700', padding: 6 }, addDocument: { marginTop: 14, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: c.blue, borderRadius: 10, backgroundColor: '#F5F8FF' }, addDocumentText: { color: c.blue, fontSize: 11, fontWeight: '800' }, notice: { borderRadius: 11, padding: 12, gap: 3, marginVertical: 8 }, noticeSuccess: { backgroundColor: '#ECF8F1' }, noticeError: { backgroundColor: '#FFF1F2' }, noticeTitle: { color: c.ink, fontSize: 11, fontWeight: '900' }, noticeMessage: { color: c.muted, fontSize: 10, lineHeight: 15 }, error: { color: c.rose, fontSize: 11 } });
