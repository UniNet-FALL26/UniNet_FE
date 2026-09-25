import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export function TermsAgreement({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const [notice, setNotice] = useState('');
  return <View>
    <View style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="Đồng ý với điều khoản và chính sách" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.checkboxTouch}>
        <View style={[styles.checkbox, checked && styles.checked]}>{checked && <Text style={styles.check}>✓</Text>}</View>
      </Pressable>
      <View style={styles.words}>
        <Text style={styles.text}>Tôi đồng ý với </Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Điều khoản dịch vụ" hitSlop={6} onPress={() => setNotice('Điều khoản dịch vụ chưa được cung cấp.')} style={styles.linkTouch}><Text style={styles.link}>Điều khoản dịch vụ</Text></Pressable>
        <Text style={styles.text}> và </Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Chính sách quyền riêng tư" hitSlop={6} onPress={() => setNotice('Chính sách quyền riêng tư chưa được cung cấp.')} style={styles.linkTouch}><Text style={styles.link}>Chính sách quyền riêng tư</Text></Pressable>
        <Text style={styles.text}>.</Text>
      </View>
    </View>
    {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, checkboxTouch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginTop: -10 }, checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: colors.surface, fontWeight: '700' }, words: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, text: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, linkTouch: { minHeight: 24, justifyContent: 'center' }, link: { color: colors.primary, fontSize: 13, fontWeight: '700', lineHeight: 21, textDecorationLine: 'underline' }, notice: { color: colors.warning, fontSize: 12, marginTop: 6 },
});
