import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthScreen, authStyles } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { TextLink } from '@/components/ui/TextLink';
import { colors } from '@/constants/colors';

export default function EmailSentScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <AuthScreen compact backTo="/(auth)/forgot-password" title="Kiểm tra email của bạn" subtitle="Hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn khi dịch vụ hoạt động.">
    <View style={styles.icon}><Text style={styles.iconText}>✉</Text></View>
    <Text style={styles.email}>{email ?? ''}</Text>
    <View style={styles.notice}><Text style={styles.noticeText}>Dịch vụ gửi email chưa được kết nối. Chưa có email nào được gửi.</Text></View>
    <Button title="Quay lại đăng nhập" onPress={() => router.replace('/(auth)/login')} style={styles.button} />
    <TextLink title="Thử email khác" onPress={() => router.replace('/(auth)/forgot-password')} style={authStyles.center} containerStyle={styles.back} />
  </AuthScreen>;
}
const styles = StyleSheet.create({ icon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, alignSelf: 'center', marginTop: 80 }, iconText: { color: colors.primary, fontSize: 44 }, email: { textAlign: 'center', color: colors.primaryDark, fontWeight: '700', fontSize: 16, marginTop: 18 }, notice: { backgroundColor: colors.primaryLight, padding: 16, borderRadius: 12, marginTop: 38 }, noticeText: { color: colors.textSecondary, lineHeight: 20, fontSize: 13 }, button: { marginTop: 44 }, back: { marginTop: 24 } });
