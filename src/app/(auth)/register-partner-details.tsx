import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AuthScreen, authStyles } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { TermsAgreement } from '@/components/auth/TermsAgreement';
import { useAuth } from '@/hooks/useAuth';
import { normalizeEmail, passwordRules, validEmail } from '@/utils/validation';
import { colors } from '@/constants/colors';

export default function PartnerDetailsScreen() {
  const { type, partnerType } = useLocalSearchParams<{ type?: string; partnerType?: string }>();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<'register' | 'google'>('register');
  const { registerPartner, loading, error: serverError } = useAuth();
  async function submit() {
    setLastAction('register');
    const rules = passwordRules(password);
    const selectedType = Number(partnerType);
    if (!name.trim() || !validEmail(email) || !rules.length || !rules.letter || !rules.number || confirm !== password || !terms || !partnerType || !Number.isInteger(selectedType) || selectedType < 0 || selectedType > 4) {
      setError('Vui lòng điền đầy đủ và kiểm tra lại thông tin.'); return;
    }
    setError('');
    if (await registerPartner({ displayName: name.trim(), email: normalizeEmail(email), password, confirmPassword: confirm, partnerType: selectedType })) router.replace('/(tabs)');
  }
  return <AuthScreen compact backTo="/(auth)/register-partner" title="Tạo tài khoản đối tác" subtitle={`Bước 1/2 · ${type ?? 'Đối tác'} cùng cộng đồng UniNet.`}>
    <View style={authStyles.form}>
      <Input label="Tên đối tác *" placeholder="Công ty ABC" value={name} onChangeText={setName} leftIcon="business" />
      <Input label="Email đăng nhập *" placeholder="contact@abc.vn" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="email" />
      <Input label="Mật khẩu *" placeholder="Ít nhất 8 ký tự" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} leftIcon="password" passwordVisibility={{ visible: showPassword, onToggle: () => setShowPassword(value => !value) }} />
      <Input label="Xác nhận mật khẩu *" placeholder="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} leftIcon="password" passwordVisibility={{ visible: showConfirm, onToggle: () => setShowConfirm(value => !value) }} />
      <TermsAgreement checked={terms} onChange={setTerms} />
      {lastAction === 'register' && !!(error || serverError) && <Text accessibilityRole="alert" style={styles.error}>{error || serverError}</Text>}
      <Button title="Tạo tài khoản đối tác" onPress={() => { void submit(); }} loading={loading} />
      <Text style={authStyles.muted}>Hoặc tiếp tục với</Text><Button title="Đăng ký với Google" leadingIcon={<GoogleMark />} variant="outline" onPress={() => { setLastAction('google'); setError('Đăng ký Google chưa được cấu hình.'); }} disabled={loading} />
      {lastAction === 'google' && !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.footerRow}><Text style={authStyles.muted}>Đã có tài khoản?</Text><TextLink title="Đăng nhập" onPress={() => router.replace('/(auth)/login')} /></View>
    </View>
  </AuthScreen>;
}
const styles = StyleSheet.create({ footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, error: { color: colors.error, fontSize: 13 } });
