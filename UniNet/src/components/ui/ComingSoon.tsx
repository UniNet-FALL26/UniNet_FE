import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
export function ComingSoon({ title }: { title: string }) { return <SafeAreaView style={styles.safe}><View style={styles.body}><Text style={styles.title}>{title}</Text><Text style={styles.text}>Tính năng đang được chuẩn bị.</Text></View></SafeAreaView>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }, title: { color: colors.navy, fontSize: 25, fontWeight: '700' }, text: { color: colors.textSecondary, marginTop: 8 } });
