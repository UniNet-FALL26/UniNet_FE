import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { TextLink } from '@/components/ui/TextLink';
import { colors } from '@/constants/colors';

export default function WelcomeScreen() {
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.top}><View style={styles.brand}><Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Logo UniNet" /><Text style={styles.brandText}>UniNet</Text></View></View>
    <View style={styles.intro}><Text style={styles.title}>Kết nối hôm nay,{`\n`}kiến tạo tương lai.</Text><Text style={styles.subtitle}>Nền tảng dành cho sinh viên IT, kết nối cộng đồng, học tập, làm dự án và mở ra cơ hội nghề nghiệp.</Text></View>
    <View style={styles.artFrame}><Image source={require('@/assets/images/onboarding-students.png')} resizeMode="cover" style={styles.art} /></View>
    <View style={styles.dots}><View style={styles.activeDot} /><View style={styles.dot} /><View style={styles.dot} /></View>
    <View style={styles.actions}><Button title="Đăng nhập" onPress={() => router.replace('/(auth)/login')} /><Button title="Tạo tài khoản" variant="outline" onPress={() => router.push('/(auth)/register')} /><Text style={styles.partner}>Bạn là doanh nghiệp hoặc tổ chức?</Text><TextLink title="Đăng ký đối tác →" onPress={() => router.push('/(auth)/register-partner')} style={styles.partnerLink} containerStyle={styles.partnerLinkTouch} /></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 22 }, top: { flexDirection: 'row', alignItems: 'center', minHeight: 56 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 5 }, logo: { width: 34, height: 34 }, brandText: { color: colors.navy, fontSize: 23, fontWeight: '800' }, intro: { alignItems: 'center', marginTop: 22 }, title: { color: colors.navy, textAlign: 'center', fontWeight: '800', fontSize: 23, lineHeight: 29 }, subtitle: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 12, maxWidth: 330 }, artFrame: { flex: 1, minHeight: 180, justifyContent: 'center', marginVertical: 24 }, art: { width: '100%', height: '100%', borderRadius: 16 }, dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginBottom: 28 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border }, activeDot: { width: 22, height: 8, borderRadius: 4, backgroundColor: colors.primary }, actions: { gap: 10, paddingBottom: 18 }, partner: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 }, partnerLink: { color: colors.primary, textAlign: 'center', fontSize: 13 }, partnerLinkTouch: { alignItems: 'center' } });
