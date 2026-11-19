import type { ComponentProps } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export function FullProjectImage({ source, label, onError, onLoad }: { source: NonNullable<ComponentProps<typeof Image>['source']>; label: string; onError?: () => void; onLoad?: () => void }) {
  return <View testID="project-full-image" style={styles.frame}>
    <Image source={source} contentFit="cover" blurRadius={24} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, styles.blur]} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade]} />
    <Image source={source} contentFit="contain" accessibilityLabel={label} onError={onError} onLoad={onLoad} style={StyleSheet.absoluteFill} />
  </View>;
}
const styles = StyleSheet.create({ frame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', backgroundColor: '#E8EDF5' }, blur: { transform: [{ scale: 1.12 }] }, shade: { backgroundColor: 'rgba(15,23,42,0.12)' } });
