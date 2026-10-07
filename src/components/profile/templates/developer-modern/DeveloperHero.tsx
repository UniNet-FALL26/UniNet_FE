import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioResponse, ProfileTheme } from '@/types/portfolio';
import { profileMedia, profileMobileDecoration } from '@/components/profile/profile-media';
import { EditField, EditPhoto, useProfileEditing } from '@/components/profile/ProfileEditContext';

type Props = { data: PortfolioResponse; theme: ProfileTheme; compact: boolean; thumbnail?: boolean; onNavigate?: (id: string) => void };
export function DeveloperHero({ data: { profile, portfolio }, theme, compact }: Props) {
  const editing = useProfileEditing();
  const decoration = compact ? profileMobileDecoration(profile.coverUrl, theme.id) : undefined;
  return <View style={{ backgroundColor: theme.heroBackground }}>
    <View style={[s.hero, compact && s.compactHero]}>
      <Image source={profileMedia(profile.coverUrl, theme.id, compact)} contentFit={decoration ? 'fill' : 'cover'} style={StyleSheet.absoluteFill} accessibilityLabel="Ảnh bìa hồ sơ" />
      <View style={[s.intro, compact && s.compactIntro]}>
        <EditField field="fullName" label="Họ và tên" color={theme.heroText}><Text role="heading" aria-level={1} style={[s.fullName, compact && s.compactName, { color: theme.heroText }]}>{profile.fullName.split(' ').slice(0, -1).join(' ')} <Text style={{ color: theme.accent }}>{profile.fullName.split(' ').at(-1)}</Text></Text></EditField>
        {(profile.nickname || editing) && <EditField field="nickname" label="Biệt danh" color={theme.heroMuted}><Text style={[s.nickname, { color: theme.heroMuted }]}>@{profile.nickname || 'Biệt danh'}</Text></EditField>}
        <EditField field="headline" label="Chức danh" color={theme.heroText}><Text style={[s.headline, { color: theme.heroText }]}>{portfolio.headline || (editing ? 'Thêm chức danh' : '')}</Text></EditField>
        <EditField field="bio" label="Giới thiệu" color={theme.heroMuted}><Text style={[s.bio, { color: theme.heroMuted }]}>{profile.bio || portfolio.careerObjective || (editing ? 'Thêm giới thiệu về bạn' : '')}</Text></EditField>
      </View>
      <View style={[s.portraitBox, compact && s.compactPortrait]}>
        {!!decoration && <Image source={decoration} contentFit="contain" style={s.compactPortraitCover} accessible={false} />}
        <Image source={profileMedia(profile.avatarUrl)} contentFit="contain" contentPosition="bottom" style={[StyleSheet.absoluteFill, compact && s.compactAvatar]} accessibilityLabel={`Ảnh đại diện ${profile.fullName}`} />
        <EditPhoto color={theme.accentStrong} right={compact ? '25%' : 12} bottom={12} />
        {compact && <View pointerEvents="none" style={[s.handwritten, s.compactHandwritten]}><Text style={[s.handwriting, s.compactHandwriting, { color: theme.id === 'blue' ? '#A7BBFF' : theme.accentStrong }]}>Code{ '\n' }Create{ '\n' }Learn{ '\n' }Grow{ '\n' }Together.</Text></View>}
      </View>
      {!compact && <View pointerEvents="none" style={s.handwritten}><Text style={[s.handwriting, { color: theme.id === 'blue' ? '#A7BBFF' : theme.accentStrong }]}>Code{ '\n' }Create{ '\n' }Learn{ '\n' }Grow{ '\n' }Together.</Text></View>}
      <EditPhoto field="coverUrl" color={theme.accentStrong} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  hero: { minHeight: 345, paddingHorizontal: 44, paddingTop: 22, overflow: 'hidden' },
  compactHero: { paddingHorizontal: 22, paddingTop: 14 },
  intro: { width: '57%', zIndex: 2, paddingBottom: 18 }, compactIntro: { width: '100%', paddingBottom: 0, flexShrink: 0 },
  fullName: { fontSize: 36, lineHeight: 50, paddingVertical: 4, flexShrink: 0, fontWeight: '800', letterSpacing: -1.1 }, compactName: { fontSize: 29, lineHeight: 42 },
  nickname: { fontSize: 14, marginTop: 4, marginBottom: 7 }, headline: { fontSize: 20, lineHeight: 27, fontWeight: '500' }, bio: { fontSize: 14, lineHeight: 21, marginTop: 5 },
  portraitBox: { position: 'absolute', bottom: 0, left: '46%', width: '39%', height: 335, zIndex: 1 }, compactPortrait: { position: 'relative', left: 0, width: 'auto', alignSelf: 'stretch', height: 260, marginTop: 10, marginHorizontal: -22, flexShrink: 0, overflow: 'hidden' },
  compactPortraitCover: { position: 'absolute', right: -8, top: 0, width: '54%', aspectRatio: 370 / 400 },
  compactAvatar: { left: '3%', width: '72%' },
  compactHandwritten: { left: 8, top: 30 }, compactHandwriting: { fontSize: 16, lineHeight: 23 },
  handwritten: { position: 'absolute', left: '52%', top: 57, transform: [{ rotate: '-10deg' }], zIndex: 3 }, handwriting: { fontSize: 16, lineHeight: 23, fontStyle: 'italic' },
});
