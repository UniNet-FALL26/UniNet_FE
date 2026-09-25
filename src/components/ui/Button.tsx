import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'outline'; loading?: boolean; disabled?: boolean; style?: ViewStyle; accessibilityLabel?: string; leadingIcon?: ReactNode };
export function Button({ title, onPress, variant = 'primary', loading, disabled, style, accessibilityLabel, leadingIcon }: Props) {
  const inactive = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress}
    style={({ pressed }) => [styles.base, variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.outline, pressed && (variant === 'primary' ? styles.primaryPressed : styles.outlinePressed), inactive && styles.disabled, style]}>
    {loading && <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} />}
    {!loading && leadingIcon}
    <Text style={[styles.text, variant !== 'primary' && styles.altText]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.primaryLight }, outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { color: colors.surface, fontSize: 16, fontWeight: '700' }, altText: { color: colors.textPrimary }, primaryPressed: { backgroundColor: colors.primaryDark }, outlinePressed: { backgroundColor: colors.primaryLight }, disabled: { opacity: 0.55 },
});
