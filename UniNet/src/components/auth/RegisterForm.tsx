import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen, authStyles } from './AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { GoogleMark } from './GoogleMark';
import { TermsAgreement } from './TermsAgreement';
import { useAuth } from '@/hooks/useAuth';
import { normalizeEmail, passwordRules, validEmail } from '@/utils/validation';
import { colors } from '@/constants/colors';

type Field = 'fullName' | 'email' | 'password' | 'confirm' | 'terms';
export function RegisterForm() {
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false); const [showPassword, setShowPassword] = useState(false); const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lastAction, setLastAction] = useState<'register' | 'google'>('register');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const { register, google, loading, error, clearError } = useAuth();
  const rules = passwordRules(values.password); const strength = Object.values(rules).filter(Boolean).length;
  function change(field: keyof typeof values, value: string) { setValues(previous => ({ ...previous, [field]: value })); setErrors(previous => ({ ...previous, [field]: undefined })); clearError(); }
  async function submit() {
    setLastAction('register');
    const next: Partial<Record<Field, string>> = {
      fullName: !values.fullName.trim() ? 'Vui lòng nhập họ và tên.' : undefined,
      email: !values.email.trim() ? 'Vui lòng nhập email.' : !validEmail(values.email) ? 'Email không đúng định dạng.' : undefined,
      password: !rules.length || !rules.letter || !rules.number ? 'Mật khẩu cần ít nhất 8 ký tự, có chữ và số.' : undefined,
      confirm: values.confirm !== values.password ? 'Mật khẩu xác nhận không khớp.' : undefined,
      terms: !terms ? 'Vui lòng đồng ý với điều khoản.' : undefined,
    };
    setErrors(next); if (Object.values(next).some(Boolean)) return;
    if (await register({ fullName: values.fullName.trim(), email: normalizeEmail(values.email), password: values.password })) router.replace('/(auth)/complete-profile');
  }
  return <AuthScreen compact badge="🎓 Dành cho sinh viên" title="Tạo tài khoản UniNet" subtitle="Bắt đầu hành trình học tập, kết nối và phát triển sự nghiệp của bạn.">
    <View style={authStyles.form}>
      <Button title="Đăng ký với Google" leadingIcon={<GoogleMark />} variant="outline" onPress={() => { setLastAction('google'); void google(); }} disabled={loading} />
      {lastAction === 'google' && !!error && <Text accessibilityRole="alert" style={authStyles.serverError}>{error}</Text>}
      <View style={authStyles.divider}><View style={authStyles.line} /><Text style={authStyles.dividerText}>Hoặc đăng ký bằng email</Text><View style={authStyles.line} /></View>
      <Input label="Họ và tên *" placeholder="Nguyễn Văn A" value={values.fullName} onChangeText={value => change('fullName', value)} autoCapitalize="words" textContentType="name" error={errors.fullName} />
      <Input label="Email *" placeholder="example@gmail.com" value={values.email} onChangeText={value => change('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" error={errors.email} />
      <Input label="Mật khẩu *" placeholder="Ít nhất 8 ký tự" value={values.password} onChangeText={value => change('password', value)} secureTextEntry={!showPassword} textContentType="newPassword" passwordVisibility={{ visible: showPassword, onToggle: () => setShowPassword(value => !value) }} error={errors.password} />
      <View style={styles.strengthRow}>{[1, 2, 3, 4].map(index => <View key={index} style={[styles.strengthSegment, (strength === 3 ? 4 : strength) >= index && { backgroundColor: strength === 3 ? colors.success : colors.warning }]} />)}</View>
      <View style={styles.rules}><Text style={styles.hint}>{strength === 3 ? 'Mạnh' : strength === 2 ? 'Trung bình' : 'Cần cải thiện'}</Text><Text style={styles.hint}>{rules.length ? '✓' : '○'} Ít nhất 8 ký tự</Text><Text style={styles.hint}>{rules.letter ? '✓' : '○'} Có chữ cái</Text><Text style={styles.hint}>{rules.number ? '✓' : '○'} Có số</Text></View>
      <Input label="Xác nhận mật khẩu *" placeholder="Nhập lại mật khẩu" value={values.confirm} onChangeText={value => change('confirm', value)} secureTextEntry={!showConfirmPassword} textContentType="newPassword" passwordVisibility={{ visible: showConfirmPassword, onToggle: () => setShowConfirmPassword(value => !value) }} error={errors.confirm} />
      <TermsAgreement checked={terms} onChange={value => { setTerms(value); setErrors(previous => ({ ...previous, terms: undefined })); }} />
      {!!errors.terms && <Text accessibilityRole="alert" style={styles.error}>{errors.terms}</Text>}
      {lastAction === 'register' && !!error && <Text accessibilityRole="alert" style={authStyles.serverError}>{error}</Text>}
      <Button title={loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'} loading={loading} onPress={submit} />
    </View>
    <View style={authStyles.footer}>
      <View style={styles.footerRow}><Text style={authStyles.muted}>Đã có tài khoản?</Text><TextLink title="Đăng nhập" onPress={() => router.replace('/(auth)/login')} /></View>
      <Text style={authStyles.muted}>Bạn là doanh nghiệp hoặc tổ chức?</Text>
      <TextLink title="Đăng ký đối tác →" onPress={() => router.push('/(auth)/register-partner')} />
    </View>
  </AuthScreen>;
}
const styles = StyleSheet.create({
  strengthRow: { flexDirection: 'row', gap: 5, marginTop: -8 }, strengthSegment: { flex: 1, height: 4, borderRadius: 3, backgroundColor: colors.border }, rules: { gap: 4, marginTop: -6 }, hint: { fontSize: 12, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, error: { color: colors.error, fontSize: 13, marginTop: -12 },
});
