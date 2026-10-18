import { useEffect, useRef, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useDesktopAuthPageMotion } from './DesktopAuthTransition';

type AuthPath = '/(auth)/welcome' | '/(auth)/login' | '/(auth)/register' | '/(auth)/register-partner' | '/(auth)/register-partner-details' | '/(auth)/forgot-password';
export function AuthScreen({ title, subtitle, badge, children, compact = false, centered = false, fixed = false, showBrand = true, embedded = false, backTo = '/(auth)/login', onBack }: { title: string; subtitle: string; badge?: string; children: ReactNode; compact?: boolean; centered?: boolean; fixed?: boolean; showBrand?: boolean; embedded?: boolean; backTo?: AuthPath; onBack?: () => void }) {
  const pathname = usePathname();
  const motion = useDesktopAuthPageMotion('login');
  const desktopForm = motion.enabled && (pathname === '/login' || pathname === '/register');
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [pathname]);
  const back = <Pressable style={({ pressed }) => [styles.back, pressed && styles.backPressed]} accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => onBack ? onBack() : desktopForm ? motion.navigate('/(auth)/welcome') : router.canGoBack() ? router.back() : router.replace(backTo)}>
    <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.navy} />
  </Pressable>;
  return <SafeAreaView style={[styles.safe, desktopForm && styles.transparent, embedded && styles.embedded]} edges={['top', 'bottom']}>
    {(desktopForm || fixed) && <View style={fixed ? styles.fixedBack : styles.desktopBack}>{back}</View>}
    <KeyboardAvoidingView style={[styles.flex, embedded && styles.embedded]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={embedded && styles.embedded} scrollEnabled={!fixed && !embedded} ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, desktopForm && styles.desktopScroll, fixed && styles.fixedScroll]}>
        <Animated.View testID={desktopForm ? (pathname === '/register' ? 'desktop-register-content' : 'desktop-login-content') : undefined} pointerEvents={desktopForm && motion.moving ? 'none' : 'auto'} style={[styles.content, desktopForm && styles.desktopContent, desktopForm && motion.style]}>
          {!desktopForm && !fixed && back}
          {showBrand && <View style={[styles.brand, compact && !desktopForm && styles.compactBrand, fixed && styles.fixedBrand]}>
            <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={fixed ? styles.fixedMark : compact && !desktopForm ? styles.compactBrandMark : styles.brandMark} accessibilityLabel="Logo UniNet" />
            <Text style={styles.brandName}>UniNet</Text>
          </View>}
          {!!badge && <Text style={styles.badge}>{badge}</Text>}
          <Text role="heading" aria-level={1} style={[styles.title, (desktopForm || centered) && styles.center]}>{title}</Text><Text style={[styles.subtitle, (desktopForm || centered) && styles.center]}>{subtitle}</Text>
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export const authStyles = StyleSheet.create({
  form: { gap: 13, marginTop: 24 }, link: { color: colors.primary, fontWeight: '700', fontSize: 14 }, center: { textAlign: 'center' }, footer: { alignItems: 'center', gap: 12, marginTop: 28 }, muted: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }, line: { height: 1, flex: 1, backgroundColor: colors.border }, dividerText: { color: colors.textMuted, fontSize: 12 }, serverError: { color: colors.error, fontSize: 14, textAlign: 'center' },
});
const styles = StyleSheet.create({
  embedded: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  fixedBack: { position: 'absolute', left: 24, top: 12, zIndex: 2 }, fixedScroll: { justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }, fixedBrand: { marginBottom: 8 }, fixedMark: { width: 32, height: 32 },
  transparent: { backgroundColor: 'transparent' }, center: { textAlign: 'center' }, desktopBack: { position: 'absolute', left: '64%', top: 24, zIndex: 2 }, desktopScroll: { width: '36%', alignSelf: 'flex-end', justifyContent: 'center', paddingTop: 40, paddingBottom: 32, paddingHorizontal: 36 }, desktopContent: { maxWidth: 400 },
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.surface }, scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 }, content: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderRadius: 12 }, backPressed: { backgroundColor: colors.primaryLight },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 25 }, compactBrand: { marginBottom: 16 }, brandMark: { width: 52, height: 52 }, compactBrandMark: { width: 42, height: 42 }, brandName: { color: colors.navy, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  badge: { alignSelf: 'center', backgroundColor: colors.primaryLight, color: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, fontSize: 12, fontWeight: '700', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, letterSpacing: -0.5 }, subtitle: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 6 },
});
