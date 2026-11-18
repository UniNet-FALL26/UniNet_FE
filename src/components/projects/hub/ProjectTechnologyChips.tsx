import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SkillCatalogItem } from '@/services/skill.service';
import { findTechnology } from '@/utils/project-technologies';
import { HubIcon, hubColors as c } from './ProjectHubUI';

export function TechnologyLogo({ name, iconUrl, size = 18 }: { name: string; iconUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [iconUrl]);
  return iconUrl && !failed ? <Image source={{ uri: iconUrl }} contentFit="contain" accessibilityLabel={`Icon ${name}`} onError={() => setFailed(true)} style={[styles.logo, { width: size, height: size }]} /> : <View style={[styles.fallback, { width: size, height: size }]}><HubIcon name="layers" size={Math.min(14, size)} /></View>;
}
export function ProjectTechnologyChips({ values, catalog, onRemove, disabled }: { values: string[]; catalog: SkillCatalogItem[]; onRemove?: (name: string) => void; disabled?: boolean }) {
  return <View style={styles.chips}>{values.map((name, index) => <View key={`${name}-${index}`} style={styles.chip}>
    <TechnologyLogo name={name} iconUrl={findTechnology(catalog, name)?.iconUrl} /><Text numberOfLines={1} style={styles.text}>{name}</Text>
    {onRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ công nghệ ${name}`} onPress={() => onRemove(name)} disabled={disabled} hitSlop={5} style={styles.remove}><HubIcon name="close" size={13} /></Pressable>}
  </View>)}</View>;
}
const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { maxWidth: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: c.blueWash }, logo: { width: 18, height: 18, flexShrink: 0 }, fallback: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, text: { flexShrink: 1, minWidth: 0, color: c.primary, fontSize: 12, fontWeight: '500' }, remove: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' } });
