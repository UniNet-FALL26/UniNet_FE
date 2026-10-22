import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, PageTitle, SectionTitle, Tag } from '@/components/company/company-ui';
import { ProfilePhotoForm } from '@/components/profile/ProfilePhotoForm';
import { ProfileFramedImage } from '@/components/profile/ProfileFramedImage';
import { useAuth } from '@/hooks/useAuth';
import { companyService, formatCompanySalary, type CompanyProfile, type CompanyProfileInput, type PartnerVerificationStatus } from '@/services/company.service';
import { pickProfileImage } from '@/utils/profile-image-picker';

const verificationLabel = (status: PartnerVerificationStatus['status'] | undefined) => status === 0 ? 'Đang chờ admin duyệt' : status === 1 ? 'Đã xác minh' : status === 2 ? 'Cần bổ sung hồ sơ' : status === 3 ? 'Cần gửi xác minh lại' : 'Chưa gửi xác minh';

function ProfileEditField({ label, value, onChangeText, multiline = false, error }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; error?: string }) {
  return <View style={s.editField}><Text style={s.editLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.editInput, multiline && s.editTextarea, !!error && s.editInputError]} />{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}

export default function CompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [verification, setVerification] = useState<PartnerVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<'profile' | 'about'>('profile');
  const [draft, setDraft] = useState<CompanyProfileInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyNameError, setCompanyNameError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [editNotice, setEditNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [photo, setPhoto] = useState<{ target: 'avatarUrl' | 'coverUrl'; asset: ImagePickerAsset; editExisting?: boolean } | null>(null);
  const [choosingPhoto, setChoosingPhoto] = useState<'avatarUrl' | 'coverUrl' | null>(null);
  const [previewPhotoTarget, setPreviewPhotoTarget] = useState<'avatarUrl' | 'coverUrl' | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { logout, loading: authLoading } = useAuth();

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void Promise.all([companyService.getProfile(controller.signal), companyService.getVerificationStatus(controller.signal)])
      .then(([nextProfile, nextVerification]) => { setProfile(nextProfile); setVerification(nextVerification); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ đối tác.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]));

  const edit = (section: 'profile' | 'about') => {
    if (!profile) return;
    setCompanyNameError('');
    setProfileFieldErrors({});
    setEditNotice(null);
    setEditSection(section);
    setDraft({
      companyName: profile.companyName,
      partnerType: profile.partnerType,
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
    const errors: Record<string, string> = {};
    if (!draft.companyName.trim()) errors.companyName = 'Vui lòng nhập tên tổ chức.';
    else if (draft.companyName.trim().length > 255) errors.companyName = 'Tên tổ chức không được dài quá 255 ký tự.';
    if (editSection === 'profile') {
      if ((draft.industry?.length ?? 0) > 150) errors.industry = 'Lĩnh vực không được dài quá 150 ký tự.';
      if ((draft.contactEmail?.length ?? 0) > 255) errors.contactEmail = 'Email liên hệ không được dài quá 255 ký tự.';
      else if (draft.contactEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) errors.contactEmail = 'Email liên hệ không đúng định dạng.';
      if ((draft.phone?.length ?? 0) > 30) errors.phone = 'Số điện thoại không được dài quá 30 ký tự.';
      else if (draft.phone?.trim()) {
        const phone = draft.phone.trim();
        const digits = phone.replace(/\D/g, '').length;
        if (!/^\+?[0-9().\-\s]+$/.test(phone) || digits < 7 || digits > 15) errors.phone = 'Số điện thoại chỉ gồm chữ số và ký hiệu + ( ) . -, dài từ 7 đến 15 chữ số.';
      }
      if ((draft.address?.length ?? 0) > 2000) errors.address = 'Địa chỉ không được dài quá 2.000 ký tự.';
    } else {
      if ((draft.website?.length ?? 0) > 2048) errors.website = 'Website không được dài quá 2.048 ký tự.';
      else if (draft.website?.trim()) {
        try {
          const website = new URL(draft.website.trim());
          if (!['http:', 'https:'].includes(website.protocol) || !website.hostname) errors.website = 'Website phải là URL http hoặc https hợp lệ.';
        } catch { errors.website = 'Website phải là URL http hoặc https hợp lệ.'; }
      }
    }
    setCompanyNameError(errors.companyName ?? '');
    setProfileFieldErrors(errors);
    if (Object.keys(errors).length) {
      setEditNotice({ type: 'error', title: 'Chưa thể lưu thông tin', message: Object.values(errors).join('\n') });
      return;
    }
    setEditNotice(null);
    setSaving(true);
    try {
      setProfile(await companyService.updateProfile(draft));
      setVerification(await companyService.getVerificationStatus());
      setEditOpen(false);
      setProfileNotice({ type: 'success', title: 'Đã lưu', message: 'Hồ sơ đối tác đã được cập nhật.' });
    } catch (cause) {
      setEditNotice({ type: 'error', title: 'Không lưu được hồ sơ', message: cause instanceof Error ? cause.message : 'Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: Exclude<keyof CompanyProfileInput, 'partnerType'>, value: string) => {
    setDraft(current => current ? { ...current, [key]: value } : current);
    if (key === 'companyName') setCompanyNameError('');
    setProfileFieldErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setEditNotice(null);
  };
  const choosePhoto = async (target: 'avatarUrl' | 'coverUrl') => {
    if (choosingPhoto) return;
    setChoosingPhoto(target);
    try {
      const asset = await pickProfileImage(target);
      if (asset) setPhoto({ target, asset });
    } catch (cause) {
      Alert.alert('Không chọn được ảnh', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setChoosingPhoto(null);
    }
  };
  const editPhotoPosition = (target: 'avatarUrl' | 'coverUrl') => {
    const uri = profile?.[target];
    if (!uri) { void choosePhoto(target); return; }
    const width = target === 'coverUrl' ? 1200 : 800;
    const height = target === 'coverUrl' ? 400 : 800;
    setPreviewPhotoTarget(null);
    setPhoto({ target, editExisting: true, asset: { uri, width, height, type: 'image' } as ImagePickerAsset });
  };
  const savePhoto = async (url: string) => {
    if (!profile || !photo || saving) return;
    const target = photo.target;
    setPhoto(null);
    setSaving(true);
    try {
      const updated = await companyService.updateProfile({
        companyName: profile.companyName, partnerType: profile.partnerType, description: profile.description,
        industry: profile.industry, website: profile.website, phone: profile.phone, address: profile.address,
        contactEmail: profile.contactEmail, avatarUrl: target === 'avatarUrl' ? url || null : profile.avatarUrl,
        coverUrl: target === 'coverUrl' ? url || null : profile.coverUrl,
      });
      setProfile(updated);
      setPreviewPhotoTarget(null);
      Alert.alert('Đã cập nhật ảnh', 'Ảnh hồ sơ đối tác đã được lưu.');
    } catch (cause) {
      Alert.alert('Không lưu được ảnh', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };
  const confirmLogout = async () => {
    if (authLoading) return;
    const succeeded = await logout();
    if (!succeeded) {
      Alert.alert('Không thể đăng xuất', 'Vui lòng thử lại.');
      return;
    }
    setLogoutOpen(false);
    router.replace('/(auth)/login');
  };
  return <CompanyPage><PageScroll>
    <PageTitle title="Hồ sơ đối tác" subtitle="Giới thiệu tổ chức với cộng đồng sinh viên UniNet." />
    {!!profileNotice && <View accessibilityRole="alert" style={[s.saveNotice, profileNotice.type === 'success' ? s.saveNoticeSuccess : s.saveNoticeError]}><Text style={s.saveNoticeTitle}>{profileNotice.title}</Text><Text style={s.saveNoticeText}>{profileNotice.message}</Text></View>}
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải hồ sơ đối tác…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
      {!!profile && <>
    <Card style={s.profileCard}>
        <Pressable accessibilityRole="button" accessibilityLabel={profile.coverUrl ? 'Xem ảnh bìa' : 'Thêm ảnh bìa'} onPress={() => profile.coverUrl ? setPreviewPhotoTarget('coverUrl') : void choosePhoto('coverUrl')} style={s.cover}>{profile.coverUrl ? <ProfileFramedImage uri={profile.coverUrl} accessibilityLabel="Ảnh bìa đối tác" /> : <><View style={s.coverBlockA} /><View style={s.coverBlockB} /><View style={s.coverWindow}><CompanyIcon name={{ ios: 'building.2.fill', android: 'business', web: 'business' }} size={34} color="#FFFFFF" /></View><View style={s.coverSun} /></>}</Pressable>
      <View style={s.companyTitleRow}><Pressable accessibilityRole="button" accessibilityLabel={profile.avatarUrl ? 'Xem ảnh đại diện' : 'Thêm ảnh đại diện'} onPress={() => profile.avatarUrl ? setPreviewPhotoTarget('avatarUrl') : void choosePhoto('avatarUrl')} style={s.companyLogo}>{profile.avatarUrl ? <ProfileFramedImage uri={profile.avatarUrl} accessibilityLabel="Ảnh đại diện đối tác" /> : <Text style={s.logoText}>{profile.companyName.trim().charAt(0).toUpperCase() || 'C'}</Text>}</Pressable><View style={s.companyTitle}><View style={s.companyHeading}><Text style={s.companyName}>{profile.companyName}</Text><Tag tone={profile.isVerified ? 'green' : 'amber'}>{profile.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}</Tag></View>{profile.industry ? <Tag tone="gray">{profile.industry}</Tag> : null}</View><Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa thông tin tổ chức" onPress={() => edit('profile')} style={s.editIconButton}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} color={c.blue} /></Pressable></View>
      <View style={s.profileContacts}>
        {profile.contactEmail ? <View style={s.profileContactRow}><CompanyIcon name={{ ios: 'envelope', android: 'mail', web: 'mail' }} size={14} color={c.muted} /><Text style={s.profileContactText}>{profile.contactEmail}</Text></View> : null}
        {profile.phone ? <View style={s.profileContactRow}><CompanyIcon name={{ ios: 'phone', android: 'call', web: 'call' }} size={14} color={c.muted} /><Text style={s.profileContactText}>{profile.phone}</Text></View> : null}
        {profile.address ? <View style={s.profileContactRow}><CompanyIcon name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }} size={14} color={c.muted} /><Text style={s.profileContactText}>{profile.address}</Text></View> : null}
        {profile.website ? <View style={s.profileContactRow}><CompanyIcon name={{ ios: 'link', android: 'link', web: 'link' }} size={14} color={c.muted} /><Text style={s.profileContactText}>{profile.website}</Text></View> : null}
        {!profile.contactEmail && !profile.phone && !profile.address && !profile.website ? <Text style={s.profileContactEmpty}>Chưa thêm thông tin liên hệ.</Text> : null}
      </View>
    </Card>
    <Card><View style={s.sectionHeading}><SectionTitle title={`Về ${profile.companyName}`} /><Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa phần giới thiệu" onPress={() => edit('about')} style={s.editIconButton}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} color={c.blue} /></Pressable></View><Text style={s.body}>{profile.description || 'Đối tác chưa thêm phần giới thiệu.'}</Text><View style={s.chips}>{profile.website ? <Tag tone="purple">{profile.website}</Tag> : null}</View></Card>
    <Card><SectionTitle title="Cơ hội đang mở" action="Quản lý bài đăng" onAction={() => router.push('/(company)/jobs')} /><Text style={s.helper}>Dành cho sinh viên và người mới tốt nghiệp</Text>{profile.openJobs.map((job) => <View key={job.id} style={s.job}><View style={s.jobHead}><View style={s.jobIcon}><CompanyIcon name={{ ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' }} size={17} /></View><View style={{ flex: 1 }}><Text style={s.jobTitle}>{job.title}</Text><Text style={s.helper}>{job.location || 'Chưa có địa điểm'} · {job.workType === 0 ? 'Tại văn phòng' : job.workType === 1 ? 'Kết hợp' : 'Từ xa'}</Text></View><Tag tone="green">Đã đăng</Tag></View><Text style={s.salary}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text></View>)}{profile.openJobs.length === 0 && <Text style={s.helper}>Hiện chưa có bài tuyển dụng đang mở.</Text>}</Card>
    <Card><SectionTitle title="Xác minh tài khoản đối tác" /><View style={s.verificationRow}><CompanyIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={c.blue} /><View style={{ flex: 1 }}><Text style={s.personName}>{verificationLabel(verification?.status)}</Text><Text style={s.helper}>{verification?.status === 0 ? 'Admin đang xem hồ sơ của tổ chức.' : verification?.status === 1 ? 'Tài khoản đã được admin xác minh. Bạn có thể chủ động đăng tuyển.' : verification?.status === 2 ? verification.rejectReason || 'Hồ sơ cần được bổ sung trước khi gửi lại.' : 'Gửi giấy tờ để admin xác minh tài khoản trước khi đăng tuyển công khai.'}</Text></View></View><ActionButton title={verification?.status === 0 ? 'Xem trạng thái' : verification?.status === 1 ? 'Đã xác minh' : 'Gửi hồ sơ xác minh'} onPress={() => router.push('/(company)/verification')} variant={verification?.status === 1 ? 'outline' : 'soft'} /></Card>
    <Pressable accessibilityRole="button" onPress={() => setLogoutOpen(true)} style={s.logoutButton}><CompanyIcon name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} size={17} color={c.rose} /><Text style={s.logoutText}>Đăng xuất</Text></Pressable>
    </>}
    <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
      <View style={s.modalBackdrop}><View style={s.confirmCard}><Text style={s.modalTitle}>Đăng xuất?</Text><Text style={s.body}>Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng tài khoản đối tác.</Text><View style={s.modalActions}><ActionButton title="Ở lại" onPress={() => setLogoutOpen(false)} variant="outline" /><ActionButton title={authLoading ? 'Đang đăng xuất…' : 'Đăng xuất'} onPress={() => void confirmLogout()} /></View></View></View>
    </Modal>
    <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
      <View style={s.modalBackdrop}><View style={s.modalCard}><Text style={s.modalTitle}>{editSection === 'profile' ? 'Chỉnh sửa thông tin tổ chức' : 'Chỉnh sửa phần giới thiệu'}</Text>{!!editNotice && <View accessibilityRole="alert" style={[s.saveNotice, editNotice.type === 'success' ? s.saveNoticeSuccess : s.saveNoticeError]}><Text style={s.saveNoticeTitle}>{editNotice.title}</Text><Text style={s.saveNoticeText}>{editNotice.message}</Text></View>}<ScrollView keyboardShouldPersistTaps="handled" style={s.modalScroll}>
        {draft && editSection === 'profile' && <>
          <ProfileEditField label="Tên tổ chức *" value={draft.companyName} onChangeText={value => setField('companyName', value)} error={companyNameError} />
          <ProfileEditField label="Lĩnh vực" value={draft.industry ?? ''} onChangeText={value => setField('industry', value)} error={profileFieldErrors.industry} />
          <ProfileEditField label="Email liên hệ" value={draft.contactEmail ?? ''} onChangeText={value => setField('contactEmail', value)} error={profileFieldErrors.contactEmail} />
          <ProfileEditField label="Số điện thoại" value={draft.phone ?? ''} onChangeText={value => setField('phone', value)} error={profileFieldErrors.phone} />
          <ProfileEditField label="Địa chỉ" value={draft.address ?? ''} onChangeText={value => setField('address', value)} multiline error={profileFieldErrors.address} />
        </>}
        {draft && editSection === 'about' && <>
          <ProfileEditField label="Giới thiệu" value={draft.description ?? ''} onChangeText={value => setField('description', value)} multiline />
          <ProfileEditField label="Website (URL)" value={draft.website ?? ''} onChangeText={value => setField('website', value)} error={profileFieldErrors.website} />
        </>}
      </ScrollView><View style={s.modalActions}><ActionButton title="Hủy" onPress={() => setEditOpen(false)} variant="outline" /><ActionButton title={saving ? 'Đang lưu…' : 'Lưu thay đổi'} onPress={() => void saveProfile()} /></View></View></View>
    </Modal>
      <Modal visible={!!previewPhotoTarget} transparent animationType="fade" onRequestClose={() => setPreviewPhotoTarget(null)}>
        <View style={s.photoPreviewOverlay}><Pressable style={s.photoPreviewBackdrop} onPress={() => setPreviewPhotoTarget(null)} /><View style={[s.photoPreviewFrame, { width: '100%', maxWidth: 520, minHeight: undefined, aspectRatio: previewPhotoTarget === 'avatarUrl' ? 1 : 3, overflow: 'hidden' }]}>{previewPhotoTarget && profile?.[previewPhotoTarget] ? <ProfileFramedImage uri={profile[previewPhotoTarget]!} accessibilityLabel={previewPhotoTarget === 'avatarUrl' ? 'Ảnh đại diện' : 'Ảnh bìa'} /> : null}<Pressable accessibilityRole="button" accessibilityLabel="Chỉnh vị trí ảnh" disabled={!!choosingPhoto || saving} onPress={() => { const target = previewPhotoTarget; if (target) editPhotoPosition(target); }} style={s.photoPreviewEdit}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={18} color={c.blue} /></Pressable></View></View>
    </Modal>
      {photo && <ProfilePhotoForm key={`${photo.target}-${photo.editExisting ? 'position' : 'new'}`} initialAsset={photo.asset} cropFor={photo.target} editExisting={photo.editExisting} onClose={() => setPhoto(null)} onConfirm={url => void savePhoto(url)} />}
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ profileCard: { padding: 0, overflow: 'hidden' }, cover: { height: 132, backgroundColor: '#DCE8E6', overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }, coverImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' }, coverBlockA: { width: '28%', height: 78, backgroundColor: '#A7C4BE', marginHorizontal: 2 }, coverBlockB: { width: '25%', height: 102, backgroundColor: '#8AAFA9', marginHorizontal: 2 }, coverWindow: { width: '30%', height: 117, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#5D8580', alignItems: 'center', justifyContent: 'center' }, coverSun: { position: 'absolute', top: 18, right: 25, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F6DCA1' }, companyTitleRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12, alignItems: 'center' }, companyLogo: { width: 46, height: 46, borderRadius: 13, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, editIconButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFF', fontSize: 25, fontWeight: '900' }, companyTitle: { flex: 1, alignItems: 'flex-start', gap: 5 }, companyHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, companyName: { color: c.ink, fontSize: 17, fontWeight: '900' }, description: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 9, marginHorizontal: 14 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginHorizontal: 14, marginBottom: 14 }, profileContacts: { gap: 9, marginHorizontal: 14, marginTop: 12, marginBottom: 14 }, profileContactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, profileContactText: { flex: 1, color: c.ink, fontSize: 10, lineHeight: 15 }, profileContactEmpty: { color: c.muted, fontSize: 9, lineHeight: 14 }, body: { color: c.ink, fontSize: 11, lineHeight: 18 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, job: { paddingTop: 12, marginTop: 11, borderTopWidth: 1, borderColor: c.line }, jobHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, jobIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, jobTitle: { color: c.ink, fontWeight: '800', fontSize: 10 }, salary: { color: c.purple, fontSize: 9, fontWeight: '700', marginTop: 7, marginLeft: 39 }, verificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }, notice: { flexDirection: 'row', gap: 8, backgroundColor: '#F5F8FF' }, noticeText: { flex: 1, color: c.muted, fontSize: 9, lineHeight: 14 }, personName: { color: c.ink, fontSize: 10, fontWeight: '800' }, error: { color: c.rose, fontSize: 11 }, saveNotice: { borderRadius: 11, padding: 11, gap: 3, marginVertical: 8 }, saveNoticeSuccess: { backgroundColor: '#ECF8F1' }, saveNoticeError: { backgroundColor: '#FFF1F2' }, saveNoticeTitle: { color: c.ink, fontSize: 11, fontWeight: '900' }, saveNoticeText: { color: c.muted, fontSize: 10, lineHeight: 15 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,30,0.45)', justifyContent: 'center', padding: 18 }, modalCard: { maxHeight: '90%', borderRadius: 18, padding: 16, backgroundColor: '#FFF' }, confirmCard: { borderRadius: 18, padding: 16, backgroundColor: '#FFF' }, modalTitle: { color: c.ink, fontSize: 16, fontWeight: '900', marginBottom: 10 }, modalScroll: { flexGrow: 0 }, photoPreviewOverlay: { flex: 1, backgroundColor: 'rgba(12,25,45,0.78)', alignItems: 'center', justifyContent: 'center', padding: 18 }, photoPreviewBackdrop: { ...StyleSheet.absoluteFill }, photoPreviewFrame: { width: '100%', maxWidth: 520, maxHeight: '80%', minHeight: 240, alignItems: 'center', justifyContent: 'center' }, photoPreviewCover: { width: '100%', aspectRatio: 3, borderRadius: 12 }, photoPreviewAvatar: { width: 280, height: 280, borderRadius: 18 }, photoPreviewEdit: { position: 'absolute', top: 10, right: 10, width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 4 }, editField: { gap: 5, marginTop: 8 }, editLabel: { color: c.ink, fontSize: 11, fontWeight: '700' }, editInput: { minHeight: 42, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 10, color: c.ink, fontSize: 12 }, editInputError: { borderColor: c.rose }, editTextarea: { minHeight: 76, paddingTop: 10 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }, logoutButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#F3C7D0', backgroundColor: '#FFF8F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }, logoutText: { color: c.rose, fontSize: 12, fontWeight: '800' } });
