import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

export function TextLink({ title, onPress, style, containerStyle }: { title: string; onPress: () => void; style?: TextStyle; containerStyle?: ViewStyle }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={title} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.touch, pressed && styles.pressed, containerStyle]}>
    <Text style={[styles.text, style]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ touch: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 }, text: { color: colors.primary, fontWeight: '700', fontSize: 14 }, pressed: { opacity: 0.65 } });
