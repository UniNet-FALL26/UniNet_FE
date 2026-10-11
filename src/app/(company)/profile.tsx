import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, SectionTitle, Tag, type CompanyIconName } from '@/components/company/company-ui';
import { companyService, formatCompanySalary, type CompanyProfile, type CompanyProfileInput } from '@/services/company.service';

const contactItems: { icon: CompanyIconName; text: string }[] = [
  { icon: { ios: 'envelope', android: 'mail', web: 'mail' }, text: 'careers@nexora.example' },
  { icon: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }, text: '24 Nguyễn Bỉnh Khiêm, phường Sài Gòn, TP. Hồ Chí Minh' },
  { icon: { ios: 'phone', android: 'call', web: 'call' }, text: 'Số điện thoại: Chưa cập nhật' },
  { icon: { ios: 'link', android: 'link', web: 'link' }, text: 'nexora.example' },
];
const benefitItems: { icon: CompanyIconName; title: string; body: string }[] = [
  { icon: { ios: 'graduationcap', android: 'school', web: 'school' }, title: 'Có người đồng hành', body: 'Mentor hỗ trợ và phản hồi mỗi tuần.' },
  { icon: { ios: 'book', android: 'book', web: 'book' }, title: 'Học qua sản phẩm thật', body: 'Tham gia dự án, review code và chia sẻ kiến thức.' },
  { icon: { ios: 'cup.and.saucer', android: 'coffee', web: 'coffee' }, title: 'Môi trường cởi mở', body: 'Tôn trọng ý kiến, linh hoạt với lịch học.' },
  { icon: { ios: 'heart', android: 'favorite', web: 'favorite' }, title: 'Phát triển dài hạn', body: 'Cơ hội trở thành nhân sự chính thức sau kỳ thực tập.' },
];

function ProfileEditField({ label, value, onChangeText, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean }) {
  return <View style={s.editField}><Text style={s.editLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.editInput, multiline && s.editTextarea]} /></View>;
}

