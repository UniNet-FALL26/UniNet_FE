import { colors } from '@/constants/colors';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileTemplateCard } from '@/components/profile/ProfileTemplateCard';
import { profileTemplates } from '@/data/profile-templates';

export default function ProfileTemplatesScreen() {
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại trang cá nhân" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={colors.textPrimary} />
      </Pressable>
      <Text role="heading" aria-level={1} style={styles.title}>Mẫu hồ sơ</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.description}>Một hồ sơ mang dấu ấn của bạn. Chọn mẫu hoặc màu sắc để xem trước.</Text>
      <View style={styles.grid}>{profileTemplates.map(template => <ProfileTemplateCard key={template.id} template={template} />)}</View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '2%', marginTop: 24 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  pressed: { opacity: 0.65 },
});
