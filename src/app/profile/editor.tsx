import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { ProfileEditableTemplate } from '@/components/profile/ProfileEditableTemplate';
import { ProfileEntryForm } from '@/components/profile/ProfileEntryForm';
import { ProfileFieldForm } from '@/components/profile/ProfileFieldForm';
import { ProfilePhotoForm } from '@/components/profile/ProfilePhotoForm';
import type { ImagePickerAsset } from 'expo-image-picker';
import { pickProfileImage } from '@/utils/profile-image-picker';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { portfolioService } from '@/services/portfolio.service';
import { authStore, useAuthStore } from '@/store/auth.store';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import type { ProfileEditorSection } from '@/utils/profile-editor';
import { updateProfileField, updateProfileImage, type ProfileEditField, type ProfileImageTarget } from '@/utils/profile-fields';
import { createProfileDraft, isProfileDraftDirty, updateProfileAppearance } from '@/utils/profile-draft';

export default function ProfileEditorScreen() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const params = useLocalSearchParams<{ template?: string; theme?: string; photo?: string }>();
  const requestedPhoto = useRef(false);
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const [loaded, setLoaded] = useState<{ accountId: string; data: PortfolioResponse } | null>(null);
  const data = loaded && loaded.accountId === account?.id && isAuthenticated ? loaded.data : null;
  const [baseline, setBaseline] = useState<PortfolioResponse | null>(null);
  const template = getProfileTemplate(data?.portfolio.appearance.profile.template ?? params.template);
  const theme = getProfileTheme(template.id, data?.portfolio.appearance.profile.theme ?? params.theme);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const dirty = !!data && !!baseline && isProfileDraftDirty(data, baseline);
  const [message, setMessage] = useState('');
  const [section, setSection] = useState<ProfileEditorSection | null>(null);
  const [field, setField] = useState<ProfileEditField | null>(null);
  const [photo, setPhoto] = useState<{ target: ProfileImageTarget | 'avatarUrl' | 'coverUrl'; asset: ImagePickerAsset } | null>(null);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const pickerVersion = useRef(0);
  const [leaving, setLeaving] = useState<'back' | 'templates' | null>(null);
  const [pendingDestination, setPendingDestination] = useState<'back' | 'templates' | null>(null);
  const pendingAction = useRef<NavigationAction | null>(null);
  const navigation = useNavigation();
  const [frameWidth, setFrameWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const saveController = useRef<AbortController | null>(null);
  const width = Math.min(frameWidth || windowWidth, 1120);
  useEffect(() => {
    pickerVersion.current++; setChoosingPhoto(false);
    setLoaded(null); setBaseline(null); setError(''); setSection(null); setField(null); setPhoto(null); setMessage(''); setSaving(false); setLeaving(null);
    if (isLoading || !isAuthenticated || !account?.id) return;
    const controller = new AbortController();
    portfolioService.getMine(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (!result.isOwner) throw new Error('Bạn không có quyền chỉnh sửa hồ sơ này.');
      setBaseline(result);
      setLoaded({ accountId: account.id, data: createProfileDraft(result, params.template, params.theme) });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ. Vui lòng thử lại.'); });
    return () => { pickerVersion.current++; controller.abort(); saveController.current?.abort(); saveController.current = null; };
  }, [account?.id, isAuthenticated, isLoading, attempt, params.template, params.theme]);
  const choosePhoto = async (target: ProfileImageTarget | 'avatarUrl' | 'coverUrl') => {
    if (!data || saving || choosingPhoto) return;
    const version = pickerVersion.current;
    setChoosingPhoto(true); setMessage('');
    try { const asset = await pickProfileImage(); if (version === pickerVersion.current && asset) setPhoto({ target, asset }); }
    catch (cause) { if (version === pickerVersion.current) setMessage(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh.'); }
    finally { if (version === pickerVersion.current) setChoosingPhoto(false); }
  };
  const back = () => router.canGoBack() ? router.back() : router.replace({ pathname: '/profile/preview', params: { template: template.id, theme: theme.id } });
  useEffect(() => {
    if (params.photo === 'avatar' && data && !requestedPhoto.current) {
      requestedPhoto.current = true; void choosePhoto('avatarUrl');
    }
  }, [params.photo, data]);
  usePreventRemove(saving || dirty, ({ data: event }) => {
    if (saving) return;
    pendingAction.current = event.action; setLeaving('back');
  });
  useEffect(() => {
    if (!pendingDestination || dirty || saving) return;
    const action = pendingAction.current; pendingAction.current = null; setPendingDestination(null);
    if (pendingDestination === 'templates') router.push('/profile/templates');
    else if (action) navigation.dispatch(action);
    else if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/profile/preview', params: { template: template.id, theme: theme.id } });
  }, [pendingDestination, dirty, saving, navigation, template.id, theme.id]);
  useEffect(() => {
    // React Native also defines window, without browser event listener APIs.
    if (Platform.OS !== 'web' || typeof window === 'undefined' || (!dirty && !saving)) return;
    const preventReload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventReload);
    return () => window.removeEventListener('beforeunload', preventReload);
  }, [dirty, saving]);
  const add = (content: PortfolioContent) => {
    if (!data || saving) return;
    setLoaded({ accountId: account!.id, data: { ...data, portfolio: content } });
    setMessage(''); setSection(null);
  };
  const save = async () => {
    if (!data || !dirty || saveController.current || !account?.id) return;
    const accountId = account.id;
    const controller = new AbortController(); saveController.current = controller;
    setSaving(true); setMessage('');
    try {
      const result = await portfolioService.saveEditor(data, controller.signal);
      if (!controller.signal.aborted) {
        setLoaded({ accountId, data: result }); setBaseline(result); setMessage('Đã lưu hồ sơ.');
        if (account.profile) authStore.updateAccount({ ...account, profile: { ...account.profile, fullName: result.profile.fullName, nickname: result.profile.nickname ?? account.profile.nickname, displayName: result.profile.nickname || result.profile.fullName, isVerified: result.profile.isVerified } });
      }
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(cause instanceof Error ? cause.message : 'Chưa lưu được hồ sơ. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) { saveController.current = null; setSaving(false); }
    }
  };
  // Static HTML cannot resolve query-selected appearance until the client hydrates.
  if (Platform.OS === 'web' && !hydrated) return <SafeAreaView style={s.safe}><View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải trình chỉnh sửa" color={colors.primary} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại xem mẫu" disabled={saving} onPress={() => dirty ? setLeaving('back') : back()} style={s.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.textPrimary} /></Pressable>
      <View style={s.headerCopy}><Text role="heading" aria-level={1} style={s.title}>Hồ sơ của tôi</Text><Text style={s.subtitle}>{template.name} · {theme.name}</Text></View>
      <View style={s.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn mẫu khác" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => dirty ? setLeaving('templates') : router.push('/profile/templates')} style={({ pressed }) => [s.iconButton, pressed && s.pressed, saving && s.disabled]}><SymbolView name={{ ios: 'rectangle.grid.2x2', android: 'dashboard', web: 'dashboard' }} size={22} tintColor={colors.primary} /></Pressable>
        {!!data && <Pressable accessibilityRole="button" accessibilityLabel="Lưu hồ sơ" accessibilityState={{ disabled: !dirty || saving, busy: saving }} disabled={!dirty || saving} onPress={() => void save()} style={({ pressed }) => [s.iconButton, s.save, pressed && s.pressed, (!dirty || saving) && s.disabled]}>{saving ? <ActivityIndicator color={colors.surface} /> : <SymbolView name={{ ios: 'square.and.arrow.down', android: 'save', web: 'save' }} size={22} tintColor={colors.surface} />}</Pressable>}
      </View>
    </View>
    {!!data && <View style={s.palette}>{template.themes.map(color => <Pressable key={color.id} accessibilityRole="button" accessibilityLabel={`Chọn màu ${color.name}`} accessibilityState={{ selected: color.id === theme.id, disabled: saving }} aria-pressed={color.id === theme.id} disabled={saving} onPress={() => { setLoaded({ accountId: account!.id, data: updateProfileAppearance(data, template.id, color.id) }); setMessage(''); }} style={({ pressed }) => [s.paletteButton, { borderColor: color.id === theme.id ? color.accent : colors.border, backgroundColor: color.id === theme.id ? color.accentSoft : colors.surface }, pressed && s.pressed, saving && s.disabled]}><View style={[s.swatch, { backgroundColor: color.swatch }]} /><Text style={[s.paletteLabel, { color: color.id === theme.id ? color.accentStrong : colors.textSecondary }]}>{color.name}{color.id === theme.id ? ' ✓' : ''}</Text></Pressable>)}</View>}
    {isLoading ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải phiên đăng nhập" color={colors.primary} /></View> : !isAuthenticated ? <View style={s.state}><Text style={s.stateTitle}>Đăng nhập để tạo hồ sơ của bạn</Text><Text style={s.hint}>Mẫu đã chọn sẽ được giữ lại khi bạn quay lại trang này.</Text><Button title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></View> : error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : !data ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ của bạn" color={colors.primary} /></View> : <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.notice}><Text style={s.hint}>Lưu để áp dụng nội dung, mẫu và màu cho hồ sơ của bạn. Quyền riêng tư và chế độ hiển thị hiện tại được giữ nguyên.</Text>{dirty && <Text accessibilityLiveRegion="polite" style={s.pending}>Có thay đổi chưa lưu.</Text>}{!!message && <Text accessibilityLiveRegion="polite" accessibilityRole={dirty ? 'alert' : undefined} style={dirty ? s.error : s.success}>{message}</Text>}</View>
      <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)} style={s.frame}>
        <ProfileEditableTemplate templateId={template.id} key={`${account?.id}-${template.id}`} data={data} theme={theme} width={width} disabled={saving || choosingPhoto} onAdd={setSection} onField={next => { if (next === "avatarUrl" || next === "coverUrl") void choosePhoto(next); else setField(next); }} onPhoto={target => { void choosePhoto(target); }} />
      </View>
    </ScrollView>}
    {section && data && <ProfileEntryForm key={`${account?.id}-${section.id}`} section={section} data={data} onAdd={add} onClose={() => setSection(null)} />}
    {field && data && <ProfileFieldForm key={`${account?.id}-${field}`} data={data} field={field} onClose={() => setField(null)} onConfirm={next => { if (!saving && account) { setLoaded({ accountId: account.id, data: next }); setMessage(''); setField(null); } }} />}
    {photo && data && <ProfilePhotoForm portrait={photo.target === 'avatarUrl' && account?.role === ACCOUNT_ROLE.STUDENT} key={`${account?.id}-${typeof photo.target === 'string' ? photo.target : `${photo.target.section}-${photo.target.index}`}`} initialAsset={photo.asset} onClose={() => setPhoto(null)} onConfirm={url => { if (!saving && account) { const next = typeof photo.target === 'string' ? updateProfileField(data, photo.target, url) : updateProfileImage(data, photo.target, url); setLoaded({ accountId: account.id, data: next }); setMessage(''); setPhoto(null); } }} />}
    <Modal visible={!!leaving} transparent animationType="fade" onRequestClose={() => { pendingAction.current = null; setLeaving(null); }}><View style={s.overlay}><View style={s.confirm}><Text style={s.stateTitle}>Thay đổi chưa được lưu</Text><Text style={s.hint}>Rời trang sẽ bỏ các thông tin bạn vừa thêm.</Text><Button title="Tiếp tục chỉnh sửa" onPress={() => { pendingAction.current = null; setLeaving(null); }} /><Button title={leaving === 'templates' ? 'Bỏ thay đổi và chọn mẫu khác' : 'Bỏ thay đổi và quay lại'} variant="outline" onPress={() => { if (baseline && account) setLoaded({ accountId: account.id, data: createProfileDraft(baseline) }); setPendingDestination(leaving); setLeaving(null); }} /></View></View></Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, minWidth: 0 }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, save: { backgroundColor: colors.primary }, pressed: { opacity: 0.65 }, disabled: { opacity: 0.55 },
  palette: { width: '100%', maxWidth: 1120, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 18, paddingBottom: 8 }, paletteButton: { minHeight: 22, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }, swatch: { width: 7, height: 7, borderRadius: 3.5 }, paletteLabel: { fontSize: 10, fontWeight: '600' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, notice: { padding: 14, marginHorizontal: 18, marginTop: 12, backgroundColor: colors.primaryLight, borderRadius: 10, gap: 6 }, hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, pending: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' }, success: { color: colors.success, fontSize: 13 }, error: { color: colors.error, fontSize: 13, lineHeight: 21 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, stateTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' }, frame: { width: '100%', overflow: 'hidden', marginTop: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center', padding: 18 }, confirm: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 16 },
});
