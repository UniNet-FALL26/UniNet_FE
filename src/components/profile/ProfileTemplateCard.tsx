import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { ProfileTemplateRenderer } from './ProfileTemplateRenderer';
import { getProfileTheme, profileTemplates } from '@/data/profile-templates';
import { resolveProfilePreview } from '@/utils/profile-preview';
import { colors } from '@/constants/colors';

const sample = resolveProfilePreview().data;
export function ProfileTemplateCard({ template }: { template: typeof profileTemplates[number] }) {
  const { width } = useWindowDimensions();
  const [thumbnailWidth, setThumbnailWidth] = useState(0);
  const theme = getProfileTheme(template.id);
  const open = (themeId: string) => router.push({ pathname: '/profile/preview', params: { template: template.id, theme: themeId } });
  return <View style={[s.card, width >= 1024 && s.cardDesktop]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem trước mẫu ${template.name}, màu ${theme.name}`} onPress={() => open(theme.id)} style={({ pressed }) => [s.previewButton, pressed && s.pressed]}>
      <View style={s.paper} onLayout={event => setThumbnailWidth(event.nativeEvent.layout.width)}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[s.canvas, { transform: [{ scale: thumbnailWidth / 1000 }] }]}>
          {thumbnailWidth > 0 && <ProfileTemplateRenderer templateId={template.id} data={sample} theme={theme} width={1000} thumbnail />}
        </View>
      </View>
    </Pressable>
    <View style={s.colors}>{template.themes.map(color => <Pressable key={color.id} accessibilityRole="button" accessibilityLabel={`Xem ${template.name} màu ${color.name}`} onPress={() => open(color.id)} style={({ pressed }) => [s.colorButton, pressed && s.pressed]}><View style={[s.swatch, { backgroundColor: color.swatch }]} /></Pressable>)}</View>
    <Pressable onPress={() => open(theme.id)} accessibilityRole="button" accessibilityLabel={`Xem trước ${template.name}`} style={({ pressed }) => [s.nameButton, pressed && s.pressed]}><Text style={[s.name, width < 768 && s.nameCompact]}>{template.name}</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({
  card: { width: '48%', maxWidth: 320, marginBottom: 24 },
  cardDesktop: { width: '32%' },
  previewButton: { padding: 12, borderRadius: 14, backgroundColor: '#E9EEF4', borderWidth: 1, borderColor: '#E1E7EF' },
  paper: { width: '100%', aspectRatio: 0.72, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: 3 },
  canvas: { position: 'absolute', top: 0, left: 0, width: 1000, transformOrigin: 'top left' },
  colors: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  colorButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF', boxShadow: '0 0 0 1px #CAD3DF' },
  nameButton: { minHeight: 44, justifyContent: 'center' }, name: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.textPrimary }, pressed: { opacity: 0.65 },
  nameCompact: { fontSize: 14, lineHeight: 20 },
});
