import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AuthScreen, authStyles } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { TermsAgreement } from '@/components/auth/TermsAgreement';
import { passwordRules, validEmail } from '@/utils/validation';
import { colors } from '@/constants/colors';

export default function PartnerDetailsScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<'register' | 'google'>('register');
  function submit() {
    setLastAction('register');
    const rules = passwordRules(password);
    if (!name.trim() || !validEmail(email) || !rules.length || !rules.letter || !rules.number || confirm !== password || !terms) { setError('Vui lòng điền đầy đủ và kiểm tra lại thông tin.'); return; }
    setError('Đăng ký đối tác sẽ sẵn sàng khi kết nối API.');
  }
  return <AuthScreen compact backTo="/(auth)/register-partner" badge="▣  Đăng ký đối tác" title="Tạo tài khoản đối tác" subtitle={`Bước 1/2 · ${type ?? 'Đối tác'} cùng cộng đồng UniNet.`}>
    <View style={authStyles.form}>
      <Input label="Tên đối tác *" placeholder="Công ty ABC" value={name} onChangeText={setName} />
      <Input label="Email đăng nhập *" placeholder="contact@abc.vn" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Mật khẩu *" placeholder="Ít nhất 8 ký tự" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} passwordVisibility={{ visible: showPassword, onToggle: () => setShowPassword(value => !value) }} />
      <Input label="Xác nhận mật khẩu *" placeholder="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} passwordVisibility={{ visible: showConfirm, onToggle: () => setShowConfirm(value => !value) }} />
      <TermsAgreement checked={terms} onChange={setTerms} />
      {lastAction === 'register' && !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title="Tạo tài khoản đối tác" onPress={submit} />
      <Text style={authStyles.muted}>Hoặc tiếp tục với</Text><Button title="Đăng ký với Google" leadingIcon={<GoogleMark />} variant="outline" onPress={() => { setLastAction('google'); setError('Đăng ký Google chưa được cấu hình.'); }} />
      {lastAction === 'google' && !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.footerRow}><Text style={authStyles.muted}>Đã có tài khoản?</Text><TextLink title="Đăng nhập" onPress={() => router.replace('/(auth)/login')} /></View>
    </View>
  </AuthScreen>;
}
const styles = StyleSheet.create({ footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, error: { color: colors.error, fontSize: 13 } });
