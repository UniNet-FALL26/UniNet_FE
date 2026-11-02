import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { splitProfileImageUrl } from '@/utils/profile-image-crop';

type Props = {
  fullName: string; avatarUrl?: string | null; coverUrl?: string | null; isVerified: boolean;
  disabled: boolean; onEditCover: () => void; onEditAvatar: () => void; onEditProfile: () => void;
};
export function AssessorProfileHero({ fullName, avatarUrl, coverUrl, isVerified, disabled, onEditCover, onEditAvatar, onEditProfile }: Props) {
  const { width } = useWindowDimensions(); const mobile = width < 700;
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const cover = coverUrl ? { uri: splitProfileImageUrl(coverUrl).source } : require('@/assets/images/student-starter-cover.png');
  const editButton = <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ thẩm định viên" disabled={disabled} onPress={onEditProfile} style={({ pressed }) => [s.edit, mobile && s.mobileEdit, disabled && s.disabled, pressed && s.pressed]}>
    <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={15} tintColor={colors.surface} /><Text style={s.editLabel}>Chỉnh sửa hồ sơ</Text>
  </Pressable>;
  return <View testID="assessor-profile-hero" style={[s.hero, mobile && s.mobileHero, width >= 1200 && s.desktopHero]}>
    <View testID="assessor-profile-cover" style={[s.cover, mobile && s.mobileCover]}>
      <Image source={cover} contentFit="cover" blurRadius={24} accessible={false} aria-hidden style={[StyleSheet.absoluteFill, s.blur]} />
      <Image source={cover} contentFit="contain" accessibilityLabel="Ảnh bìa hồ sơ" style={StyleSheet.absoluteFill} />
      <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh bìa" disabled={disabled} onPress={onEditCover} style={({ pressed }) => [s.coverEdit, disabled && s.disabled, pressed && s.pressed]}>
        <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={15} tintColor={colors.navy} /><Text style={s.coverEditLabel}>Chỉnh sửa ảnh bìa</Text>
      </Pressable>
    </View>
    <View style={[s.identity, mobile && s.mobileIdentity]}>
      <View testID="assessor-profile-avatar" style={[s.avatar, mobile && s.mobileAvatar]}>
        <View style={s.avatarFrame}>
          {avatarUrl && avatarUrl !== failedAvatar ? <Image source={{ uri: splitProfileImageUrl(avatarUrl).source }} onError={() => setFailedAvatar(avatarUrl)} accessibilityLabel="Ảnh đại diện của bạn" contentFit="cover" style={StyleSheet.absoluteFill} /> : <Text style={s.initial}>{fullName.trim().charAt(0).toUpperCase()}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh đại diện" hitSlop={8} disabled={disabled} onPress={onEditAvatar} style={({ pressed }) => [s.avatarEdit, disabled && s.disabled, pressed && s.pressed]}>
          <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={16} tintColor={colors.navy} />
        </Pressable>
      </View>
      <View testID="assessor-profile-name" style={s.nameRow}>
        <Text role="heading" aria-level={1} style={[s.name, mobile && s.mobileName]}>{fullName}</Text>
        {isVerified && <View testID="assessor-profile-verified" accessibilityRole="image" accessible accessibilityLabel="Thẩm định viên đã xác minh" style={s.tick}><SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }} size={20} tintColor={colors.primary} /></View>}
      </View>
      {!mobile && editButton}
    </View>
    {mobile && <View style={s.mobileActions}>{editButton}</View>}
  </View>;
}
const s = StyleSheet.create({
  hero: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden', marginHorizontal: 20 },
  mobileHero: { marginHorizontal: 0, borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  desktopHero: { marginHorizontal: 0 },
  cover: { height: 240, backgroundColor: colors.primaryLight, overflow: 'hidden' }, mobileCover: { height: 200 }, blur: { transform: [{ scale: 1.12 }], opacity: 0.85 },
  coverEdit: { position: 'absolute', right: 12, bottom: 12, minHeight: 34, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.75)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverEditLabel: { fontSize: 11, fontWeight: '700', color: colors.navy },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 20, paddingBottom: 20, minHeight: 88 },
  mobileIdentity: { paddingHorizontal: 16, gap: 12, paddingBottom: 12, minHeight: 76 },
  avatar: { width: 96, height: 96, marginTop: -48 }, mobileAvatar: { width: 88, height: 88, marginTop: -44 },
  avatarFrame: { ...StyleSheet.absoluteFill, borderRadius: 48, borderWidth: 4, borderColor: colors.surface, backgroundColor: colors.primaryLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(16,40,75,0.12)' },
  initial: { color: colors.primary, fontWeight: '800', fontSize: 34 },
  avatarEdit: { position: 'absolute', right: -8, bottom: -6, width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 14 },
  name: { color: colors.navy, fontSize: 24, lineHeight: 32, fontWeight: '800', flexShrink: 1 }, mobileName: { fontSize: 21, lineHeight: 28 }, tick: { flexShrink: 0 },
  edit: { alignSelf: 'center', marginTop: 14, minHeight: 38, borderRadius: 20, backgroundColor: colors.primary, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editLabel: { color: colors.surface, fontSize: 12, fontWeight: '700' }, mobileActions: { alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 16 },
  mobileEdit: { alignSelf: 'flex-end', marginTop: 0 },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.8 },
});
