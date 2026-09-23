import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen, authStyles } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { validEmail, normalizeEmail } from '@/utils/validation';
import { colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState(''); const [error, setError] = useState('');
  return <AuthScreen compact title="Quên mật khẩu?" subtitle="Nhập email đã đăng ký. UniNet sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.">
    <View style={styles.icon}><Text style={styles.iconText}>✉</Text></View>
    <View style={authStyles.form}><Input label="Email" placeholder="example@gmail.com" value={email} onChangeText={value => { setEmail(value); setError(''); }} keyboardType="email-address" autoCapitalize="none" error={error} />
      <Button title="Gửi hướng dẫn" onPress={() => validEmail(email) ? router.push({ pathname: '/(auth)/email-sent', params: { email: normalizeEmail(email) } }) : setError('Email không đúng định dạng.')} />
    </View>
    <TextLink title="← Quay lại đăng nhập" onPress={() => router.replace('/(auth)/login')} style={authStyles.center} containerStyle={styles.back} />
  </AuthScreen>;
}
const styles = StyleSheet.create({ icon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, alignSelf: 'center', marginTop: 80 }, iconText: { color: colors.primary, fontSize: 44 }, back: { marginTop: 90 } });
