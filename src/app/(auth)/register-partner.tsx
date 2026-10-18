import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PartnerAuthScreen } from '@/components/auth/PartnerAuthScreen';
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
  const { width, height } = useWindowDimensions();
  const narrow = width < 380;
  const dense = width >= 900 && height < 850;
  return <PartnerAuthScreen stage="selection" title="Bạn là loại đối tác nào?" subtitle="Chọn loại đối tác phù hợp để bắt đầu.">
    <View role="radiogroup" accessibilityLabel="Loại đối tác" style={[styles.grid, dense && { marginTop: 18 }]}>{types.map((type, index) => <Pressable key={type.label} accessibilityRole="radio" accessibilityLabel={type.label} aria-checked={selected === type.value} accessibilityState={{ checked: selected === type.value }} onPress={() => setSelected(type.value)} style={({ pressed }) => [styles.choice, dense && { minHeight: 124, padding: 12, gap: 5 }, (index === 4 || narrow) && styles.wide, index === 4 && dense && { minHeight: 88 }, selected === type.value && styles.active, pressed && styles.pressed]}><SymbolView name={type.icon} size={30} tintColor="#0878FF" style={styles.icon} /><Text style={styles.choiceTitle}>{type.label}</Text><Text style={styles.detail}>{type.detail}</Text>{selected === type.value && <Text style={styles.check}>✓</Text>}</Pressable>)}</View>
    <Button title="Tiếp tục →" accessibilityLabel="Tiếp tục" onPress={() => router.push({ pathname: '/(auth)/register-partner-details', params: { type: types.find(item => item.value === selected)?.label ?? '', partnerType: String(selected) } })} style={StyleSheet.flatten([styles.cta, dense && { marginTop: 18 }])} />
  </PartnerAuthScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 26 }, choice: { width: '48%', minHeight: 150, borderColor: '#DDE7F3', borderWidth: 1.5, borderRadius: 12, backgroundColor: colors.surface, padding: 16, gap: 8 }, wide: { width: '100%', minHeight: 108 }, active: { borderColor: '#0878FF', backgroundColor: '#F0F7FF' }, pressed: { backgroundColor: colors.primaryLight }, icon: { width: 32, height: 32 }, choiceTitle: { color: colors.navy, fontWeight: '700', fontSize: 13, lineHeight: 18 }, detail: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 }, check: { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: '#0878FF', color: '#FFFFFF', textAlign: 'center', lineHeight: 22, fontSize: 14, fontWeight: '800' }, cta: { marginTop: 24, backgroundColor: '#0878FF' } });
