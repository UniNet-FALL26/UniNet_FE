import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProfileTextInput } from '@/components/profile/ProfileTextInput';
import { Button } from '@/components/ui/Button';
import { companyService, type CompanyProfile } from '@/services/company.service';
import { introductionDraft, introductionInput, type PartnerIntroductionDraft, type PartnerIntroductionSection } from '@/utils/partner-introduction';
import { CompanyIcon, companyColors as c } from './company-ui';
import { authStore } from '@/store/auth.store';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { pickImage, imageBody } from '@/utils/image-picker';
import { uploadProfileImage } from '@/utils/profile-image-picker';
import { resolvePartnerImages, type PartnerImageSelection } from '@/utils/partner-introduction-images';

export const introductionTitles = { about: 'Giới thiệu', business: 'Thông tin doanh nghiệp', gallery: 'Hình ảnh công ty' };
export function PartnerIntroductionEditor({ section, profile, onSaved, onClose }: { section: PartnerIntroductionSection; profile: CompanyProfile; onSaved: (profile: CompanyProfile) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(() => introductionDraft(profile));
  const [images, setImages] = useState<PartnerImageSelection[]>(() => (section === 'about' ? profile.introduction?.imageUrl ? [profile.introduction.imageUrl] : [] : section === 'gallery' ? profile.introduction?.galleryUrls ?? [] : []).map(uri => ({ uri })));
  const [choosing, setChoosing] = useState(false), [phase, setPhase] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const picking = useRef(false), mounted = useRef(true), uploaded = useRef(new Map<ImagePickerAsset, string>());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);
  const close = () => { if (!pending.current && !picking.current) onClose(); };
  const choose = async (index?: number) => {
    if (pending.current || picking.current || (index === undefined && images.length >= 20)) return;
    picking.current = true; setChoosing(true); setError('');
    try {
      const asset = await pickImage();
      if (asset) {
        await imageBody(asset);
        if (mounted.current) setImages(current => index === undefined ? [...current, { uri: asset.uri, asset }] : current.map((image, i) => i === index ? { uri: asset.uri, asset } : image));
      }
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không chọn được ảnh.'); }
    finally { picking.current = false; if (mounted.current) setChoosing(false); }
  };
  const set = <K extends keyof PartnerIntroductionDraft>(key: K, value: PartnerIntroductionDraft[K]) => { setDraft(current => ({ ...current, [key]: value })); setError(''); };
  const save = async () => {
    if (pending.current || picking.current) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    try {
      introductionInput(profile, section, draft);
      let confirmed = draft;
      if (section !== 'business') {
        setPhase('Đang tải ảnh lên…');
        const urls = await resolvePartnerImages(images, uploadProfileImage, uploaded.current, controller.signal);
        confirmed = section === 'about' ? { ...draft, imageUrl: urls[0] ?? '' } : { ...draft, galleryUrls: urls };
      }
      setPhase('Đang lưu thông tin…');
      const latest = await companyService.getProfile(controller.signal);
      const account = await companyService.saveProfile(introductionInput(latest, section, confirmed), controller.signal);
      if (controller.signal.aborted) return;
      authStore.updateAccount(account);
      const updated = await companyService.getProfile(controller.signal);
      if (!controller.signal.aborted) { onSaved(updated); onClose(); }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa lưu được thông tin.'); }
    finally { pending.current = null; if (!controller.signal.aborted) { setBusy(false); setPhase(''); } }
  };
  const field = (key: Exclude<keyof PartnerIntroductionDraft, 'galleryUrls'>, label: string, multiline = false) => <ProfileTextInput label={label} value={draft[key]} onChangeText={value => set(key, value)} editable={!busy} multiline={multiline} minimumHeight={key === 'description' ? 150 : multiline ? 80 : 44} autoCapitalize={key === 'imageUrl' ? 'none' : 'sentences'} autoCorrect={key === 'imageUrl' ? false : undefined} />;
  const imagePreview = (image: PartnerImageSelection, index: number) => <View key={image.uri + index} style={s.selectedImage}>
    <Image source={{ uri: image.uri }} accessibilityLabel={`Ảnh đã chọn ${index + 1}`} contentFit="contain" style={s.preview} />
    <View style={s.imageActions}><Button style={s.compactButton} textStyle={s.compactButtonText} title={section === 'about' ? 'Chọn ảnh khác' : `Thay ảnh ${index + 1}`} variant="outline" disabled={busy || choosing} onPress={() => void choose(index)} /><Pressable accessibilityRole="button" accessibilityLabel={section === 'about' ? 'Xóa ảnh giới thiệu' : `Xóa ảnh ${index + 1}`} disabled={busy || choosing} onPress={() => setImages(current => current.filter((_, i) => i !== index))} style={s.remove}><CompanyIcon name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={18} color={c.rose} /></Pressable></View>
  </View>;
  return <Modal transparent visible animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={'Chỉnh sửa ' + introductionTitles[section]} style={s.dialog}>
        <View style={s.header}><View style={s.heading}><Text role="heading" style={s.title}>{introductionTitles[section]}</Text><Text style={s.hint}>Cập nhật thông tin hiển thị trên hồ sơ tổ chức.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng chỉnh sửa" disabled={busy || choosing} onPress={close} style={s.close}><CompanyIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} /></Pressable></View>
        <ScrollView style={s.scroll} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {busy && <Text accessibilityLiveRegion="polite" style={s.hint}>{phase}</Text>}
          {section === 'about' && <>{field('description', 'Nội dung giới thiệu', true)}<Text style={s.label}>Ảnh giới thiệu</Text>{images.map(imagePreview)}{images.length === 0 && <Button style={s.compactButton} textStyle={s.compactButtonText} title="Chọn ảnh giới thiệu" variant="outline" disabled={busy || choosing} loading={choosing} onPress={() => void choose()} />}<Text style={s.hint}>Chọn một ảnh từ thiết bị. Ảnh chỉ được tải lên khi bạn bấm Xác nhận.</Text></>}
          {section === 'business' && <>{field('address', 'Trụ sở chính', true)}{field('foundedOn', 'Ngày thành lập (dd/mm/yyyy)')}{field('industry', 'Lĩnh vực hoạt động')}{field('employeeRange', 'Quy mô nhân sự')}{field('branches', 'Chi nhánh (mỗi dòng một chi nhánh)', true)}</>}
          {section === 'gallery' && <><Text style={s.hint}>Chọn tối đa 20 ảnh từ thiết bị. Bốn ảnh đầu tiên sẽ xuất hiện trên hồ sơ.</Text>{images.map(imagePreview)}<Button style={s.compactButton} textStyle={s.compactButtonText} title="Thêm ảnh từ thiết bị" variant="outline" disabled={busy || choosing || images.length >= 20} loading={choosing} onPress={() => void choose()} /></>}
          {section !== 'business' && <Text style={s.hint}>JPG, PNG hoặc WebP · tối đa 5 MB mỗi ảnh. Bấm Xác nhận để tải ảnh lên và lưu hồ sơ.</Text>}
        </ScrollView>
        <View style={s.footer}><Button style={s.compactButton} textStyle={s.compactButtonText} title="Hủy" variant="outline" disabled={busy || choosing} onPress={close} /><Button style={s.compactButton} textStyle={s.compactButtonText} title={section === 'business' ? 'Lưu thay đổi' : 'Xác nhận'} disabled={busy || choosing} loading={busy} onPress={() => void save()} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,40,75,0.4)' },
  dialog: { width: '100%', maxWidth: 620, maxHeight: '90%', borderRadius: 18, backgroundColor: c.white, overflow: 'hidden' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  heading: { flex: 1, minWidth: 0, gap: 4 }, title: { color: c.ink, fontSize: 18, fontWeight: '800' }, hint: { color: c.muted, fontSize: 12, lineHeight: 18 },
  close: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.page },
  scroll: { flexShrink: 1 }, form: { padding: 20, gap: 18 }, error: { color: c.rose, fontSize: 12, lineHeight: 18 },
  compactButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 8 },
  compactButtonText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  footer: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: c.line },
  label: { color: c.ink, fontSize: 13, fontWeight: '700' }, selectedImage: { gap: 8 }, preview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: c.page }, imageActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, remove: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
});
