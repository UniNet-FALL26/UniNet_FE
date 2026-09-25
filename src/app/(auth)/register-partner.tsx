import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

const types = [
  { label: 'Doanh nghiệp', value: 0, icon: { ios: 'building.2', android: 'business', web: 'business' }, detail: 'Kết nối và tuyển dụng sinh viên.' },
  { label: 'Trường học', value: 1, icon: { ios: 'graduationcap', android: 'school', web: 'school' }, detail: 'Kết nối cộng đồng và chương trình giáo dục.' },
  { label: 'Cửa hàng / Thương hiệu', value: 2, icon: { ios: 'bag', android: 'storefront', web: 'storefront' }, detail: 'Tiếp cận cộng đồng sinh viên.' },
  { label: 'Trung tâm đào tạo', value: 3, icon: { ios: 'book', android: 'menu_book', web: 'menu_book' }, detail: 'Giới thiệu chương trình đào tạo.' },
  { label: 'Đối tác khác', value: 4, icon: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }, detail: 'Các tổ chức, cá nhân khác.' },
] as const;
export default function RegisterPartnerScreen() {
  const [selected, setSelected] = useState<number>(types[0].value);
  return <AuthScreen compact title="Bạn là loại đối tác nào?" subtitle="Chọn loại đối tác phù hợp để bắt đầu.">
    <View style={styles.grid}>{types.map((type, index) => <Pressable key={type.label} accessibilityRole="radio" accessibilityLabel={type.label} accessibilityState={{ selected: selected === type.value }} onPress={() => setSelected(type.value)} style={({ pressed }) => [styles.choice, index === 4 && styles.wide, selected === type.value && styles.active, pressed && styles.pressed]}><SymbolView name={type.icon} size={24} tintColor={colors.primary} style={styles.icon} /><Text style={styles.choiceTitle}>{type.label}</Text><Text style={styles.detail}>{type.detail}</Text>{selected === type.value && <Text style={styles.check}>✓</Text>}</Pressable>)}</View>
    <Button title="Tiếp tục" onPress={() => router.push({ pathname: '/(auth)/register-partner-details', params: { type: types.find(item => item.value === selected)?.label ?? '', partnerType: String(selected) } })} style={styles.cta} />
  </AuthScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }, choice: { width: '48%', minHeight: 145, borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: colors.surface, padding: 13, gap: 8 }, wide: { width: '100%', minHeight: 90 }, active: { borderColor: colors.primary }, pressed: { backgroundColor: colors.primaryLight }, icon: { width: 26, height: 26 }, choiceTitle: { color: colors.navy, fontWeight: '700', fontSize: 13 }, detail: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 }, check: { position: 'absolute', top: 8, right: 10, color: colors.primary, fontSize: 16, fontWeight: '800' }, cta: { marginTop: 38 } });
