import { useDismissDetail } from '@/components/navigation/NavigationDismissContext';
import type { ReactNode } from 'react';
import { DetailNavigationFrame } from './DetailNavigation';
import { desktopHeaderStyles } from '@/components/ui/desktop-header.styles';
import { Slot, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyTabBar } from '@/components/company/company-ui';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CompanyHeaderActions } from '@/components/company/CompanyHeaderActions';
import { colors } from '@/constants/colors';

export function CompanyShell({ children }: { children?: ReactNode } = {}) {
  const dismissDetail = useDismissDetail();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  return <SafeAreaView edges={['top']} style={styles.root}>
    {desktop && <View testID="company-header" style={styles.header}><View style={[styles.headerInner, width < 1200 && styles.compactHeader]}>
      <Pressable accessibilityRole="link" accessibilityLabel="UniNet - Trang chủ" onPress={() => { dismissDetail?.(); router.navigate('/(company)'); }} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" accessibilityLabel="Logo UniNet" style={styles.logo} />
        <Text style={styles.brandName}>UniNet</Text>
      </Pressable>
      <CompanyTabBar placement="header" />
      <CompanyHeaderActions />
    </View></View>}
    <DetailNavigationFrame>{children ?? <Slot />}</DetailNavigationFrame>
    {!desktop && <CompanyTabBar />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: desktopHeaderStyles.frame,
  headerInner: { width: '100%', maxWidth: 1600, alignSelf: 'center', minHeight: 68, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 24 },
  compactHeader: { paddingHorizontal: 16, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 0 },
  logo: { width: 30, height: 34 },
  brandName: { color: colors.navy, fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  pressed: { opacity: 0.7 },
});
