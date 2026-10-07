import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { profileMedia } from '@/components/profile/profile-media';
import type { PortfolioIdentity, ProfileTheme } from '@/types/portfolio';
import { EditPhoto } from '@/components/profile/ProfileEditContext';

export function ProfilePortrait({ profile, theme, compact }: { profile: PortfolioIdentity; theme: ProfileTheme; compact: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cutout = profile.avatarUrl === 'https://example.com/uninet-samples/developer-portrait.png';
  const source = profileMedia(profile.avatarUrl);
  const initials = profile.fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  return <View testID="showcase-portrait" style={[s.box, { height: compact ? 250 : 370 }]}>
    <View style={[s.glow, { pointerEvents: 'none', backgroundColor: theme.heroPanel, borderColor: theme.heroBorder, boxShadow: `0 0 72px 8px ${theme.accent}30` }]} />
    {source && failedUrl !== profile.avatarUrl
      ? <Image source={source} loading="eager" onError={() => setFailedUrl(profile.avatarUrl)} contentFit={cutout ? 'contain' : 'cover'} contentPosition={cutout ? 'bottom' : 'center'} accessibilityLabel={`Ảnh đại diện ${profile.fullName}`} style={[cutout ? s.cutout : s.avatar, !cutout && { borderColor: theme.heroBorder }]} />
      : <View accessibilityLabel={`Ảnh đại diện bằng chữ viết tắt ${profile.fullName}`} style={[s.avatar, s.initials, { backgroundColor: theme.heroPanel, borderColor: theme.heroBorder }]}><Text style={[s.letters, { color: theme.accent }]}>{initials || '?'}</Text></View>}
    <EditPhoto color={theme.accentStrong} right={compact ? 26 : 32} bottom={24} />
  </View>;
}
const s = StyleSheet.create({
  box: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  glow: { position: 'absolute', width: '76%', height: '76%', bottom: 16, borderWidth: 1, borderRadius: 16, transform: [{ rotate: '-7deg' }] },
  cutout: { width: '100%', height: '100%' },
  avatar: { width: '82%', height: '84%', borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  initials: { justifyContent: 'center', alignItems: 'center' }, letters: { fontSize: 64, fontWeight: '800' },
});
