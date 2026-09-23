import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
export function Loading() { return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } });
