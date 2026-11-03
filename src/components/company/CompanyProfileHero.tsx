import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { CompanyIcon, companyColors as c } from './company-ui';
import { ProfileFramedImage } from '@/components/profile/ProfileFramedImage';
import type { CompanyProfile } from '@/services/company.service';
import { useState } from 'react';
import { splitProfileImageUrl } from '@/utils/profile-image-crop';

type Props = {
  profile: CompanyProfile;
  onViewCover: () => void;
  onEditCover: () => void;
  onViewAvatar: () => void;
  onEditAvatar: () => void;
  onEditProfile: () => void;
  photoBusy: boolean;
};

export function CompanyProfileHero({ profile, onViewCover, onEditCover, onViewAvatar, onEditAvatar, onEditProfile, photoBusy }: Props) {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [containerWidth, setContainerWidth] = useState(0);
  const wide = (containerWidth || width) >= 900;
  const coverSource = profile.coverUrl ? { uri: splitProfileImageUrl(profile.coverUrl).source } : require('@/assets/images/partner-default-cover.png');
  const contacts = [
    { value: profile.contactEmail, icon: { ios: 'envelope', android: 'mail', web: 'mail' } },
    { value: profile.phone, icon: { ios: 'phone', android: 'call', web: 'call' } },
    { value: profile.address, icon: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } },
  ] as const;
  const availableContacts = contacts.filter(contact => !!contact.value);
  const contactDetails = <View testID="company-profile-contacts" style={[s.contacts, !wide && s.mobileContacts]}>
    {availableContacts.map((contact, index) => <View key={contact.icon.web} style={[s.contact, wide && index > 0 && s.contactDivider]}>
      <CompanyIcon name={contact.icon} size={14} color={c.muted} />
      <Text style={s.contactText}>{contact.value}</Text>
    </View>)}
    {!availableContacts.length && <Text style={s.emptyContact}>Chưa thêm thông tin liên hệ.</Text>}
  </View>;
  const editButton = <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa thông tin tổ chức" hitSlop={mobile ? 8 : undefined} onPress={onEditProfile} style={({ pressed }) => [s.editButton, !wide && s.mobileEditButton, pressed && s.pressed]}>
    <CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={14} color={c.white} />
    <Text style={s.editLabel}>Chỉnh sửa hồ sơ</Text>
  </Pressable>;

  return <View testID="company-profile-hero" onLayout={event => setContainerWidth(event.nativeEvent.layout.width)} style={[s.hero, mobile && s.mobileHero]}>
    <View testID="company-profile-cover" style={[s.cover, !wide && s.compactCover]}>
      <Pressable accessibilityRole="button" accessibilityLabel={profile.coverUrl ? 'Xem ảnh bìa' : 'Thêm ảnh bìa'} onPress={onViewCover} style={StyleSheet.absoluteFill}>
        <Image testID="company-cover-blur" source={coverSource} contentFit="cover" blurRadius={24} accessible={false} aria-hidden style={[s.coverImage, s.coverBlur]} />
        <Image testID="company-cover-full-image" source={coverSource} contentFit="contain" accessibilityLabel={profile.coverUrl ? 'Ảnh bìa đối tác' : 'Ảnh bìa mặc định UniNet'} style={s.coverImage} />
        {!profile.coverUrl && <>
          <View pointerEvents="none" style={[s.bannerText, !wide && s.mobileBannerText]}>
            <Text numberOfLines={1} style={[s.bannerName, !wide && s.mobileBannerName]}>{profile.companyName}</Text>
            <Text numberOfLines={wide ? 2 : 1} style={s.bannerDescription}>{profile.description || profile.industry || 'Kết nối cơ hội cùng cộng đồng UniNet'}</Text>
          </View>
        </>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh bìa" hitSlop={mobile ? 8 : undefined} disabled={photoBusy} onPress={onEditCover} style={({ pressed }) => [s.coverEdit, mobile && s.mobileCoverEdit, pressed && s.pressed, photoBusy && s.disabled]}>
        <CompanyIcon name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={mobile ? 12 : 14} color={c.ink} />
        <Text style={[s.coverEditLabel, mobile && s.mobileCoverEditLabel]}>Chỉnh sửa ảnh bìa</Text>
      </Pressable>
    </View>
    <View style={[s.identityRow, !wide && s.mobileIdentityRow]}>
      <View testID="company-profile-avatar" style={[s.avatar, !wide && s.mobileAvatar, mobile && s.phoneAvatar]}>
      <Pressable accessibilityRole="button" accessibilityLabel={profile.avatarUrl ? 'Xem ảnh đại diện' : 'Thêm ảnh đại diện'} onPress={onViewAvatar} style={[s.avatarFrame, !wide && s.mobileAvatarFrame, mobile && s.phoneAvatarFrame]}>
        {profile.avatarUrl ? <ProfileFramedImage uri={profile.avatarUrl} accessibilityLabel="Ảnh đại diện đối tác" /> : <Text style={s.avatarLetter}>{profile.companyName.trim().charAt(0).toUpperCase() || 'C'}</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh đại diện" hitSlop={8} disabled={photoBusy} onPress={onEditAvatar} style={({ pressed }) => [s.avatarCamera, pressed && s.pressed, photoBusy && s.disabled]}><CompanyIcon name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={15} color={c.ink} /></Pressable>
      </View>
      <View style={s.details}>
        <View style={s.heading}>
          <View testID="company-profile-name" style={s.nameRow}>
            <Text style={[s.name, !wide && s.mobileName]}>{profile.companyName}</Text>
            {profile.isVerified && <View testID="company-verified-tick" accessible accessibilityRole="image" accessibilityLabel="Đối tác đã xác minh" style={s.verifiedTick}><CompanyIcon name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }} size={18} color={c.blue} /></View>}
          </View>
          {!profile.isVerified && <View style={[s.verification, s.unverified]}>
            <CompanyIcon name={{ ios: 'shield', android: 'shield', web: 'shield' }} size={12} color="#C27A15" />
            <Text style={[s.verificationLabel, { color: '#C27A15' }]}>Chưa xác minh</Text>
          </View>}
        </View>
        {!!profile.industry && <View style={s.industry}><Text style={s.industryLabel}>{profile.industry}</Text></View>}
        {wide && contactDetails}
      </View>
      {wide && editButton}
    </View>
    {!wide && <View style={s.mobileBottom}>{contactDetails}{!mobile && editButton}</View>}
  </View>;
}

