import { accountHome } from '@/utils/role-navigation';
import { Redirect, Slot, router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyTabBar } from '@/components/company/company-ui';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CompanyHeaderActions } from '@/components/company/CompanyHeaderActions';
import { colors } from '@/constants/colors';

export default function CompanyLayout() {
  const { isLoading, isAuthenticated, account } = useAuthStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (isAuthenticated && account?.role !== ACCOUNT_ROLE.PARTNER) return <Redirect href={accountHome(account?.role) as Href} />;
  return <SafeAreaView edges={['top']} style={styles.root}>
    {desktop && <View testID="company-header" style={styles.header}><View style={[styles.headerInner, width < 1200 && styles.compactHeader]}>
      <Pressable accessibilityRole="link" accessibilityLabel="UniNet - Trang chủ" onPress={() => router.navigate('/(company)')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" accessibilityLabel="Logo UniNet" style={styles.logo} />
        <Text style={styles.brandName}>UniNet</Text>
      </Pressable>
      <CompanyTabBar placement="header" />
      <CompanyHeaderActions />
    </View></View>}
    <Slot />
    {!desktop && <CompanyTabBar />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { marginHorizontal: 16, marginTop: 14, marginBottom: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E0EDFD', borderRadius: 18, zIndex: 2, boxShadow: '0 5px 22px rgba(39, 110, 190, 0.07)', experimental_backgroundImage: 'linear-gradient(115deg, #F0F7FF 0%, #FFFFFF 22%, #FFFFFF 80%, #F0F7FF 100%)' },
  headerInner: { width: '100%', maxWidth: 1600, alignSelf: 'center', minHeight: 68, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 24 },
  compactHeader: { paddingHorizontal: 16, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 0 },
  logo: { width: 30, height: 34 },
  brandName: { color: colors.navy, fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  pressed: { opacity: 0.7 },
});
