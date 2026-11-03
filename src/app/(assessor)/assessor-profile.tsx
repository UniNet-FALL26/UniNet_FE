import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { authStore, useAuthStore } from '@/store/auth.store';
import { assessorProfileService, type AssessorProfile as ExpertProfile } from '@/services/assessor-profile.service';
import { AssessorSectionEditor } from '@/components/assessor/AssessorSectionEditor';
import { AssessorProfileContent } from '@/components/assessor/AssessorProfileContent';
import { AssessorProfileTabs } from '@/components/assessor/AssessorProfileTabs';
import type { AssessorProfileTab } from '@/constants/assessor-profile-tabs';
import type { AssessorProfileSection, AssessorProfileSectionValues } from '@/constants/assessor-profile-sections';
import { AssessorNameEditor } from '@/components/assessor/AssessorNameEditor';
import { AssessorProfileHero } from '@/components/assessor/AssessorProfileHero';
import { CompanyPhotoDialog } from '@/components/company/CompanyPhotoDialog';
import { pickProfileImage } from '@/utils/profile-image-picker';
import { imageBody } from '@/utils/image-picker';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { AssessorState, assessorStyles as shared } from '@/components/assessor/assessor-ui';
import { colors } from '@/constants/colors';

export default function AssessorProfileScreen() {
  const { account } = useAuthStore(); const { width } = useWindowDimensions(); const wide = width >= 1200, compactHeader = width < 600;
  const [loaded, setLoaded] = useState<{ owner: string; profile: ExpertProfile | null } | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<{ owner: string; section: AssessorProfileSection; summary: boolean } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false), [clearing, setClearing] = useState(false);
  const [editingNameOwner, setEditingNameOwner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssessorProfileTab>('posts');
  useEffect(() => { setActiveTab('posts'); }, [account?.id]);
  const [photo, setPhoto] = useState<{ owner: string; target: 'avatarUrl' | 'coverUrl'; asset: ImagePickerAsset } | null>(null), [choosingPhoto, setChoosingPhoto] = useState(false);
  const choosing = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const identity = useRef(account?.id); identity.current = account?.id;
  useFocusEffect(useCallback(() => {
    if (!account) return; const owner = account.id; const controller = new AbortController(); setError('');
    assessorProfileService.get(controller.signal).then(result => { if (!controller.signal.aborted) setLoaded({ owner, profile: result.profile }); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được hồ sơ.'); });
    return () => controller.abort();
  }, [account?.id, attempt]));
  const data = loaded && loaded.owner === account?.id ? loaded.profile : null;
  const name = data?.fullName || account?.profile?.fullName || 'Thẩm định viên';
  const avatar = data?.avatarUrl || account?.profile?.avatarUrl;
  const saveSection = async (section: AssessorProfileSection, values: AssessorProfileSectionValues, signal: AbortSignal, summary = false) => {
    const owner = account?.id; if (!owner) return;
    const result = await assessorProfileService.saveSection(section, values, signal, summary);
    if (signal.aborted || !alive.current || identity.current !== owner) return;
    setLoaded({ owner, profile: result.profile }); authStore.updateAccount(result);
  };
  const saveName = async (fullName: string, signal: AbortSignal) => {
    const owner = account?.id; if (!owner) return;
    const result = await assessorProfileService.saveName(fullName, signal);
    if (!signal.aborted && alive.current && identity.current === owner) { setLoaded({ owner, profile: result.profile }); authStore.updateAccount(result); }
  };
  const choosePhoto = async (target: 'avatarUrl' | 'coverUrl') => {
    const owner = account?.id; if (!owner || !data || choosing.current || photo) return;
    choosing.current = true; setChoosingPhoto(true); setError('');
    try {
      const asset = await pickProfileImage(target);
      if (asset) { await imageBody(asset); if (alive.current && identity.current === owner) setPhoto({ owner, target, asset }); }
    } catch (cause) { if (alive.current && identity.current === owner) setError(cause instanceof Error ? cause.message : 'Không chọn được ảnh.'); }
    finally { choosing.current = false; if (alive.current) setChoosingPhoto(false); }
  };
  const savePhoto = async (url: string, signal: AbortSignal) => {
    if (!photo || photo.owner !== identity.current) throw new Error('Phiên đăng nhập đã thay đổi.');
    const { owner, target } = photo;
    const { profile: current } = await assessorProfileService.get(signal);
    if (!current || signal.aborted || identity.current !== owner) throw new Error('Không thể lưu ảnh lúc này.');
    const updated = await assessorProfileService.save({
      fullName: current.fullName, nickname: current.nickname, bio: current.bio, contactEmail: current.contactEmail, phone: current.phone, address: current.address,
      avatarUrl: target === 'avatarUrl' ? url : current.avatarUrl ?? null,
      coverUrl: target === 'coverUrl' ? url : current.coverUrl ?? null, assessorJson: current.assessorJson ?? null,
    }, signal);
    if (!signal.aborted && alive.current && identity.current === owner) { setLoaded({ owner, profile: updated.profile }); authStore.updateAccount(updated); }
  };
  const clearExpertise = async () => {
    if (clearing) return; const owner = account?.id; if (!owner) return; setClearing(true);
    try { const result = await assessorProfileService.clear(); if (alive.current && identity.current === owner) { setLoaded({ owner, profile: result.profile }); authStore.updateAccount(result); setConfirmClear(false); } }
    catch (cause) { if (alive.current && identity.current === owner) setError(cause instanceof Error ? cause.message : 'Chưa xóa được dữ liệu chuyên môn.'); }
    finally { if (alive.current && identity.current === owner) setClearing(false); }
  };
  return <View style={shared.page} testID="assessor-profile-page">
    {!wide && <View testID="assessor-profile-header" style={s.mobileHeader}><View style={s.headerSpacer} /><View style={[s.headerActions, compactHeader && s.compactHeaderActions]}>
      <Pressable testID="assessor-profile-edit-action" accessibilityRole="button" accessibilityLabel="Chỉnh sửa họ tên" disabled={!data || choosingPhoto || !!photo} hitSlop={compactHeader ? 6 : undefined} onPress={() => setEditingNameOwner(account?.id ?? null)} style={({ pressed }) => [s.settingsButton, compactHeader && s.compactSettings, pressed && s.pressed, !data && s.disabled]}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={23} tintColor={colors.textPrimary} /></Pressable>
      <Pressable testID="assessor-profile-settings-action" accessibilityRole="button" accessibilityLabel="Mở cài đặt" hitSlop={compactHeader ? 6 : undefined} onPress={() => router.push('/settings')} style={({ pressed }) => [s.settingsButton, compactHeader && s.compactSettings, pressed && s.pressed]}><SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={23} tintColor={colors.textPrimary} /></Pressable>
    </View></View>}
    <View style={[s.columns, wide && s.desktopColumns]}><ScrollView testID="assessor-profile-main-column" style={s.mainColumn} showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, wide && s.desktopContent]}>
      <AssessorProfileHero fullName={name} avatarUrl={avatar} coverUrl={data?.coverUrl} isVerified={data?.isVerified ?? account?.profile?.isVerified ?? false}
        disabled={!data || choosingPhoto || !!photo} onEditCover={() => void choosePhoto('coverUrl')} onEditAvatar={() => void choosePhoto('avatarUrl')} onEditProfile={() => setEditingNameOwner(account?.id ?? null)}>
        <AssessorProfileTabs active={activeTab} onChange={setActiveTab} />
      </AssessorProfileHero>
      {!!error && <AssessorState error={error} retry={() => setAttempt(v => v + 1)} />}
      {!data && !error && <AssessorState loading />}
      {data && <AssessorProfileContent profile={data} active={activeTab} accountEmail={account?.email} joinedAt={account?.createdAt} onEdit={section => { if (account) setEditing({ owner: account.id, section, summary: activeTab === 'posts' }); }} />}
      {activeTab === 'work' && data?.assessorJson && <View style={[shared.card, { marginHorizontal: 20 }]}><Text style={shared.sectionTitle}>Dữ liệu chuyên môn</Text><Text style={shared.muted}>{confirmClear ? 'Xác nhận xóa toàn bộ dữ liệu chuyên môn? Thông tin cá nhân và ảnh được giữ lại.' : 'Bạn có thể xóa toàn bộ thông tin chuyên môn đã khai báo.'}</Text><Pressable accessibilityRole="button" disabled={clearing} onPress={() => { if (confirmClear) void clearExpertise(); else setConfirmClear(true); }} style={shared.secondaryButton}><Text style={shared.error}>{clearing ? 'Đang xóa…' : confirmClear ? 'Xác nhận xóa dữ liệu chuyên môn' : 'Xóa dữ liệu chuyên môn'}</Text></Pressable>{confirmClear && <Pressable accessibilityRole="button" disabled={clearing} onPress={() => setConfirmClear(false)}><Text style={shared.link}>Giữ lại thông tin</Text></Pressable>}</View>}
    </ScrollView>{wide && <View testID="assessor-profile-settings-column" style={s.settingsRail}><SettingsPanel embedded /></View>}</View>
    {editing && editing.owner === account?.id && !!data && <AssessorSectionEditor key={`${editing.owner}:${editing.section}`} section={editing.section} summary={editing.summary} profile={data} onSave={(values, signal) => saveSection(editing.section, values, signal, editing.summary)} onClose={() => setEditing(null)} />}
    {editingNameOwner === account?.id && !!data && <AssessorNameEditor key={editingNameOwner} fullName={data.fullName} onSave={saveName} onClose={() => setEditingNameOwner(null)} />}
    {photo && photo.owner === account?.id && <CompanyPhotoDialog key={`${photo.owner}:${photo.target}`} initialAsset={photo.asset} target={photo.target} onSave={savePhoto} onClose={() => setPhoto(null)} />}
  </View>;
}
const s = StyleSheet.create({
  columns: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center' }, desktopColumns: { flexDirection: 'row', gap: 24, maxWidth: 1800, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }, mainColumn: { flex: 1, minWidth: 0, minHeight: 0 }, content: { paddingTop: 4, gap: 20, paddingBottom: 32 }, desktopContent: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 0 }, desktopCard: { marginHorizontal: 0 }, settingsRail: { width: 400, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  details: { marginHorizontal: 20, padding: 22 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 }, sectionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, sectionCopy: { flex: 1, gap: 3 }, bio: { gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }, fields: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 }, field: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }, wideField: { width: '46%', flexGrow: 1 }, fieldCopy: { flex: 1, gap: 5 }, fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' }, unset: { color: colors.textSecondary, fontSize: 14, lineHeight: 23 },
  mobileHeader: { flexShrink: 0, zIndex: 1, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background },
  headerSpacer: { flex: 1, minWidth: 0 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, compactHeaderActions: { gap: 4 },
  settingsButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, compactSettings: { width: 32, height: 36 }, pressed: { opacity: 0.65 }, disabled: { opacity: 0.5 },
});
