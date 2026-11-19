import { CompanyIntroductionCards } from '@/components/company/CompanyIntroductionCards';
import { CompanyProfilePosts } from '@/components/company/CompanyProfilePosts';
import { PartnerVerification } from '@/components/company/PartnerVerification';
import { VerificationBanner } from '@/components/profile/VerificationBanner';
import { ActionFeedback } from '@/components/ui/ActionFeedback';
import { ToastHost } from '@/components/ui/ToastHost';
import { CompanyProfileHero } from '@/components/company/CompanyProfileHero';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Button } from '@/components/ui/Button';
import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, SectionTitle, Tag } from '@/components/company/company-ui';
import { CompanyPhotoDialog } from '@/components/company/CompanyPhotoDialog';
import { ProfileFramedImage } from '@/components/profile/ProfileFramedImage';
import { companyService, companyJobEmploymentTypeLabel, formatCompanySalary, type CompanyProfile, type CompanyProfileInput, type PartnerVerificationStatus } from '@/services/company.service';
import { pickProfileImage } from '@/utils/profile-image-picker';
import { WebsiteBrandIcon } from '@/components/company/WebsiteBrandIcon';
import { imageBody } from '@/utils/image-picker';
import { authStore } from '@/store/auth.store';

function ProfileEditField({ label, value, onChangeText, multiline = false, error, disabled = false, keyboardType = 'default', half = false }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; error?: string; disabled?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad'; half?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <View style={[editStyles.field, half && editStyles.halfField]}><Text style={editStyles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} editable={!disabled} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} textAlignVertical={multiline ? 'top' : 'center'} style={[editStyles.input, multiline && editStyles.textarea, focused && editStyles.focused, !!error && s.editInputError]} />{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}

export default function CompanyProfile({ publicProfile, onOpenJob }: { publicProfile?: CompanyProfile; onOpenJob?: (id: string) => void } = {}) {
  const readOnly = !!publicProfile;
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const desktop = Platform.OS === 'web' && width >= 1200;
  const [profileWidth, setProfileWidth] = useState(0);
  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'jobs'>('about');
  const [dismissedVerification, setDismissedVerification] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(publicProfile ?? null);
  const [verification, setVerification] = useState<PartnerVerificationStatus | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const applyVerificationStatus = useCallback((next: PartnerVerificationStatus) => {
    setVerification(next);
    if (next.status !== null) setProfile(current => current ? { ...current, isVerified: next.status === 1 } : current);
  }, []);
  const [loading, setLoading] = useState(!readOnly);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<CompanyProfileInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyNameError, setCompanyNameError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [editNotice, setEditNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [photo, setPhoto] = useState<{ target: 'avatarUrl' | 'coverUrl'; asset: ImagePickerAsset } | null>(null);
  const [choosingPhoto, setChoosingPhoto] = useState<'avatarUrl' | 'coverUrl' | null>(null);
  const [previewPhotoTarget, setPreviewPhotoTarget] = useState<'avatarUrl' | 'coverUrl' | null>(null);

  useFocusEffect(useCallback(() => {
    if (publicProfile) { setProfile(publicProfile); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void Promise.all([companyService.getProfile(controller.signal), companyService.getVerificationStatus(controller.signal)])
      .then(([nextProfile, nextVerification]) => { setProfile(nextProfile); setVerification(nextVerification); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ đối tác.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, publicProfile]));

  const edit = () => {
    if (readOnly || !profile) return;
    setCompanyNameError('');
    setProfileFieldErrors({});
    setEditNotice(null);
    setDraft({
      companyName: profile.companyName,
      partnerType: profile.partnerType,
      description: profile.description ?? '',
      industry: profile.industry ?? '',
      website: profile.website ?? '',
      websites: profile.websites.length ? [...profile.websites] : profile.website ? [profile.website] : [],
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      contactEmail: profile.contactEmail ?? '',
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (readOnly || !draft || !profile || saving) return;
    const errors: Record<string, string> = {};
    let normalizedWebsites = (draft.websites ?? []).map(value => value.trim()).filter(Boolean);
    if (!draft.companyName.trim()) errors.companyName = 'Vui lòng nhập tên tổ chức.';
    else if (draft.companyName.trim().length > 255) errors.companyName = 'Tên tổ chức không được dài quá 255 ký tự.';
    {
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
    }
    {
      if (normalizedWebsites.length > 10) errors.websites = 'Tối đa 10 liên kết website.';
      normalizedWebsites = normalizedWebsites.map(value => /^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (normalizedWebsites.some(value => value.length > 2048)) errors.websites = 'Mỗi liên kết website tối đa 2.048 ký tự.';
      else if (normalizedWebsites.some(value => {
        try { const website = new URL(value); return !['http:', 'https:'].includes(website.protocol) || !website.hostname; }
        catch { return true; }
      })) errors.websites = 'Mỗi liên kết phải là URL http hoặc https hợp lệ.';
      normalizedWebsites = [...new Set(normalizedWebsites.map(value => {
        try { return new URL(value).toString(); } catch { return value; }
      }))];
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
      setProfile(await companyService.updateProfile({ ...draft, website: normalizedWebsites[0] ?? null, websites: normalizedWebsites }));
      setVerification(await companyService.getVerificationStatus());
      setEditOpen(false);
      setProfileNotice({ type: 'success', title: 'Đã lưu', message: 'Hồ sơ đối tác đã được cập nhật.' });
    } catch (cause) {
      setEditNotice({ type: 'error', title: 'Không lưu được hồ sơ', message: cause instanceof Error ? cause.message : 'Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: Exclude<keyof CompanyProfileInput, 'partnerType' | 'websites' | 'introduction'>, value: string) => {
    setDraft(current => current ? { ...current, [key]: value } : current);
    if (key === 'companyName') setCompanyNameError('');
    setProfileFieldErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setEditNotice(null);
  };
  const setWebsiteAt = (index: number, value: string) => setDraft(current => current ? { ...current, websites: current.websites.map((website, i) => i === index ? value : website) } : current);
  const addWebsite = () => setDraft(current => current && current.websites.length < 10 ? { ...current, websites: [...current.websites, ''] } : current);
  const removeWebsite = (index: number) => setDraft(current => current ? { ...current, websites: current.websites.filter((_, i) => i !== index) } : current);
  const choosePhoto = async (target: 'avatarUrl' | 'coverUrl') => {
    if (readOnly || choosingPhoto || saving) return;
    setChoosingPhoto(target);
    try {
      const asset = await pickProfileImage(target);
      if (asset) { await imageBody(asset); setPhoto({ target, asset }); }
    } catch (cause) {
      setProfileNotice({ type: 'error', title: 'Không chọn được ảnh', message: cause instanceof Error ? cause.message : 'Vui lòng thử lại.' });
    } finally {
      setChoosingPhoto(null);
    }
  };
  const savePhoto = async (url: string, signal: AbortSignal) => {
    if (!profile || !photo || saving) throw new Error('Không thể lưu ảnh lúc này. Vui lòng thử lại.');
    const target = photo.target;
    setSaving(true);
    try {
      const updated = await companyService.saveProfile({
        companyName: profile.companyName, partnerType: profile.partnerType, description: profile.description,
        industry: profile.industry, website: profile.website, websites: profile.websites, phone: profile.phone, address: profile.address,
        contactEmail: profile.contactEmail, avatarUrl: target === 'avatarUrl' ? url || null : profile.avatarUrl,
        coverUrl: target === 'coverUrl' ? url || null : profile.coverUrl,
      }, signal);
      if (signal.aborted) return;
      authStore.updateAccount(updated);
      setProfile({ ...profile, [target]: url, isVerified: updated.profile?.isVerified ?? profile.isVerified });
      setPreviewPhotoTarget(null);
      setProfileNotice({ type: 'success', title: 'Đã cập nhật ảnh', message: 'Ảnh hồ sơ đối tác đã được lưu.' });
    } finally {
      setSaving(false);
    }
  };
  const compactReminder = (profileWidth || width) < 600;
  const showVerificationReminder = !!profile && !profile.isVerified && verification?.status !== 1 && dismissedVerification !== profile.id;
  const verificationDescription = verification?.status === 0 ? 'Hồ sơ xác minh tổ chức đang được xét duyệt. Nhấn để xem trạng thái.' : verification?.status === 2 ? 'Hồ sơ cần bổ sung thông tin. Nhấn xác minh để xem lý do và cập nhật.' : verification?.status === 3 ? 'Hồ sơ đã hủy. Vui lòng gửi lại thông tin xác minh tổ chức.' : 'Xác minh thông tin tổ chức và tăng độ tin cậy với sinh viên.';
  const profileHeader = !readOnly && (showVerificationReminder || !desktop) && <View testID={mobile ? 'company-profile-mobile-header' : undefined} style={[layoutStyles.verificationHeader, mobile && layoutStyles.fixedMobileHeader]}>
    <View style={layoutStyles.reminderSlot}>{showVerificationReminder && <VerificationBanner compact={compactReminder} title="Xác minh tài khoản đối tác" description={verificationDescription} actionLabel={verification?.status === 0 ? compactReminder ? 'Xem' : 'Xem trạng thái' : undefined} showHint={verification?.status !== 0} onVerify={() => setVerificationOpen(true)} onDismiss={() => setDismissedVerification(profile.id)} />}</View>
    <View style={layoutStyles.headerActions}>
      {mobile && <Pressable testID="company-profile-edit-action" accessibilityRole="button" accessibilityLabel="Chỉnh sửa thông tin tổ chức" disabled={!profile || loading || saving} onPress={() => edit()} style={({ pressed }) => [layoutStyles.settingsButton, compactReminder && layoutStyles.compactSettingsButton, pressed && layoutStyles.pressed]}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={23} color={c.ink} /></Pressable>}
      {!desktop && <Pressable testID="company-profile-settings-action" accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => router.push('/settings')} style={({ pressed }) => [layoutStyles.settingsButton, compactReminder && layoutStyles.compactSettingsButton, pressed && layoutStyles.pressed]}><CompanyIcon name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={23} color={c.ink} /></Pressable>}
    </View>
  </View>;
  return <CompanyPage><View style={[layoutStyles.body, desktop && layoutStyles.desktopBody]}><View style={layoutStyles.main} onLayout={event => setProfileWidth(event.nativeEvent.layout.width)}>{mobile && profileHeader}<PageScroll contentStyle={desktop ? layoutStyles.desktopScroll : mobile ? layoutStyles.mobileScroll : undefined}>
    {!mobile && profileHeader}
    {!!profileNotice && <ActionFeedback type={profileNotice.type} message={profileNotice.message} />}
    {loading && <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải hồ sơ đối tác…</Text></Card>}
    {!!error && <Card><Text style={s.error}>{error}</Text><ActionButton title="Thử lại" onPress={() => setReload(value => value + 1)} variant="outline" /></Card>}
      {!!profile && <>
    <CompanyProfileHero
      profile={profile}
      readOnly={readOnly}
      onViewCover={() => profile.coverUrl ? setPreviewPhotoTarget('coverUrl') : !readOnly && void choosePhoto('coverUrl')}
      onEditCover={() => void choosePhoto('coverUrl')}
      onViewAvatar={() => profile.avatarUrl ? setPreviewPhotoTarget('avatarUrl') : !readOnly && void choosePhoto('avatarUrl')}
      onEditAvatar={() => void choosePhoto('avatarUrl')}
      onEditProfile={() => edit()}
      photoBusy={!!choosingPhoto || saving}
    />
    <View testID="company-profile-tabs" accessibilityRole="tablist" style={layoutStyles.profileTabs}>
      {([['about', 'Giới thiệu'], ['posts', 'Bài viết'], ['jobs', 'Tuyển dụng']] as const).map(([tab, label]) => <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={label} aria-selected={activeTab === tab} accessibilityState={{ selected: activeTab === tab }} onPress={() => setActiveTab(tab)} style={[layoutStyles.profileTab, activeTab === tab && layoutStyles.profileTabActive]}><CompanyIcon name={tab === 'about' ? { ios: 'house', android: 'home', web: 'home' } : tab === 'posts' ? { ios: 'doc.text', android: 'article', web: 'article' } : { ios: 'briefcase', android: 'work_outline', web: 'work_outline' }} size={17} color={activeTab === tab ? c.blue : c.muted} /><Text style={[layoutStyles.profileTabLabel, activeTab === tab && { color: c.blue }]}>{label}</Text></Pressable>)}
    </View>
    {activeTab === 'about' && <CompanyIntroductionCards readOnly={readOnly} profile={profile} onSaved={updated => { setProfile(updated); void companyService.getVerificationStatus().then(applyVerificationStatus).catch(() => {}); }} />}
    {activeTab === 'posts' && <CompanyProfilePosts readOnly={readOnly} key={profile.id} profileId={profile.id} />}
    {activeTab === 'jobs' && <Card style={mobile ? layoutStyles.mobileCard : undefined}><SectionTitle title="Cơ hội đang mở" action={readOnly ? undefined : "Quản lý bài đăng"} onAction={() => router.push('/(company)/jobs')} /><Text style={s.helper}>Dành cho sinh viên và người mới tốt nghiệp</Text>{profile.openJobs.map((job) => <Pressable key={job.id} accessibilityRole={readOnly ? "button" : undefined} disabled={!readOnly} onPress={() => onOpenJob?.(job.id)} style={s.job}><View style={s.jobHead}><View style={s.jobIcon}><CompanyIcon name={{ ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' }} size={17} /></View><View style={{ flex: 1 }}><Text style={s.jobTitle}>{job.title}</Text><Text style={s.helper}>{companyJobEmploymentTypeLabel[job.employmentType]} · {job.jobField || 'Chưa cập nhật lĩnh vực'}</Text><Text style={s.helper}>{job.location || 'Chưa có địa điểm'} · {job.workType === 0 ? 'Tại văn phòng' : job.workType === 1 ? 'Kết hợp' : 'Từ xa'}</Text></View><Tag tone="green">Đã đăng</Tag></View><Text style={s.salary}>{formatCompanySalary(job.minSalaryVnd, job.maxSalaryVnd)}</Text></Pressable>)}{profile.openJobs.length === 0 && <Text style={s.helper}>Hiện chưa có bài tuyển dụng đang mở.</Text>}</Card>}
    </>}
    <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => { if (!saving) setEditOpen(false); }}>
      <KeyboardAvoidingView style={editStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>{editOpen && <ToastHost modal />}<View testID="company-profile-edit-dialog" role="dialog" aria-modal accessibilityLabel="Chỉnh sửa thông tin tổ chức" accessibilityViewIsModal style={editStyles.card}>
        <View style={editStyles.header}>
          {width >= 480 && <View style={editStyles.headerIcon}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={20} /></View>}
          <View style={editStyles.heading}><Text style={editStyles.title}>Chỉnh sửa thông tin tổ chức</Text><Text style={editStyles.subtitle}>Cập nhật thông tin để mọi người dễ dàng kết nối.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng chỉnh sửa" disabled={saving} onPress={() => setEditOpen(false)} style={({ pressed }) => [editStyles.close, pressed && layoutStyles.pressed]}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color={c.muted} /></Pressable>
        </View>
        {!!editNotice && <ActionFeedback type={editNotice.type} message={editNotice.message} />}<ScrollView keyboardShouldPersistTaps="handled" style={s.modalScroll} contentContainerStyle={editStyles.content}>
        {draft && <>
          <ProfileEditField label="Tên tổ chức *" value={draft.companyName} onChangeText={value => setField('companyName', value)} error={companyNameError} disabled={saving} />
          <ProfileEditField label="Lĩnh vực" value={draft.industry ?? ''} onChangeText={value => setField('industry', value)} error={profileFieldErrors.industry} disabled={saving} />
          <View style={[editStyles.contactFields, width < 600 && editStyles.stackedFields]}>
            <ProfileEditField label="Email liên hệ" value={draft.contactEmail ?? ''} onChangeText={value => setField('contactEmail', value)} error={profileFieldErrors.contactEmail} disabled={saving} keyboardType="email-address" half={width >= 600} />
            <ProfileEditField label="Số điện thoại" value={draft.phone ?? ''} onChangeText={value => setField('phone', value)} error={profileFieldErrors.phone} disabled={saving} keyboardType="phone-pad" half={width >= 600} />
          </View>
          <ProfileEditField label="Địa chỉ" value={draft.address ?? ''} onChangeText={value => setField('address', value)} multiline error={profileFieldErrors.address} disabled={saving} />
          <View style={s.editField}><Text style={s.editLabel}>Liên kết website</Text>{draft.websites.map((website, index) => <View key={index} style={s.websiteEditRow}><WebsiteBrandIcon url={website} size={17} /><TextInput value={website} onChangeText={value => setWebsiteAt(index, value)} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://facebook.com/..." style={[s.editInput, s.websiteEditInput, !!profileFieldErrors.websites && s.editInputError]} /><Pressable accessibilityRole="button" accessibilityLabel="Xóa liên kết" onPress={() => removeWebsite(index)} style={s.websiteRemove}><CompanyIcon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={20} color={c.muted} /></Pressable></View>)}{!!profileFieldErrors.websites && <Text accessibilityRole="alert" style={s.error}>{profileFieldErrors.websites}</Text>}<Pressable accessibilityRole="button" disabled={draft.websites.length >= 10} onPress={addWebsite} style={s.addWebsite}><CompanyIcon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={16} color={draft.websites.length >= 10 ? c.muted : c.blue} /><Text style={[s.addWebsiteText, draft.websites.length >= 10 && { color: c.muted }]}>Thêm liên kết</Text></Pressable></View>
        </>}
      </ScrollView><View style={editStyles.footer}><Button title="Hủy" onPress={() => setEditOpen(false)} variant="outline" disabled={saving} style={editStyles.footerButton} textStyle={editStyles.footerLabel} /><Button title="Lưu thay đổi" loading={saving} onPress={() => void saveProfile()} style={editStyles.footerButton} textStyle={editStyles.footerLabel} /></View></View></KeyboardAvoidingView>
    </Modal>
      <Modal visible={!!previewPhotoTarget} transparent animationType="fade" onRequestClose={() => setPreviewPhotoTarget(null)}>
        <View style={s.photoPreviewOverlay}><Pressable accessibilityRole="button" accessibilityLabel="Đóng xem ảnh" style={s.photoPreviewBackdrop} onPress={() => setPreviewPhotoTarget(null)} /><View style={[s.photoPreviewFrame, { width: '100%', maxWidth: 520, minHeight: undefined, aspectRatio: previewPhotoTarget === 'avatarUrl' ? 1 : 3, overflow: 'hidden' }]}>{previewPhotoTarget && profile?.[previewPhotoTarget] ? <ProfileFramedImage uri={profile[previewPhotoTarget]!} accessibilityLabel={previewPhotoTarget === 'avatarUrl' ? 'Ảnh đại diện' : 'Ảnh bìa'} /> : null}{!readOnly && <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh" disabled={!!choosingPhoto || saving} onPress={() => { const target = previewPhotoTarget; if (target) { setPreviewPhotoTarget(null); void choosePhoto(target); } }} style={s.photoPreviewEdit}><CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={18} color={c.blue} /></Pressable>}</View></View>
    </Modal>
      {verificationOpen && <PartnerVerification onClose={() => setVerificationOpen(false)} onStatusChange={applyVerificationStatus} />}
      {photo && <CompanyPhotoDialog key={photo.target} initialAsset={photo.asset} target={photo.target} onClose={() => setPhoto(null)} onSave={savePhoto} />}
  </PageScroll></View>{!readOnly && desktop && <View testID="company-profile-settings-column" style={layoutStyles.settingsColumn}><SettingsPanel embedded onPartnerVerificationStatusChange={applyVerificationStatus} /></View>}</View></CompanyPage>;
}

const layoutStyles = StyleSheet.create({
  profileTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.white, marginTop: -14 },
  profileTab: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  profileTabActive: { borderBottomColor: c.blue }, profileTabLabel: { fontSize: 12, color: c.muted, fontWeight: '700' },
  body: { flex: 1, minHeight: 0 },
  desktopBody: { flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, width: '100%', maxWidth: 1800, alignSelf: 'center' },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  desktopScroll: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 0 },
  mobileScroll: { paddingHorizontal: 0, paddingTop: 0 },
  mobileCard: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  settingsColumn: { width: 400, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, overflow: 'hidden' },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixedMobileHeader: { flexShrink: 0, zIndex: 1, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.page },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderSlot: { flex: 1, minWidth: 0, flexDirection: 'row' },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  compactSettingsButton: { width: 32, height: 36 },
  pressed: { opacity: 0.65 },
});

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.36)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 600, maxHeight: '90%', borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, overflow: 'hidden', boxShadow: '0 20px 70px rgba(16,40,75,0.18)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: c.line },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: c.ink, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  subtitle: { color: c.muted, fontSize: 12, lineHeight: 18 },
  close: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAFF' },
  content: { padding: 20, gap: 16 },
  field: { minWidth: 0, gap: 7 },
  halfField: { flex: 1, minWidth: 0 },
  label: { color: c.ink, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFCFF', color: c.ink, fontSize: 13, outlineWidth: 0 },
  focused: { borderColor: c.blue, backgroundColor: c.white, boxShadow: '0 0 0 3px rgba(23,105,224,0.1)' },
  textarea: { minHeight: 76 },
  contactFields: { flexDirection: 'row', gap: 14 },
  stackedFields: { flexDirection: 'column', gap: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: '#F7FAFF' },
  footerButton: { minHeight: 42, paddingHorizontal: 18 },
  footerLabel: { fontSize: 13 },
});

const s = StyleSheet.create({ editIconButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, companyName: { color: c.ink, fontSize: 17, fontWeight: '900' }, websiteChip: { maxWidth: '100%', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 16, backgroundColor: '#EEF5FF' }, websiteChipText: { maxWidth: 260, color: c.blue, fontSize: 10, fontWeight: '700' }, websiteEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }, websiteEditInput: { flex: 1 }, websiteRemove: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' }, addWebsite: { minHeight: 34, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }, addWebsiteText: { color: c.blue, fontSize: 10, fontWeight: '700' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginHorizontal: 14, marginBottom: 14 }, body: { color: c.ink, fontSize: 11, lineHeight: 18 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, job: { paddingTop: 12, marginTop: 11, borderTopWidth: 1, borderColor: c.line }, jobHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, jobIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: c.purpleSoft, alignItems: 'center', justifyContent: 'center' }, jobTitle: { color: c.ink, fontWeight: '800', fontSize: 10 }, salary: { color: c.purple, fontSize: 9, fontWeight: '700', marginTop: 7, marginLeft: 39 }, verificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }, notice: { flexDirection: 'row', gap: 8, backgroundColor: '#F5F8FF' }, noticeText: { flex: 1, color: c.muted, fontSize: 9, lineHeight: 14 }, personName: { color: c.ink, fontSize: 10, fontWeight: '800' }, error: { color: c.rose, fontSize: 11 }, saveNotice: { borderRadius: 11, padding: 11, gap: 3, marginVertical: 8 }, saveNoticeSuccess: { backgroundColor: '#ECF8F1' }, saveNoticeError: { backgroundColor: '#FFF1F2' }, saveNoticeTitle: { color: c.ink, fontSize: 11, fontWeight: '900' }, saveNoticeText: { color: c.muted, fontSize: 10, lineHeight: 15 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,30,0.45)', justifyContent: 'center', padding: 18 }, modalCard: { maxHeight: '90%', borderRadius: 18, padding: 16, backgroundColor: '#FFF' }, modalTitle: { color: c.ink, fontSize: 16, fontWeight: '900', marginBottom: 10 }, modalScroll: { flexGrow: 0 }, photoPreviewOverlay: { flex: 1, backgroundColor: 'rgba(12,25,45,0.78)', alignItems: 'center', justifyContent: 'center', padding: 18 }, photoPreviewBackdrop: { ...StyleSheet.absoluteFill }, photoPreviewFrame: { width: '100%', maxWidth: 520, maxHeight: '80%', minHeight: 240, alignItems: 'center', justifyContent: 'center' }, photoPreviewCover: { width: '100%', aspectRatio: 3, borderRadius: 12 }, photoPreviewAvatar: { width: 280, height: 280, borderRadius: 18 }, photoPreviewEdit: { position: 'absolute', top: 10, right: 10, width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 4 }, editField: { gap: 5, marginTop: 8 }, editLabel: { color: c.ink, fontSize: 11, fontWeight: '700' }, editInput: { minHeight: 42, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 10, color: c.ink, fontSize: 12 }, editInputError: { borderColor: c.rose }, editTextarea: { minHeight: 76, paddingTop: 10 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 } });
