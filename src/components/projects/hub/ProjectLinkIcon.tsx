import { Image } from 'expo-image';
import { View } from 'react-native';
import { getProjectLinkType } from '@/utils/project-links';
import { HubIcon } from './ProjectHubUI';

const logos = {
  github: require('@/assets/images/brands/github.svg'),
  figma: require('@/assets/images/skill-logos/figma.svg'),
  'google-play': require('@/assets/images/brands/google-play.svg'),
  'app-store': require('@/assets/images/brands/app-store.svg'),
};

export function ProjectLinkIcon({ label, size = 20 }: { label: string; size?: number }) {
  const type = getProjectLinkType(label);
  return <View accessibilityRole="image" accessibilityLabel={`Icon ${type.label}`} style={{ width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
    {type.id in logos ? <Image source={logos[type.id as keyof typeof logos]} contentFit="contain" accessible={false} style={{ width: size, height: size }} />
      : <HubIcon name={type.id === 'website' ? 'globe' : type.id === 'api' ? 'code' : 'link'} color={type.id === 'website' ? '#1687FF' : type.id === 'api' ? '#9D4DFF' : '#617292'} size={size} />}
  </View>;
}
