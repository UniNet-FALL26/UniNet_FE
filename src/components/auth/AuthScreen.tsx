import { useEffect, useRef, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

type AuthPath = '/(auth)/welcome' | '/(auth)/login' | '/(auth)/register' | '/(auth)/register-partner' | '/(auth)/register-partner-details' | '/(auth)/forgot-password';
export function AuthScreen({ title, subtitle, badge, children, compact = false, backTo = '/(auth)/login', onBack }: { title: string; subtitle: string; badge?: string; children: ReactNode; compact?: boolean; backTo?: AuthPath; onBack?: () => void }) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [pathname]);
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Pressable style={({ pressed }) => [styles.back, pressed && styles.backPressed]} accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => onBack ? onBack() : router.canGoBack() ? router.back() : router.replace(backTo)}>
            <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.navy} />
          </Pressable>
          <View style={[styles.brand, compact && styles.compactBrand]}>
            <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={compact ? styles.compactBrandMark : styles.brandMark} accessibilityLabel="Logo UniNet" />
            <Text style={styles.brandName}>UniNet</Text>
          </View>
          {!!badge && <Text style={styles.badge}>{badge}</Text>}
          <Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export const authStyles = StyleSheet.create({
  form: { gap: 13, marginTop: 24 }, link: { color: colors.primary, fontWeight: '700', fontSize: 14 }, center: { textAlign: 'center' }, footer: { alignItems: 'center', gap: 12, marginTop: 28 }, muted: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }, line: { height: 1, flex: 1, backgroundColor: colors.border }, dividerText: { color: colors.textMuted, fontSize: 12 }, serverError: { color: colors.error, fontSize: 14, textAlign: 'center' },
});
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.surface }, scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 }, content: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderRadius: 12 }, backPressed: { backgroundColor: colors.primaryLight },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 25 }, compactBrand: { marginBottom: 16 }, brandMark: { width: 52, height: 52 }, compactBrandMark: { width: 42, height: 42 }, brandName: { color: colors.navy, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  badge: { alignSelf: 'center', backgroundColor: colors.primaryLight, color: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, fontSize: 12, fontWeight: '700', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, letterSpacing: -0.5 }, subtitle: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 6 },
});
