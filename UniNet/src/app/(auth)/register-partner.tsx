import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

const types = [
  { label: 'Doanh nghiệp', icon: '▥', detail: 'Kết nối và tuyển dụng sinh viên.' },
  { label: 'Trường học', icon: '◆', detail: 'Kết nối cộng đồng và chương trình giáo dục.' },
  { label: 'Cửa hàng / Thương hiệu', icon: '▤', detail: 'Tiếp cận cộng đồng sinh viên.' },
  { label: 'Trung tâm đào tạo', icon: '◈', detail: 'Giới thiệu chương trình đào tạo.' },
  { label: 'Đối tác khác', icon: '•••', detail: 'Các tổ chức, cá nhân khác.' },
];
export default function RegisterPartnerScreen() {
  const [selected, setSelected] = useState(types[0].label);
  return <AuthScreen compact title="Bạn là loại đối tác nào?" subtitle="Chọn loại đối tác phù hợp để bắt đầu." badge="▣  UniNet for Partners">
    <View style={styles.grid}>{types.map((type, index) => <Pressable key={type.label} accessibilityRole="radio" accessibilityLabel={type.label} accessibilityState={{ selected: selected === type.label }} onPress={() => setSelected(type.label)} style={({ pressed }) => [styles.choice, index === 4 && styles.wide, selected === type.label && styles.active, pressed && styles.pressed]}><Text style={styles.icon}>{type.icon}</Text><Text style={styles.choiceTitle}>{type.label}</Text><Text style={styles.detail}>{type.detail}</Text>{selected === type.label && <Text style={styles.check}>✓</Text>}</Pressable>)}</View>
    <Button title="Tiếp tục" onPress={() => router.push({ pathname: '/(auth)/register-partner-details', params: { type: selected } })} style={styles.cta} />
  </AuthScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }, choice: { width: '48%', minHeight: 145, borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: colors.surface, padding: 13, gap: 8 }, wide: { width: '100%', minHeight: 90 }, active: { borderColor: colors.primary }, pressed: { backgroundColor: colors.primaryLight }, icon: { color: colors.primary, fontSize: 24, fontWeight: '800' }, choiceTitle: { color: colors.navy, fontWeight: '700', fontSize: 13 }, detail: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 }, check: { position: 'absolute', top: 8, right: 10, color: colors.primary, fontSize: 16, fontWeight: '800' }, cta: { marginTop: 38 } });
