import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, Tag } from '@/components/company/company-ui';
import { companyService, type CompanyProfile, type PartnerVerificationStatus, type VerificationDocumentType } from '@/services/company.service';

const statusText = (status: PartnerVerificationStatus['status']) => status === 0 ? 'Đang chờ admin duyệt' : status === 1 ? 'Đã xác minh tài khoản' : status === 2 ? 'Bị từ chối' : status === 3 ? 'Yêu cầu cũ đã hết hiệu lực' : 'Chưa gửi hồ sơ';
const statusTone = (status: PartnerVerificationStatus['status']): 'green' | 'amber' | 'rose' | 'gray' => status === 1 ? 'green' : status === 0 ? 'amber' : status === 2 ? 'rose' : 'gray';
const documentTypeFor = (partnerType: number): VerificationDocumentType => partnerType === 0 || partnerType === 2 ? 3 : partnerType === 1 || partnerType === 3 ? 4 : 5;

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} autoCapitalize="none" textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.textarea]} /></View>;
}

export default function PartnerVerificationScreen() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [status, setStatus] = useState<PartnerVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [fileName, setFileName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
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
    const url = documentUrl.trim();
    if (!fileName.trim() || !url || !/^https:\/\//i.test(url)) { Alert.alert('Thiếu tài liệu xác minh', 'Nhập tên tài liệu và đường dẫn HTTPS tới bản tài liệu đã lưu trong kho riêng.'); return; }
    setSaving(true);
    try {
      const next = await companyService.submitVerification({
        taxCode: taxCode.trim() || null,
        representativeName: representativeName.trim() || null,
        documents: [{ type: documentTypeFor(profile.partnerType), fileName: fileName.trim(), url }],
      });
      setStatus(next);
      Alert.alert('Đã gửi hồ sơ', 'Admin sẽ xem xét hồ sơ xác minh tài khoản đối tác của bạn.');
    } catch (cause) {
      Alert.alert('Không gửi được hồ sơ', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  const locked = status?.status === 0 || status?.status === 1;
  const typeLabel = profile?.partnerType === 0 ? 'Doanh nghiệp' : profile?.partnerType === 1 ? 'Trường học' : profile?.partnerType === 2 ? 'Cửa hàng / Thương hiệu' : profile?.partnerType === 3 ? 'Trung tâm đào tạo' : 'Đối tác khác';

  return <CompanyPage><PageScroll>
    <View style={s.nav}><Pressable onPress={() => router.back()} style={s.back}><CompanyIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} color={c.ink} /></Pressable><View><Text style={s.navTitle}>Xác minh tài khoản đối tác</Text><Text style={s.helper}>{profile?.companyName || 'UniNet'}</Text></View></View>
    <PageTitle title="Xác minh tổ chức" subtitle="Admin xác minh tài khoản Partner một lần; bài tuyển dụng do tổ chức tự đăng và quản lý." />
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải trạng thái…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!!status && <Card><View style={s.statusHead}><Text style={s.sectionTitle}>Trạng thái hồ sơ</Text><Tag tone={statusTone(status.status)}>{statusText(status.status)}</Tag></View>{status.status === 2 && !!status.rejectReason && <Text style={s.reject}>{status.rejectReason}</Text>}{status.status === 0 && <Text style={s.helper}>Bạn vẫn đăng nhập và lưu bản nháp được. Có thể đăng tuyển công khai sau khi tài khoản được duyệt.</Text>}{status.status === 1 && <Text style={s.helper}>Tài khoản đã được xác minh. Bạn có thể chủ động đăng tuyển mà không cần duyệt từng bài.</Text>}</Card>}
    {!!profile && status?.status !== 1 && status?.status !== 0 && <>
      <Card><Text style={s.sectionTitle}>Thông tin tổ chức</Text><Text style={s.orgName}>{profile.companyName}</Text><Text style={s.helper}>{typeLabel} · Thông tin được chụp lại khi gửi để admin đối chiếu.</Text>
        <Field label="Mã số thuế / mã đăng ký (không bắt buộc)" value={taxCode} onChangeText={setTaxCode} placeholder="Nếu có, nhập mã số trên giấy đăng ký" />
        <Field label="Người đại diện" value={representativeName} onChangeText={setRepresentativeName} placeholder="Họ tên người đại diện tổ chức" />
      </Card>
      <Card><Text style={s.sectionTitle}>Tài liệu xác minh *</Text><Text style={s.helper}>Gửi giấy tờ chính thức mà tổ chức hiện có. Admin sẽ xem xét hồ sơ và thông báo cụ thể nếu cần bổ sung mã số thuế hoặc giấy tờ khác.</Text>
        <Field label="Tên tài liệu *" value={fileName} onChangeText={setFileName} placeholder="Ví dụ: Giấy chứng nhận đăng ký doanh nghiệp" />
        <Field label="URL HTTPS của tài liệu *" value={documentUrl} onChangeText={setDocumentUrl} placeholder="https://..." />
        <View style={s.tip}><CompanyIcon name={{ ios: 'lock.shield', android: 'admin_panel_settings', web: 'admin_panel_settings' }} size={15} color={c.blue} /><Text style={s.tipText}>Tải giấy tờ lên kho lưu trữ riêng trước, rồi dán liên kết HTTPS được cấp quyền xem cho admin. Đừng dùng liên kết công khai.</Text></View>
      </Card>
      <ActionButton title={saving ? 'Đang gửi…' : 'Gửi hồ sơ xác minh'} onPress={() => void submit()} icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} />
    </>}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ nav: { flexDirection: 'row', alignItems: 'center', gap: 9 }, back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, navTitle: { color: c.ink, fontSize: 13, fontWeight: '900' }, helper: { color: c.muted, fontSize: 10, lineHeight: 15 }, field: { marginTop: 12, gap: 5 }, label: { color: c.ink, fontSize: 10, fontWeight: '700' }, input: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, color: c.ink, fontSize: 11 }, textarea: { minHeight: 76, paddingTop: 10 }, sectionTitle: { color: c.ink, fontSize: 14, fontWeight: '900' }, statusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }, reject: { color: c.rose, fontSize: 11, lineHeight: 16, marginTop: 5 }, orgName: { color: c.ink, fontSize: 13, fontWeight: '800', marginTop: 8 }, tip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#F5F8FF' }, tipText: { flex: 1, color: c.muted, fontSize: 9, lineHeight: 14 }, error: { color: c.rose, fontSize: 11 } });
