import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export function AssessorPageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <View style={s.heading}>
    <View style={s.headingCopy}><Text style={s.eyebrow}>KHÔNG GIAN CHUYÊN GIA</Text><Text role="heading" aria-level={1} style={s.title}>{title}</Text><Text style={s.description}>{description}</Text></View>
    {action}
  </View>;
}

export function AssessorContextRail() {
  return <View style={s.rail}>
    <View style={s.intro}>
      <View style={s.mark}><SymbolView name={{ ios: 'checkmark.seal', android: 'fact_check', web: 'fact_check' }} size={26} tintColor={colors.primary} /></View>
      <Text role="heading" aria-level={2} style={s.railTitle}>Đồng hành cùng dự án</Text>
      <Text style={s.description}>Theo dõi công việc được phân công và chuẩn bị cho buổi thẩm định tiếp theo.</Text>
      <Pressable accessibilityRole="link" onPress={() => router.navigate('/(assessor)/assessor-assessments' as Href)} style={({ hovered, pressed }) => [s.primaryLink, (hovered || pressed) && s.pressed]}><Text style={s.primaryLinkText}>Xem danh sách thẩm định</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={17} tintColor={colors.surface} /></Pressable>
    </View>
    <View style={s.links}>
      <Text role="heading" aria-level={2} style={s.linkTitle}>Truy cập nhanh</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/(assessor)/assessor-availability' as Href)} style={({ hovered, pressed }) => [s.quickLink, (hovered || pressed) && s.hovered]}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={21} tintColor={colors.primary} /><View style={s.linkCopy}><Text style={s.linkLabel}>Lịch làm việc</Text><Text style={s.small}>Khung giờ bạn đã đăng ký</Text></View><Text style={s.arrow}>›</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.navigate('/(assessor)/assessor-profile' as Href)} style={({ hovered, pressed }) => [s.quickLink, (hovered || pressed) && s.hovered]}><SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} size={21} tintColor={colors.primary} /><View style={s.linkCopy}><Text style={s.linkLabel}>Hồ sơ chuyên gia</Text><Text style={s.small}>Thông tin cá nhân của bạn</Text></View><Text style={s.arrow}>›</Text></Pressable>
    </View>
    <Text style={s.footnote}>UniNet · Kết nối tri thức, phát triển dự án.</Text>
  </View>;
}

const s = StyleSheet.create({
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, headingCopy: { flex: 1, minWidth: 200, gap: 7 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: colors.primary }, title: { fontSize: 29, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7, color: colors.navy }, description: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  rail: { width: 284, flexShrink: 0, gap: 18 }, intro: { padding: 22, gap: 14, borderRadius: 16, backgroundColor: colors.primaryLight }, mark: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, railTitle: { fontSize: 19, lineHeight: 27, fontWeight: '700', color: colors.navy },
  primaryLink: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 }, primaryLinkText: { flex: 1, color: colors.surface, fontWeight: '600', fontSize: 13, lineHeight: 20 }, pressed: { backgroundColor: colors.primaryDark },
  links: { borderRadius: 16, padding: 18, gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, linkTitle: { fontSize: 14, color: colors.navy, fontWeight: '700', marginBottom: 8 }, quickLink: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 }, linkCopy: { flex: 1, gap: 3 }, linkLabel: { fontSize: 13, color: colors.navy, fontWeight: '600' }, small: { fontSize: 12, lineHeight: 18, color: colors.textSecondary }, arrow: { color: colors.textSecondary, fontSize: 22 }, hovered: { backgroundColor: colors.background }, footnote: { fontSize: 11, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 8 },
});