export default function CompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<CompanyProfileInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void companyService.getProfile(controller.signal)
      .then(setProfile)
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ công ty.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]));

  const edit = () => {
    if (!profile) return;
    setDraft({
      companyName: profile.companyName,
      description: profile.description ?? '',
      industry: profile.industry ?? '',
      website: profile.website ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      contactEmail: profile.contactEmail ?? '',
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!draft || !profile || saving) return;
    setSaving(true);
    try {
      setProfile(await companyService.updateProfile(draft));
      setEditOpen(false);
      Alert.alert('Đã lưu', 'Hồ sơ công ty đã được cập nhật.');
    } catch (cause) {
      Alert.alert('Không lưu được hồ sơ', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof CompanyProfileInput, value: string) => setDraft(current => current ? { ...current, [key]: value } : current);
  const contactItems: { icon: CompanyIconName; text: string }[] = profile ? [
    { icon: { ios: 'envelope', android: 'mail', web: 'mail' }, text: profile.contactEmail || 'Chưa có email liên hệ' },
    { icon: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }, text: profile.address || 'Chưa cập nhật địa chỉ' },
    { icon: { ios: 'phone', android: 'call', web: 'call' }, text: profile.phone || 'Chưa cập nhật số điện thoại' },
    { icon: { ios: 'link', android: 'link', web: 'link' }, text: profile.website || 'Chưa có website' },
  ] : [];

  return <CompanyPage><PageScroll>
    <PageTitle title="Hồ sơ công ty" subtitle="Giới thiệu công ty với cộng đồng sinh viên UniNet." />
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải hồ sơ công ty…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
    {!!profile && <View style={s.actions}><ActionButton style={{ flex: 1 }} title="Xem hồ sơ công khai" onPress={() => Alert.alert(profile.companyName, profile.description || 'Chưa có phần giới thiệu.')} variant="outline" icon={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }} /><ActionButton style={{ flex: 1 }} title="Chỉnh sửa hồ sơ" onPress={edit} icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} /></View>}
    {!!profile && <>
    <Card style={s.profileCard}>
      <View style={s.cover}><View style={s.coverBlockA} /><View style={s.coverBlockB} /><View style={s.coverWindow}><CompanyIcon name={{ ios: 'building.2.fill', android: 'business', web: 'business' }} size={34} color="#FFFFFF" /></View><View style={s.coverSun} /></View>
      <View style={s.companyTitleRow}><View style={s.companyLogo}><Text style={s.logoText}>{profile.companyName.trim().charAt(0).toUpperCase() || 'C'}</Text></View><View style={s.companyTitle}><Text style={s.companyName}>{profile.companyName}</Text><Tag tone={profile.isVerified ? 'green' : 'amber'}>{profile.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}</Tag></View></View>
      <Text style={s.description}>{profile.description || 'Công ty chưa thêm phần giới thiệu.'}</Text>
      <View style={s.chips}>{profile.industry ? <Tag tone="gray">{profile.industry}</Tag> : null}{profile.address ? <Tag tone="gray">{profile.address}</Tag> : null}</View>
    </Card>
    <Card><SectionTitle title={`Về ${profile.companyName}`} /><Text style={s.body}>{profile.description || 'Công ty chưa thêm phần giới thiệu.'}</Text><View style={s.chips}>{profile.industry ? <Tag tone="purple">{profile.industry}</Tag> : null}{profile.website ? <Tag tone="purple">{profile.website}</Tag> : null}</View></Card>
    <Card><SectionTitle title="Cơ hội đang mở" action="Quản lý bài đăng" onAction={() => router.push('/(company)/jobs')} /><Text style={s.helper}>Dành cho sinh viên và người mới tốt nghiệp</Text>{profile.openJobs.map((job) => <View key={job.id} style={s.job}><View style={s.jobHead}><View style={s.jobIcon}><CompanyIcon name={{ ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' }} size={17} /></View><View style={{ flex: 1 }}><Text style={s.jobTitle}>{job.title}</Text><Text style={s.helper}>{job.location || 'Chưa có địa điểm'} · {job.workType === 0 ? 'Tại văn phòng' : job.workType === 1 ? 'Kết hợp' : 'Từ xa'}</Text></View><Tag tone="green">Đã đăng</Tag></View><Text style={s.salary}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text></View>)}{profile.openJobs.length === 0 && <Text style={s.helper}>Hiện chưa có bài tuyển dụng đang mở.</Text>}</Card>
    <Card style={s.notice}><CompanyIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={c.blue} /><Text style={s.noticeText}>Trước khi công khai, website và đường dẫn trong hồ sơ được kiểm tra an toàn, đồng thời có thể cần kiểm duyệt. Việc này không ảnh hưởng xác minh hay duyệt tin.</Text></Card>
    <Card><SectionTitle title="Liên hệ công ty" /><View style={s.contactHead}><View style={s.avatar}><Text style={s.avatarText}>{profile.companyName.slice(0, 2).toUpperCase()}</Text></View><View><Text style={s.personName}>{profile.companyName}</Text><Text style={s.helper}>Thông tin liên hệ doanh nghiệp</Text></View></View>{contactItems.map((item, index) => <View key={`${index}-${item.text}`} style={s.contactRow}><CompanyIcon name={item.icon} size={14} color={c.muted} /><Text style={s.contactText}>{item.text}</Text></View>)}<ActionButton title="Chỉnh sửa liên hệ" onPress={edit} variant="soft" icon={{ ios: 'pencil', android: 'edit', web: 'edit' }} /></Card>
    <Card><SectionTitle title="Điều bạn nhận được" />{benefitItems.map((item) => <View key={item.title} style={s.benefit}><View style={s.benefitIcon}><CompanyIcon name={item.icon} size={15} /></View><View style={{ flex: 1 }}><Text style={s.personName}>{item.title}</Text><Text style={s.helper}>{item.body}</Text></View></View>)}</Card>
    </>}
    <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
      <View style={s.modalBackdrop}><View style={s.modalCard}><Text style={s.modalTitle}>Chỉnh sửa hồ sơ công ty</Text><ScrollView keyboardShouldPersistTaps="handled" style={s.modalScroll}>
        {draft && <>
          <ProfileEditField label="Tên công ty *" value={draft.companyName} onChangeText={value => setField('companyName', value)} />
          <ProfileEditField label="Giới thiệu" value={draft.description ?? ''} onChangeText={value => setField('description', value)} multiline />
          <ProfileEditField label="Lĩnh vực" value={draft.industry ?? ''} onChangeText={value => setField('industry', value)} />
          <ProfileEditField label="Website (URL)" value={draft.website ?? ''} onChangeText={value => setField('website', value)} />
          <ProfileEditField label="Email liên hệ" value={draft.contactEmail ?? ''} onChangeText={value => setField('contactEmail', value)} />
          <ProfileEditField label="Số điện thoại" value={draft.phone ?? ''} onChangeText={value => setField('phone', value)} />
          <ProfileEditField label="Địa chỉ" value={draft.address ?? ''} onChangeText={value => setField('address', value)} multiline />
        </>}
      </ScrollView><View style={s.modalActions}><ActionButton title="Hủy" onPress={() => setEditOpen(false)} variant="outline" /><ActionButton title={saving ? 'Đang lưu…' : 'Lưu thay đổi'} onPress={() => void saveProfile()} /></View></View></View>
    </Modal>
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ actions: { flexDirection: 'row', gap: 8 }, profileCard: { padding: 0, overflow: 'hidden' }, cover: { height: 132, backgroundColor: '#DCE8E6', overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }, coverBlockA: { width: '28%', height: 78, backgroundColor: '#A7C4BE', marginHorizontal: 2 }, coverBlockB: { width: '25%', height: 102, backgroundColor: '#8AAFA9', marginHorizontal: 2 }, coverWindow: { width: '30%', height: 117, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#5D8580', alignItems: 'center', justifyContent: 'center' }, coverSun: { position: 'absolute', top: 18, right: 25, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F6DCA1' }, companyTitleRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12, alignItems: 'center' }, companyLogo: { width: 46, height: 46, borderRadius: 13, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFF', fontSize: 25, fontWeight: '900' }, companyTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, companyName: { color: c.ink, fontSize: 17, fontWeight: '900' }, description: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 9, marginHorizontal: 14 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginHorizontal: 14, marginBottom: 14 }, body: { color: c.ink, fontSize: 11, lineHeight: 18 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, job: { paddingTop: 12, marginTop: 11, borderTopWidth: 1, borderColor: c.line }, jobHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, jobIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, jobTitle: { color: c.ink, fontWeight: '800', fontSize: 10 }, salary: { color: c.purple, fontSize: 9, fontWeight: '700', marginTop: 7, marginLeft: 39 }, notice: { flexDirection: 'row', gap: 8, backgroundColor: '#F5F8FF' }, noticeText: { flex: 1, color: c.muted, fontSize: 9, lineHeight: 14 }, contactHead: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderColor: c.line }, avatar: { width: 29, height: 29, borderRadius: 15, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: c.purple, fontSize: 9, fontWeight: '900' }, personName: { color: c.ink, fontSize: 10, fontWeight: '800' }, contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 }, contactText: { flex: 1, color: c.ink, fontSize: 9, lineHeight: 14 }, benefit: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 7 }, benefitIcon: { width: 29, height: 29, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, error: { color: c.rose, fontSize: 11 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,30,0.45)', justifyContent: 'center', padding: 18 }, modalCard: { maxHeight: '90%', borderRadius: 18, padding: 16, backgroundColor: '#FFF' }, modalTitle: { color: c.ink, fontSize: 16, fontWeight: '900', marginBottom: 10 }, modalScroll: { flexGrow: 0 }, editField: { gap: 5, marginTop: 8 }, editLabel: { color: c.ink, fontSize: 11, fontWeight: '700' }, editInput: { minHeight: 42, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 10, color: c.ink, fontSize: 12 }, editTextarea: { minHeight: 76, paddingTop: 10 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 } });
