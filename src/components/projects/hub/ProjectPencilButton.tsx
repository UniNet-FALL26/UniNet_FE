import { Pressable, StyleSheet, View } from 'react-native';
import { HubIcon, hubColors as c } from './ProjectHubUI';

export function ProjectPencilButton({ label, onPress, disabled = false, corner = false }: { label: string; onPress: () => void; disabled?: boolean; corner?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.button, corner && styles.corner, pressed && { backgroundColor: c.blueWash }]}><View style={{ alignItems: 'center', gap: 1 }}><HubIcon name="edit" size={16} color={c.primary} /><View style={styles.underline} /></View></Pressable>;
}
const styles = StyleSheet.create({ button: { width: 28, height: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, corner: { position: 'absolute', top: 10, right: 10, zIndex: 1 }, underline: { width: 14, height: 1.5, borderRadius: 1, backgroundColor: c.primary } });
