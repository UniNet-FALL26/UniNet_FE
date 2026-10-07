import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { ProfileEditableTemplate } from '@/components/profile/ProfileEditableTemplate';
import { ProfileEntryForm } from '@/components/profile/ProfileEntryForm';
import { ProfileFieldForm } from '@/components/profile/ProfileFieldForm';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { colors } from '@/constants/colors';
import { portfolioService } from '@/services/portfolio.service';
import { authStore, useAuthStore } from '@/store/auth.store';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import type { ProfileEditorSection } from '@/utils/profile-editor';
import { updateProfileImage, type ProfileEditField, type ProfileImageTarget } from '@/utils/profile-fields';

export default function ProfileEditorScreen() {
  const params = useLocalSearchParams<{ template?: string; theme?: string }>();
  const template = getProfileTemplate(params.template);
  const theme = getProfileTheme(template.id, params.theme);
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const [loaded, setLoaded] = useState<{ accountId: string; data: PortfolioResponse } | null>(null);
  const data = loaded && loaded.accountId === account?.id && isAuthenticated ? loaded.data : null;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [section, setSection] = useState<ProfileEditorSection | null>(null);
  const [field, setField] = useState<ProfileEditField | null>(null);
  const [photo, setPhoto] = useState<ProfileImageTarget | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const saveController = useRef<AbortController | null>(null);
  const width = Math.min(frameWidth || windowWidth, 1120);
  useEffect(() => {
    setLoaded(null); setError(''); setSection(null); setField(null); setPhoto(null); setDirty(false); setMessage(''); setSaving(false); setLeaving(false);
    if (isLoading || !isAuthenticated || !account?.id) return;
    const controller = new AbortController();
    portfolioService.getMine(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (!result.isOwner) throw new Error('Bạn không có quyền chỉnh sửa hồ sơ này.');
      setLoaded({ accountId: account.id, data: result });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ. Vui lòng thử lại.'); });
    return () => { controller.abort(); saveController.current?.abort(); saveController.current = null; };
  }, [account?.id, isAuthenticated, isLoading, attempt]);
  const back = () => router.canGoBack() ? router.back() : router.replace({ pathname: '/profile/preview', params: { template: template.id, theme: theme.id } });
  const add = (content: PortfolioContent) => {
    if (!data || saving) return;
    setLoaded({ accountId: account!.id, data: { ...data, portfolio: content } });
    setDirty(true); setMessage(''); setSection(null);
  };
  const save = async () => {
    if (!data || !dirty || saveController.current || !account?.id) return;
    const accountId = account.id;
    const controller = new AbortController(); saveController.current = controller;
    setSaving(true); setMessage('');
    try {
      const result = await portfolioService.saveEditor(data, controller.signal);
      if (!controller.signal.aborted) {
        setLoaded({ accountId, data: result }); setDirty(false); setMessage('Đã lưu hồ sơ.');
        if (account.profile) authStore.updateAccount({ ...account, profile: { ...account.profile, fullName: result.profile.fullName, nickname: result.profile.nickname ?? account.profile.nickname, displayName: result.profile.nickname || result.profile.fullName, isVerified: result.profile.isVerified } });
      }
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(cause instanceof Error ? cause.message : 'Chưa lưu được hồ sơ. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) { saveController.current = null; setSaving(false); }
    }
  };
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại xem mẫu" disabled={saving} onPress={() => dirty ? setLeaving(true) : back()} style={s.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.textPrimary} /></Pressable>
      <View style={s.headerCopy}><Text role="heading" aria-level={1} style={s.title}>Hồ sơ của tôi</Text><Text style={s.subtitle}>{template.name} · {theme.name}</Text></View>
      {!!data && <Button title="Lưu hồ sơ" onPress={() => void save()} loading={saving} disabled={!dirty} style={s.save} />}
    </View>
    {isLoading ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải phiên đăng nhập" color={colors.primary} /></View> : !isAuthenticated ? <View style={s.state}><Text style={s.stateTitle}>Đăng nhập để tạo hồ sơ của bạn</Text><Text style={s.hint}>Mẫu đã chọn sẽ được giữ lại khi bạn quay lại trang này.</Text><Button title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></View> : error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : !data ? <View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ của bạn" color={colors.primary} /></View> : <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.notice}><Text style={s.hint}>Bạn đang xem thông tin của mình với mẫu đã chọn. Mẫu và màu chỉ dùng để xem trước tại đây; quyền riêng tư của hồ sơ được giữ nguyên.</Text>{dirty && <Text accessibilityLiveRegion="polite" style={s.pending}>Có thay đổi chưa lưu.</Text>}{!!message && <Text accessibilityLiveRegion="polite" accessibilityRole={dirty ? 'alert' : undefined} style={dirty ? s.error : s.success}>{message}</Text>}</View>
      <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)} style={s.frame}>
        <ProfileEditableTemplate templateId={template.id} key={`${account?.id}-${template.id}`} data={data} theme={theme} width={width} disabled={saving} onAdd={setSection} onField={setField} onPhoto={setPhoto} />
      </View>
    </ScrollView>}
    {section && data && <ProfileEntryForm key={`${account?.id}-${section.id}`} section={section} data={data} onAdd={add} onClose={() => setSection(null)} />}
    {field && data && <ProfileFieldForm key={`${account?.id}-${field}`} data={data} field={field} onClose={() => setField(null)} onConfirm={next => { if (!saving && account) { setLoaded({ accountId: account.id, data: next }); setDirty(true); setMessage(''); setField(null); } }} />}
    {photo && data && <ProfileFieldForm key={`${account?.id}-${photo.section}-${photo.index}`} field="avatarUrl" label="Đổi ảnh mục hồ sơ" data={{ ...data, profile: { ...data.profile, avatarUrl: (data.portfolio[photo.section][photo.index] as { logoUrl?: string | null; coverUrl?: string | null })[photo.section === 'certificates' ? 'logoUrl' : 'coverUrl'] ?? null } }} onClose={() => setPhoto(null)} onConfirm={next => { if (!saving && account) { setLoaded({ accountId: account.id, data: updateProfileImage(data, photo, next.profile.avatarUrl ?? '') }); setDirty(true); setMessage(''); setPhoto(null); } }} />}
    <Modal visible={leaving} transparent animationType="fade" onRequestClose={() => setLeaving(false)}><View style={s.overlay}><View style={s.confirm}><Text style={s.stateTitle}>Thay đổi chưa được lưu</Text><Text style={s.hint}>Rời trang sẽ bỏ các thông tin bạn vừa thêm.</Text><Button title="Tiếp tục chỉnh sửa" onPress={() => setLeaving(false)} /><Button title="Bỏ thay đổi và quay lại" variant="outline" onPress={back} /></View></View></Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, minWidth: 0 }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 }, save: { minHeight: 44, paddingHorizontal: 12 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, notice: { padding: 14, marginHorizontal: 18, marginTop: 12, backgroundColor: colors.primaryLight, borderRadius: 10, gap: 6 }, hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, pending: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' }, success: { color: colors.success, fontSize: 13 }, error: { color: colors.error, fontSize: 13, lineHeight: 21 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, stateTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' }, frame: { width: '100%', overflow: 'hidden', marginTop: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center', padding: 18 }, confirm: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 16 },
});
