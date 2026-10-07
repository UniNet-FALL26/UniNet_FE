import { ModulePage } from '@/components/ui/ModulePage';
import { colors } from '@/constants/colors';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return <ModulePage title="Cá nhân" description="Thông tin và hoạt động của bạn trên UniNet." sections={['Hồ sơ của tôi', 'Bài viết đã lưu', 'Cài đặt']} header={
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mẫu hồ sơ" onPress={() => router.push('/profile/templates')} style={({ pressed }) => [styles.templates, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'rectangle.grid.2x2', android: 'dashboard', web: 'dashboard' }} size={20} tintColor={colors.primary} />
        <Text style={styles.label}>Mẫu hồ sơ</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={24} tintColor={colors.textPrimary} />
      </Pressable>
    </View>
  } />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 8 },
  templates: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primaryLight },
  label: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  pressed: { opacity: 0.65 },
});
