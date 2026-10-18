import { useCallback, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { AccessibilityInfo, Animated, Easing, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from './AuthScreen';
import { colors } from '@/constants/colors';

type Props = Omit<ComponentProps<typeof AuthScreen>, 'children'> & { children: ReactNode; stage: 'selection' | 'account' };
const selectionBenefits = [
  { title: 'Tiếp cận sinh viên tiềm năng', description: 'Kết nối với cộng đồng sinh viên trên toàn quốc.', icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' }, color: '#0878FF', background: '#DEEEFF' },
  { title: 'Quảng bá thương hiệu', description: 'Gia tăng nhận diện trong môi trường đại học.', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }, color: '#0878FF', background: '#EAF6FF' },
  { title: 'Phát triển bền vững', description: 'Cùng tạo ra những giá trị cho cộng đồng.', icon: { ios: 'hands.clap.fill', android: 'handshake', web: 'handshake' }, color: '#F5A000', background: '#FFF4DE' },
] as const;
const accountBenefits = [
  { title: 'Mở rộng cơ hội hợp tác', description: 'Tiếp cận nguồn nhân lực trẻ, năng động.', icon: { ios: 'paperplane.fill', android: 'rocket_launch', web: 'rocket_launch' }, color: '#0878FF', background: '#DEEEFF' },
  { title: 'Tăng độ nhận diện thương hiệu', description: 'Quảng bá sản phẩm, dịch vụ đến cộng đồng sinh viên.', icon: { ios: 'star.fill', android: 'star', web: 'star' }, color: '#F5A000', background: '#FFF4DE' },
  { title: 'Hỗ trợ tận tâm', description: 'Đội ngũ UniNet luôn đồng hành cùng đối tác.', icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }, color: '#0878FF', background: '#DEEEFF' },
] as const;

export function PartnerAuthScreen({ stage, children, ...props }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const spacious = width >= 1300;
  const fixed = wide && Platform.OS === 'web' && height >= 740;
  const introduction = useRef(new Animated.Value(0)).current;
  const form = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const reveal = (reduced: boolean) => {
      if (!active) return;
      if (reduced) { introduction.setValue(1); form.setValue(1); return; }
      introduction.setValue(0); form.setValue(0);
      const options = { duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' };
      animation = Animated.stagger(100, [
        Animated.timing(introduction, { ...options, toValue: 1 }),
        Animated.timing(form, { ...options, toValue: 1 }),
      ]);
      animation.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal).catch(() => reveal(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) { animation?.stop(); introduction.setValue(1); form.setValue(1); }
    });
    return () => { active = false; animation?.stop(); subscription.remove(); };
  }, [introduction, form]));
  const benefits = stage === 'selection' ? selectionBenefits : accountBenefits;
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <ScrollView scrollEnabled={!fixed} contentContainerStyle={[s.page, !wide && s.mobilePage, wide && s.desktopPage]} keyboardShouldPersistTaps="handled">
      <View testID="partner-registration-card" style={[s.card, wide ? [s.desktopCard, { height: Math.max(740, height) }] : s.mobileCard]}>
        <Animated.View testID="partner-registration-introduction" style={[s.sidebar, !wide && [s.mobileSidebar, { minHeight: Math.max(500, Math.min(850, width * 1.42)) }], { opacity: introduction }]}>
          <Image source={require('@/assets/images/partner-campus.png')} contentFit="cover" contentPosition={{ left: '50%', top: wide && spacious ? '82%' : '100%' }} style={s.artwork} accessible={false} importantForAccessibility="no-hide-descendants" />
          <Image source={wide ? require('@/assets/images/partner-sidebar-veil.svg') : require('@/assets/images/partner-mobile-veil.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" />
          <Animated.View style={[{ transform: [{ translateY: introduction.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, s.sideCopy, wide && spacious && s.spaciousCopy, !wide && s.mobileSideCopy]}>
            <View style={s.brand}><Image source={require('@/assets/images/uninet-mark.png')} contentFit="contain" style={s.mark} accessibilityLabel="Logo UniNet đối tác" /><Text style={s.brandName}>UniNet</Text></View>
            <View style={s.badge}><SymbolView name={{ ios: 'hands.clap.fill', android: 'handshake', web: 'handshake' }} size={14} tintColor="#E8A300" /><Text style={s.badgeText}>Đồng hành cùng thế hệ tương lai</Text></View>
            <Text style={[s.heading, wide && spacious && s.spaciousHeading, !wide && s.mobileHeading]}>{stage === 'selection' ? <>Trở thành đối tác UniNet{'\n'}<Text style={s.accent}>Cùng kiến tạo{'\n'}giá trị bền vững</Text></> : <>Bắt đầu hành trình{'\n'}hợp tác <Text style={s.accent}>cùng UniNet</Text></>}</Text>
            <Text style={[s.description, !wide && s.mobileDescription]}>{stage === 'selection' ? 'Hợp tác với UniNet để kết nối, phát triển và tạo ra những cơ hội giá trị cho cộng đồng sinh viên.' : 'Chỉ vài bước đơn giản để trở thành đối tác và kết nối với cộng đồng sinh viên trên toàn quốc.'}</Text>
            {wide && <View style={[s.benefits, spacious && s.benefitsRow]}>{benefits.map(item => <View key={item.title} style={[s.benefit, spacious && s.benefitColumn]}>
              <View style={[s.benefitIcon, { backgroundColor: item.background }]}><SymbolView name={item.icon} size={23} tintColor={item.color} /></View>
              <View style={s.benefitCopy}><Text style={s.benefitTitle}>{item.title}</Text><Text style={s.benefitDescription}>{item.description}</Text></View>
            </View>)}</View>}
          </Animated.View>

        </Animated.View>
        <Animated.View testID="partner-registration-form" style={[s.formSide, !wide && s.mobileFormSide, { opacity: form, transform: [wide ? { translateX: form.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) } : { translateY: form.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <AuthScreen {...props} compact centered fixed={fixed} showBrand={false} embedded={!wide}>
            {children}
          </AuthScreen>
        </Animated.View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EDF7FF' }, page: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }, mobilePage: { padding: 0, justifyContent: 'flex-start' },
  desktopPage: { padding: 0 }, desktopCard: { maxWidth: '100%', borderRadius: 0, borderWidth: 0, boxShadow: 'none' },
  card: { width: '100%', maxWidth: 1240, flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#D7E9FF', overflow: 'hidden', boxShadow: '0 8px 30px rgba(45, 113, 174, 0.08)' }, mobileCard: { flexDirection: 'column', borderWidth: 0, borderRadius: 0, boxShadow: 'none' },
  sidebar: { width: '45%', position: 'relative', overflow: 'hidden', backgroundColor: '#D9EFFF' }, mobileSidebar: { width: '100%' },
  artwork: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
  sideCopy: { padding: 28 }, spaciousCopy: { paddingHorizontal: 40, paddingTop: 32 }, mobileSideCopy: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 7 }, mark: { width: 30, height: 34 }, brandName: { color: colors.navy, fontSize: 23, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F6FBFF', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginTop: 14 }, badgeText: { color: colors.navy, fontSize: 10, lineHeight: 15, flexShrink: 1 },
  heading: { marginTop: 18, color: colors.navy, fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.7 }, spaciousHeading: { fontSize: 30, lineHeight: 35 }, accent: { color: '#0878FF' }, mobileHeading: { fontSize: 23, lineHeight: 29, marginTop: 18, letterSpacing: -0.5 }, description: { color: '#516C96', fontSize: 13, lineHeight: 19, marginTop: 12, maxWidth: 390 }, mobileDescription: { fontSize: 13, lineHeight: 20, maxWidth: 400 },
  benefitsRow: { flexDirection: 'row', gap: 18, maxWidth: 680, marginTop: 22 }, benefitColumn: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }, benefits: { gap: 9, marginTop: 18 }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 }, benefitIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, benefitCopy: { flex: 1, maxWidth: 280, gap: 3 }, benefitTitle: { color: colors.navy, fontSize: 12, lineHeight: 17, fontWeight: '700' }, benefitDescription: { color: '#516C96', fontSize: 12, lineHeight: 17 },
  formSide: { flex: 1, minWidth: 0 }, mobileFormSide: { flex: 0, paddingTop: 8, paddingBottom: 16 },

});
