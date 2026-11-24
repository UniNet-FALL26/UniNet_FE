import { View } from 'react-native';
import { colors } from '@/constants/colors';
import { HubIcon, type HubIconName } from './hub/ProjectHubUI';

// Draw the scheduling symbols without a font so they stay visible on web/native.
export function VerificationBookingIcon({ name, size = 18, color = colors.primary }: { name: HubIconName; size?: number; color?: string }) {
  if (!['calendar', 'clock', 'back', 'next'].includes(name)) return <HubIcon name={name} size={size} color={color} />;
  const stroke = { borderColor: color, borderWidth: 1.5 };
  return <View testID={`verification-icon-${name}`} accessible={false} pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {name === 'calendar' ? <View style={[stroke, { width: size * 0.8, height: size * 0.72, borderRadius: 2, marginTop: 2 }]}>
      <View style={{ position: 'absolute', top: -3, left: 2, width: 2, height: 4, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: -3, right: 2, width: 2, height: 4, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 3, left: 0, right: 0, borderBottomWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 2, left: 2, width: 2, height: 2, backgroundColor: color }} />
    </View> : name === 'clock' ? <View style={[stroke, { width: size * 0.85, height: size * 0.85, borderRadius: size }]}>
      <View style={{ position: 'absolute', left: '50%', top: 2, bottom: '45%', width: 1.5, marginLeft: -0.75, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: '50%', top: '50%', width: size * 0.22, height: 1.5, marginTop: -0.75, backgroundColor: color, borderRadius: 1 }} />
    </View> : <View style={{ width: size * 0.42, height: size * 0.42, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color, transform: [{ rotate: name === 'back' ? '45deg' : '225deg' }] }} />}
  </View>;
}
