import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useDesktopAuthPageMotion } from '@/components/auth/DesktopAuthTransition';

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const motion = useDesktopAuthPageMotion('welcome');
  const wide = width >= 900;
  const mobileWidth = Math.min(width, 600);
  const titleSize = wide ? Math.min(52, Math.max(34, width * 0.031)) : width < 360 ? 27 : 32;
  const pageHeight = height - insets.top - insets.bottom;
  const brand = <View style={s.brand}>
    <Image source={require('@/assets/images/uninet-mark.png')} contentFit="contain" style={[s.logo, !wide && s.mobileLogo]} accessibilityLabel="Logo UniNet" />
    <Text style={[s.brandName, !wide && s.mobileBrandName]}>UniNet</Text>
  </View>;
  const introduction = <View style={s.introduction}>
    <View style={[s.badge, !wide && s.mobileBadge]}><SymbolView name={{ ios: 'graduationcap.fill', android: 'school', web: 'school' }} size={wide ? 18 : 15} tintColor={colors.primary} /><Text style={[s.badgeText, wide ? s.wideSmallText : s.mobileBadgeText]}>Cộng đồng sinh viên hàng đầu</Text></View>
    <Text role="heading" aria-level={1} style={[s.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.18) }, wide && s.wideTitle]}>Kết nối hôm nay,{'\n'}<Text style={s.titleAccent}>kiến tạo tương lai.</Text></Text>
    <Text style={[s.subtitle, wide ? { fontSize: Math.min(20, Math.max(15, width * 0.013)), lineHeight: Math.min(30, Math.max(23, width * 0.019)) } : { fontSize: width < 360 ? 12 : 13, lineHeight: width < 360 ? 18 : 20, marginTop: 8 }]}>Nền tảng dành cho sinh viên IT, kết nối cộng đồng, học tập, làm dự án và mở ra cơ hội nghề nghiệp.</Text>
  </View>;
  const actions = <View style={[s.actions, wide && s.wideActions]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Đăng nhập" onPress={() => motion.navigate('/(auth)/login')} style={({ pressed }) => [s.button, wide && s.wideButton, s.primaryButton, pressed && s.primaryPressed]}>
      <Text style={[s.buttonText, wide && s.wideButtonText]}>Đăng nhập</Text><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={20} tintColor={colors.surface} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Tạo tài khoản" onPress={() => wide ? motion.navigate('/(auth)/register') : router.push('/(auth)/register')} style={({ pressed }) => [s.button, wide && s.wideButton, s.secondaryButton, pressed && s.secondaryPressed]}>
      <Text style={[s.buttonText, wide && s.wideButtonText, s.secondaryText]}>Tạo tài khoản</Text><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={20} tintColor={colors.navy} />
    </Pressable>
    <View style={s.partnerDivider}><View style={s.rule} /><Text style={[s.partnerQuestion, wide && s.wideSmallText]}>Bạn là doanh nghiệp hoặc tổ chức?</Text><View style={s.rule} /></View>
    <Link href="/(auth)/register-partner" accessibilityLabel="Đăng ký đối tác →" style={s.partnerLink}>Đăng ký đối tác →</Link>
  </View>;
  const trust = <View style={s.trust}><SymbolView name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={18} tintColor="#3885F4" /><Text style={[s.trustText, wide && s.wideSmallText]}>An toàn · Bảo mật · Dành riêng cho sinh viên</Text></View>;
  const artwork = <Image source={require('@/assets/images/welcome-campus-reference.png')} contentFit="cover" contentPosition="right center" style={s.artImage} accessible={false} importantForAccessibility="no-hide-descendants" transition={0} />;

  return <SafeAreaView style={[s.safe, wide && s.transparent]} edges={['top', 'bottom']}>
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View testID="welcome-page" style={[s.page, wide && s.transparent, { minHeight: wide ? Math.max(680, pageHeight) : pageHeight }]}>
        {wide ? <>
          <Animated.View pointerEvents="none" style={[s.diagonalPanel, motion.style]}><Image source={require('@/assets/images/welcome-content-panel.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" /></Animated.View>
          <Animated.View pointerEvents={motion.moving ? 'none' : 'auto'} style={[s.desktopContent, { paddingLeft: width * 0.047, paddingRight: width * 0.025 }, motion.style]}>
            {brand}
            <View style={[s.desktopBody, { paddingTop: Math.max(24, pageHeight * 0.135 - 72) }]}>{introduction}{actions}</View>
            {trust}
          </Animated.View>
        </> : <View style={s.mobileContent}>
          <View style={[s.mobileHero, { minHeight: Math.min(660, mobileWidth * 1.34) }]}>
            <View pointerEvents="none" style={[s.mobileBackdrop, { height: mobileWidth * 0.34 }]}><Image source={require('@/assets/images/welcome-campus-reference.png')} contentFit="cover" contentPosition="right top" style={[s.artImage, { height: mobileWidth * 0.94 }]} accessible={false} importantForAccessibility="no-hide-descendants" /></View>
            <View testID="welcome-artwork" pointerEvents="none" style={[s.mobileScene, { height: mobileWidth * 0.94 }]}>{artwork}</View>
            <Image source={require('@/assets/images/welcome-mobile-veil.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" />
            <View style={s.mobileHeroCopy}>{brand}{introduction}</View>
          </View>
          <View style={s.mobileBottom}>
            <Image source={require('@/assets/images/welcome-mobile-footer.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" />
            {actions}
            <View style={s.mobileTrust}>{trust}</View>
          </View>
        </View>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface }, scroll: { flex: 1 }, scrollContent: { flexGrow: 1 },
  page: { position: 'relative', overflow: 'hidden', backgroundColor: '#F7FBFF' },
  transparent: { backgroundColor: 'transparent' },
  // Keep the reference's embedded UI outside the artwork viewport; only its rightmost 60% is shown.
  artImage: { position: 'absolute', top: 0, right: 0, width: '166.667%', height: '100%' },
  diagonalPanel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '44%' },
  desktopContent: { flex: 1, width: '39%', paddingTop: 32, paddingBottom: 32, zIndex: 1 }, desktopBody: { flex: 1, paddingBottom: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, logo: { width: 36, height: 40 }, brandName: { color: colors.navy, fontSize: 25, lineHeight: 34, fontWeight: '800' },
  introduction: { alignItems: 'flex-start' }, badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#D7E7FF', paddingHorizontal: 12, paddingVertical: 7 }, badgeText: { color: colors.navy, fontSize: 12, lineHeight: 18 },
  title: { color: colors.navy, fontWeight: '800', letterSpacing: -0.6, marginTop: 20 }, wideTitle: { marginTop: 36, letterSpacing: -1 }, titleAccent: { color: '#0878FF' },
  subtitle: { color: '#61749A', fontSize: 14, lineHeight: 22, marginTop: 14 },
  wideSmallText: { fontSize: 14, lineHeight: 20 }, wideButtonText: { fontSize: 18, lineHeight: 24 },
  actions: { gap: 10 }, wideActions: { marginTop: 36 }, button: { minHeight: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 }, wideButton: { minHeight: 50, width: '100%', maxWidth: 520 }, primaryButton: { backgroundColor: '#0874F9' }, secondaryButton: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: '#287FFF' }, primaryPressed: { backgroundColor: colors.primaryDark }, secondaryPressed: { backgroundColor: colors.primaryLight }, buttonText: { color: colors.surface, fontSize: 16, lineHeight: 22, fontWeight: '700' }, secondaryText: { color: colors.navy },
  partnerDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }, rule: { flex: 1, height: 1, backgroundColor: '#D4E3F9' }, partnerQuestion: { color: '#61749A', fontSize: 12, lineHeight: 18, textAlign: 'center', flexShrink: 1 }, partnerLink: { alignSelf: 'center', color: '#0878FF', fontSize: 15, lineHeight: 22, fontWeight: '700', textAlign: 'center', textDecorationLine: 'none', paddingVertical: 11, minHeight: 44 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 7 }, trustText: { flexShrink: 1, color: '#61749A', fontSize: 12, lineHeight: 18 },
  mobileContent: { width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1, backgroundColor: colors.surface },
  mobileHero: { position: 'relative', overflow: 'hidden', backgroundColor: '#D9EFFF' }, mobileBackdrop: { position: 'absolute', top: 0, right: 0, left: 0, overflow: 'hidden' }, mobileScene: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, mobileHeroCopy: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, gap: 14, zIndex: 1 },
  mobileLogo: { width: 28, height: 30 }, mobileBrandName: { fontSize: 20, lineHeight: 28 }, mobileBadge: { paddingHorizontal: 10, paddingVertical: 5, gap: 6 }, mobileBadgeText: { fontSize: 10, lineHeight: 15 },
  mobileBottom: { position: 'relative', flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }, mobileTrust: { marginTop: 24, alignItems: 'center' },
});
