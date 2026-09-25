import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen, authStyles } from './AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { GoogleMark } from './GoogleMark';
import { useAuth } from '@/hooks/useAuth';
import { normalizeEmail, validEmail } from '@/utils/validation';

export function LoginForm() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [lastAction, setLastAction] = useState<'login' | 'google'>('login');
  const { login, google, loading, error, clearError } = useAuth();
  async function submit() {
    setLastAction('login');
    const next = { email: !email.trim() ? 'Vui lòng nhập email.' : !validEmail(email) ? 'Email không đúng định dạng.' : undefined, password: !password ? 'Vui lòng nhập mật khẩu.' : undefined };
    setErrors(next); if (next.email || next.password) return;
    if (await login({ email: normalizeEmail(email), password })) router.replace('/(tabs)');
  }
  return <AuthScreen backTo="/(auth)/welcome" title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục với UniNet.">
    <View style={authStyles.form}>
      <Input label="Email" placeholder="example@gmail.com" value={email} onChangeText={value => { setEmail(value); setErrors(previous => ({ ...previous, email: undefined })); clearError(); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" leftIcon="email" error={errors.email} />
      <Input label="Mật khẩu" placeholder="Nhập mật khẩu" value={password} onChangeText={value => { setPassword(value); setErrors(previous => ({ ...previous, password: undefined })); clearError(); }} secureTextEntry={!showPassword} textContentType="password" leftIcon="password" passwordVisibility={{ visible: showPassword, onToggle: () => setShowPassword(value => !value) }} error={errors.password ?? (lastAction === 'login' ? error ?? undefined : undefined)} />
      <Pressable onPress={() => router.push('/(auth)/forgot-password')} accessibilityRole="link" style={styles.forgot}><Text style={authStyles.link}>Quên mật khẩu?</Text></Pressable>
      <Button title={loading ? 'Đang đăng nhập...' : 'Đăng nhập'} loading={loading} onPress={submit} />
      <View style={authStyles.divider}><View style={authStyles.line} /><Text style={authStyles.dividerText}>Hoặc tiếp tục với</Text><View style={authStyles.line} /></View>
      <Button title="Đăng nhập với Google" leadingIcon={<GoogleMark />} variant="outline" onPress={() => { setLastAction('google'); void google(); }} disabled={loading} />
      {lastAction === 'google' && !!error && <Text accessibilityRole="alert" style={authStyles.serverError}>{error}</Text>}
    </View>
    <View style={authStyles.footer}>
      <View style={styles.footerRow}><Text style={authStyles.muted}>Chưa có tài khoản?</Text><TextLink title="Đăng ký ngay" onPress={() => router.push('/(auth)/register')} /></View>
      <Text style={authStyles.muted}>Bạn là đối tác?</Text>
      <TextLink title="Đăng ký tài khoản đối tác →" onPress={() => router.push('/(auth)/register-partner')} />
    </View>
  </AuthScreen>;
}
const styles = StyleSheet.create({ forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -8 }, footerRow: { flexDirection: 'row', alignItems: 'center', gap: 2 } });
