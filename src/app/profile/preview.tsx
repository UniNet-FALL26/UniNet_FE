import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ProfileTemplateRenderer } from '@/components/profile/ProfileTemplateRenderer';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';
import { colors } from '@/constants/colors';
import { resolveProfilePreview } from '@/utils/profile-preview';

export default function ProfilePreviewScreen() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const params = useLocalSearchParams<{ template?: string; theme?: string }>();
  const template = getProfileTemplate(params.template);
  const theme = getProfileTheme(template.id, params.theme);
  const [frameWidth, setFrameWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const templateY = useRef(0);
  const preview = resolveProfilePreview();
  const width = Math.min(frameWidth || windowWidth, 1120);
  const navigate = (id: string) => {
    if (offsets.current[id] !== undefined) scroll.current?.scrollTo({ y: templateY.current + (offsets.current.hero ?? 0) + offsets.current[id], animated: false });
  };
  // Static export cannot know the query-selected template/theme. Hydrate a stable shell first.
  if (Platform.OS === 'web' && !hydrated) return <SafeAreaView style={s.safe}><View style={s.state}><ActivityIndicator accessibilityLabel="Đang tải mẫu hồ sơ" color={colors.primary} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại mẫu hồ sơ" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile/templates')} style={({ pressed }) => [s.back, pressed && s.pressed]}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.textPrimary} /></Pressable>
      <View style={s.headerContent}>
        <View style={s.titleRow}>
          <Text role="heading" aria-level={1} style={s.title}>{template.name}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/profile/editor', params: { template: template.id, theme: theme.id } })} style={({ pressed }) => [s.selectButton, pressed && s.pressed]}>
            <Text style={s.selectButtonText}>Chọn mẫu này</Text>
          </Pressable>
        </View>
        <Text style={s.subtitle}>Xem trước hồ sơ</Text>
      </View>
    </View>
    <View style={s.palette}>{template.themes.map(color => <Pressable key={color.id} accessibilityRole="button" accessibilityState={{ selected: color.id === theme.id }} aria-pressed={color.id === theme.id} accessibilityLabel={`Chọn màu ${color.name}`} onPress={() => router.setParams({ theme: color.id })} style={({ pressed }) => [s.paletteButton, { borderColor: color.id === theme.id ? color.accent : colors.border, backgroundColor: color.id === theme.id ? color.accentSoft : colors.surface }, pressed && s.pressed]}><View style={[s.swatch, { backgroundColor: color.swatch }]} /><Text style={[s.paletteLabel, { color: color.id === theme.id ? color.accentStrong : colors.textSecondary }]}>{color.name}{color.id === theme.id ? ' ✓' : ''}</Text></Pressable>)}</View>
    <ScrollView ref={scroll} contentContainerStyle={s.scroll}>
      <View style={s.notice}><Text style={s.noticeText}>Bạn đang xem hồ sơ với dữ liệu mẫu. Chọn mẫu này để xem với thông tin của bạn.</Text></View>
      <View onLayout={event => { setFrameWidth(event.nativeEvent.layout.width); templateY.current = event.nativeEvent.layout.y; }} style={s.frame}><ProfileTemplateRenderer templateId={template.id} key={template.id} data={preview.data} theme={theme} width={width} onNavigate={navigate} onSectionLayout={(id, y) => { offsets.current[id] = y; }} /></View>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerContent: { flex: 1, minWidth: 0 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectButton: { minHeight: 44, flexShrink: 0, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  selectButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  palette: { width: '100%', maxWidth: 1120, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  paletteButton: { minHeight: 36, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }, swatch: { width: 14, height: 14, borderRadius: 7 }, paletteLabel: { fontSize: 11, fontWeight: '600' },
  scroll: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 }, frame: { width: '100%', overflow: 'hidden' },
  notice: { padding: 14, marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.primaryLight, borderRadius: 10 }, noticeText: { color: colors.primaryDark, fontSize: 12, lineHeight: 19 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }, pressed: { opacity: 0.65 },
});
