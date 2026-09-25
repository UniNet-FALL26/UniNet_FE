import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen, authStyles } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { colors } from '@/constants/colors';

export default function CompleteProfileScreen() {
  const [step, setStep] = useState(1); const [name, setName] = useState(''); const [bio, setBio] = useState('');
  const [university, setUniversity] = useState(''); const [major, setMajor] = useState(''); const [studentCode, setStudentCode] = useState(''); const [year, setYear] = useState('');
  const [error, setError] = useState('');
  function next() { if (!name.trim() || !bio.trim()) { setError('Vui lòng nhập họ tên và giới thiệu ngắn.'); return; } setError(''); setStep(2); }
  return <AuthScreen compact onBack={() => { if (step === 2) { setError(''); setStep(1); } else router.replace('/(tabs)'); }} title={step === 1 ? 'Hoàn thiện hồ sơ' : 'Thông tin học tập'} subtitle={step === 1 ? 'Giúp cộng đồng hiểu thêm một chút về bạn.' : 'Cập nhật thông tin học tập để hoàn thiện hồ sơ.'}>
    <View style={styles.progress}><View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} /></View><Text style={styles.step}>Bước {step}/2</Text>
    {step === 1 ? <View style={authStyles.form}>
      <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh đại diện" style={styles.avatar} onPress={() => setError('Tải ảnh đại diện sẽ sẵn sàng sau khi kết nối dịch vụ hồ sơ.')}><Text style={styles.avatarText}>◎</Text></Pressable><Text style={styles.avatarLabel}>Thêm ảnh đại diện</Text>
      <Input label="Họ và tên *" placeholder="Nguyễn Văn A" value={name} onChangeText={setName} />
      <Input label="Giới thiệu ngắn *" placeholder="Chia sẻ một chút về bản thân..." value={bio} onChangeText={setBio} multiline numberOfLines={3} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title="Tiếp tục" onPress={next} style={styles.cta} />
    </View> : <View style={authStyles.form}>
      <Input label="Trường Đại học" placeholder="Đại học Công nghệ Thông tin" value={university} onChangeText={setUniversity} />
      <Input label="Ngành / Chuyên ngành" placeholder="Kỹ thuật Phần mềm" value={major} onChangeText={setMajor} />
      <Input label="Mã số sinh viên" placeholder="21521234" value={studentCode} onChangeText={setStudentCode} />
      <Input label="Khóa học" placeholder="2022 – 2026" value={year} onChangeText={setYear} />
      <Button title="Hoàn tất hồ sơ" onPress={() => setError('Lưu hồ sơ sẽ sẵn sàng sau khi kết nối API.')} style={styles.cta} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>}
    <TextLink title="Bỏ qua lúc này" onPress={() => router.replace('/(tabs)')} style={authStyles.center} containerStyle={styles.skip} />
  </AuthScreen>;
}
const styles = StyleSheet.create({ progress: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 14 }, progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary }, step: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 }, avatar: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 26 }, avatarText: { fontSize: 38, color: colors.primaryDark }, avatarLabel: { color: colors.primary, fontSize: 13, fontWeight: '700', textAlign: 'center' }, cta: { marginTop: 26 }, skip: { marginTop: 24 }, error: { color: colors.error, fontSize: 13 } });
