import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { authStore, useAuthStore } from '@/store/auth.store';
import { assessorProfileService, type AssessorProfile as ExpertProfile } from '@/services/assessor-profile.service';
import { AssessorSectionEditor } from '@/components/assessor/AssessorSectionEditor';
import { AssessorProfileCards } from '@/components/assessor/AssessorProfileCards';
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
  const { account } = useAuthStore(); const { width } = useWindowDimensions(); const wide = width >= 1200;
  const [loaded, setLoaded] = useState<{ owner: string; profile: ExpertProfile | null } | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<{ owner: string; section: AssessorProfileSection } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false), [clearing, setClearing] = useState(false);
  const [editingNameOwner, setEditingNameOwner] = useState<string | null>(null);
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
  const saveSection = async (section: AssessorProfileSection, values: AssessorProfileSectionValues, signal: AbortSignal) => {
    const owner = account?.id; if (!owner) return;
    const result = await assessorProfileService.saveSection(section, values, signal);
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
    {!wide && <View style={s.mobileHeader}><View style={s.pageHeading}><Text style={s.eyebrow}>KHÔNG GIAN CHUYÊN GIA</Text><Text style={shared.sectionTitle}>Hồ sơ của bạn</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => router.push('/settings')} style={s.settingsButton}><SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={22} tintColor={colors.navy} /></Pressable></View>}
    <View style={[s.columns, wide && s.desktopColumns]}><ScrollView testID="assessor-profile-main-column" style={s.mainColumn} showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, wide && s.desktopContent]}>
      <AssessorProfileHero fullName={name} avatarUrl={avatar} coverUrl={data?.coverUrl} isVerified={data?.isVerified ?? account?.profile?.isVerified ?? false}
        disabled={!data || choosingPhoto || !!photo} onEditCover={() => void choosePhoto('coverUrl')} onEditAvatar={() => void choosePhoto('avatarUrl')} onEditProfile={() => setEditingNameOwner(account?.id ?? null)} />
      {!!error && <AssessorState error={error} retry={() => setAttempt(v => v + 1)} />}
      {!data && !error && <AssessorState loading />}
      {data && <AssessorProfileCards profile={data} accountEmail={account?.email} onEdit={section => { if (account) setEditing({ owner: account.id, section }); }} />}
      {data?.assessorJson && <View style={[shared.card, { marginHorizontal: 20 }]}><Text style={shared.sectionTitle}>Dữ liệu chuyên môn</Text><Text style={shared.muted}>{confirmClear ? 'Xác nhận xóa toàn bộ dữ liệu chuyên môn? Thông tin cá nhân và ảnh được giữ lại.' : 'Bạn có thể xóa toàn bộ thông tin chuyên môn đã khai báo.'}</Text><Pressable accessibilityRole="button" disabled={clearing} onPress={() => { if (confirmClear) void clearExpertise(); else setConfirmClear(true); }} style={shared.secondaryButton}><Text style={shared.error}>{clearing ? 'Đang xóa…' : confirmClear ? 'Xác nhận xóa dữ liệu chuyên môn' : 'Xóa dữ liệu chuyên môn'}</Text></Pressable>{confirmClear && <Pressable accessibilityRole="button" disabled={clearing} onPress={() => setConfirmClear(false)}><Text style={shared.link}>Giữ lại thông tin</Text></Pressable>}</View>}
    </ScrollView>{wide && <View testID="assessor-profile-settings-column" style={s.settingsRail}><SettingsPanel embedded /></View>}</View>
    {editing && editing.owner === account?.id && !!data && <AssessorSectionEditor key={`${editing.owner}:${editing.section}`} section={editing.section} profile={data} onSave={(values, signal) => saveSection(editing.section, values, signal)} onClose={() => setEditing(null)} />}
    {editingNameOwner === account?.id && !!data && <AssessorNameEditor key={editingNameOwner} fullName={data.fullName} onSave={saveName} onClose={() => setEditingNameOwner(null)} />}
    {photo && photo.owner === account?.id && <CompanyPhotoDialog key={`${photo.owner}:${photo.target}`} initialAsset={photo.asset} target={photo.target} onSave={savePhoto} onClose={() => setPhoto(null)} />}
  </View>;
}
const s = StyleSheet.create({
  columns: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center' }, desktopColumns: { flexDirection: 'row', gap: 24, maxWidth: 1800, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }, mainColumn: { flex: 1, minWidth: 0, minHeight: 0 }, content: { paddingTop: 4, gap: 20, paddingBottom: 32 }, desktopContent: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 0 }, desktopCard: { marginHorizontal: 0 }, settingsRail: { width: 400, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  details: { marginHorizontal: 20, padding: 22 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 }, sectionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, sectionCopy: { flex: 1, gap: 3 }, bio: { gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }, fields: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 }, field: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border }, wideField: { width: '46%', flexGrow: 1 }, fieldCopy: { flex: 1, gap: 5 }, fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' }, unset: { color: colors.textSecondary, fontSize: 14, lineHeight: 23 },
  mobileHeader: { minHeight: 80, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background }, pageHeading: { gap: 5 }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: colors.primary }, settingsButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
