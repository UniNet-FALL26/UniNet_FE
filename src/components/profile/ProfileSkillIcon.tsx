import { useState } from 'react';
import { View, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { profileMedia } from './profile-media';
import { skillLogo } from './skill-logo';

export function ProfileSkillIcon({ name, iconUrl, demo = false, style, thumbnail }: { name: string; iconUrl?: string | null; demo?: boolean; style: StyleProp<ImageStyle>; thumbnail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = failed ? undefined : demo ? skillLogo(name, iconUrl) : profileMedia(iconUrl?.trim());
  return source ? <Image source={source} contentFit="contain" loading={thumbnail ? 'eager' : 'lazy'} accessibilityLabel={'Icon ' + name} onError={() => setFailed(true)} style={style} />
    : <View accessibilityLabel={'Icon mặc định ' + name} style={[style, { alignItems: 'center', justifyContent: 'center' }]}><SymbolView name={{ ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' }} size={28} tintColor={colors.primary} /></View>;
}
