import { Image, StyleSheet } from 'react-native';

export function GoogleMark() {
  return <Image source={require('@/assets/images/google-g.png')} style={styles.mark} resizeMode="contain" accessible={false} />;
}

const styles = StyleSheet.create({ mark: { width: 22, height: 22 } });
