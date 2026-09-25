import { Image, StyleSheet, View } from 'react-native';

export function Loading() {
  return <View style={styles.container}><Image source={require('@/assets/images/splash-icon.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Logo UniNet" /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 150, height: 150 },
});
