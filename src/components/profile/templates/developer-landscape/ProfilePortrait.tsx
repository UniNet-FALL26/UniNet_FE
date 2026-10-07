import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioIdentity } from '@/types/portfolio';
import { profileMedia } from '@/components/profile/profile-media';
import type { LandscapeTheme } from './DeveloperLandscapeThemes';
import { EditPhoto } from '@/components/profile/ProfileEditContext';

export type PortraitMode = 'auto' | 'cutout' | 'photo';
export function ProfilePortrait({ profile, theme, compact, mode = 'auto' }: { profile: PortfolioIdentity; theme: LandscapeTheme; compact: boolean; mode?: PortraitMode }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cutout = mode === 'cutout' || (mode === 'auto' && profile.avatarUrl === 'https://example.com/uninet-samples/developer-portrait.png');
  const source = profileMedia(profile.avatarUrl);
  const initials = profile.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase() || '?';
  return <View testID="landscape-portrait" style={[s.box, { height: compact ? 280 : 390 }]}>
    <View pointerEvents="none" style={[s.glow, { backgroundColor: theme.heroPanel, borderColor: theme.heroBorder, boxShadow: `0 0 60px ${theme.glow}` }]} />
    {source && failedUrl !== profile.avatarUrl ? <Image source={source} priority="high" loading="eager" onError={() => setFailedUrl(profile.avatarUrl)} contentFit={cutout ? 'contain' : 'cover'} contentPosition={cutout ? 'bottom' : 'top center'} accessibilityLabel={`Ảnh đại diện ${profile.fullName}`} style={[cutout ? s.cutout : s.photo, !cutout && { borderColor: theme.heroBorder }]} />
      : <View accessibilityRole="image" accessibilityLabel={`Ảnh đại diện bằng chữ viết tắt ${profile.fullName}`} style={[s.photo, s.initials, { borderColor: theme.heroBorder, backgroundColor: theme.heroPanel }]}><Text style={[s.letters, { color: theme.accent }]}>{initials}</Text></View>}
    <EditPhoto color={theme.accentStrong} right={compact ? 22 : 28} bottom={20} />
  </View>;
}
const s = StyleSheet.create({
  box: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' }, glow: { position: 'absolute', width: '82%', height: '80%', bottom: 16, borderRadius: 18, borderWidth: 1, transform: [{ rotate: '-6deg' }] },
  cutout: { width: '100%', height: '100%' }, photo: { width: '88%', height: '88%', marginBottom: 12, borderRadius: 16, borderWidth: 1 }, initials: { alignItems: 'center', justifyContent: 'center' }, letters: { fontSize: 64, fontWeight: '800' },
});