const s = StyleSheet.create({
  hero: { borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.white, overflow: 'hidden' },
  mobileHero: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  cover: { height: 240, backgroundColor: '#1769E0', overflow: 'hidden' },
  compactCover: { height: 200 },
  coverImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  coverBlur: { transform: [{ scale: 1.12 }], opacity: 0.85 },
  bannerText: { position: 'absolute', left: 54, top: 22, width: '55%', gap: 4 },
  bannerName: { color: c.white, fontSize: 32, fontWeight: '900' },
  bannerDescription: { color: c.white, fontSize: 14, lineHeight: 20 },
  mobileBannerText: { left: 18, top: 48, width: '70%' },
  mobileBannerName: { fontSize: 23 },
  coverEdit: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.65)' },
  coverEditLabel: { color: c.ink, fontSize: 10, fontWeight: '700' },
  mobileCoverEdit: { minHeight: 28, paddingHorizontal: 8, gap: 4, borderRadius: 14 },
  mobileCoverEditLabel: { fontSize: 9, lineHeight: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  avatar: { width: 96, height: 96, marginTop: -48 },
  avatarFrame: { ...StyleSheet.absoluteFill, borderRadius: 48, backgroundColor: c.white, borderWidth: 3, borderColor: c.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(16,40,75,0.12)' },
  avatarCamera: { position: 'absolute', bottom: -6, right: -8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(170,190,220,0.45)' },
  avatarLetter: { color: c.blue, fontSize: 34, fontWeight: '900' },
  details: { flex: 1, minWidth: 0, paddingTop: 10, gap: 5 },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '100%' },
  verifiedTick: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  name: { color: c.ink, fontSize: 22, fontWeight: '900', flexShrink: 1 },
  verification: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 },
  unverified: { backgroundColor: '#FFF4DF' },
  verificationLabel: { fontSize: 10, fontWeight: '700' },
  industry: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: c.purpleSoft },
  industryLabel: { color: c.blue, fontSize: 11, fontWeight: '700' },
  contacts: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 8, marginTop: 3 },
  contact: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 12 },
  contactDivider: { borderLeftWidth: 1, borderLeftColor: c.line, paddingLeft: 12 },
  contactText: { color: c.ink, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  emptyContact: { color: c.muted, fontSize: 11 },
  editButton: { minHeight: 36, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.blue, marginLeft: 8, marginTop: 12 },
  editLabel: { color: c.white, fontSize: 11, fontWeight: '700' },
  mobileIdentityRow: { paddingHorizontal: 14, paddingBottom: 6, gap: 12 },
  mobileAvatar: { width: 76, height: 76, marginTop: -38 },
  mobileAvatarFrame: { borderRadius: 38 },
  phoneAvatar: { width: 88, height: 88, marginTop: -44 },
  phoneAvatarFrame: { borderRadius: 44, borderWidth: 4 },
  mobileName: { fontSize: 19 },
  mobileBottom: { paddingHorizontal: 16, paddingBottom: 16 },
  mobileContacts: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  mobileEditButton: { alignSelf: 'flex-end', minHeight: 34, marginLeft: 0, marginTop: 12 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
