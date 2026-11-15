import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

type LeftIcon = 'email' | 'password' | 'person' | 'business';
const leftIconNames = {
  email: { ios: 'envelope', android: 'mail', web: 'mail' },
  password: { ios: 'lock', android: 'lock', web: 'lock' },
  person: { ios: 'person', android: 'person', web: 'person' },
  business: { ios: 'building.2', android: 'business', web: 'business' },
} as const;
type Props = TextInputProps & { label: string; appearance?: 'default' | 'project'; compact?: boolean; autoGrow?: boolean; error?: string; leftIcon?: LeftIcon; passwordVisibility?: { visible: boolean; onToggle: () => void } };
export function Input({ label, appearance = 'default', compact = false, autoGrow = false, error, leftIcon, passwordVisibility, editable = true, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [contentHeight, setContentHeight] = useState(80);
  const { width } = useWindowDimensions();
  useLayoutEffect(() => {
    if (!autoGrow || !props.multiline || Platform.OS !== 'web') return;
    const element = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!element) return;
    element.style.height = '0px';
    const height = Math.max(80, element.scrollHeight);
    element.style.height = `${height}px`;
    setContentHeight(height);
  }, [autoGrow, props.multiline, props.value, width]);
  return <View style={[styles.field, compact && { gap: 4 }]}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.box, appearance === 'project' && styles.projectBox, compact && { minHeight: 40 }, compact && appearance === 'project' && { backgroundColor: colors.surface }, focused && styles.focused, !!error && styles.errorBox, !editable && styles.disabled]}>
      {leftIcon && <SymbolView name={leftIconNames[leftIcon]} size={20} tintColor={colors.textSecondary} style={styles.leftIcon} />}
      <TextInput {...props} ref={inputRef} editable={editable} scrollEnabled={autoGrow ? false : props.scrollEnabled} onContentSizeChange={event => { if (autoGrow && Platform.OS !== 'web') setContentHeight(Math.max(80, Math.ceil(event.nativeEvent.contentSize.height))); props.onContentSizeChange?.(event); }} onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        placeholderTextColor={colors.textMuted} style={[styles.input, appearance === 'project' && styles.projectInput, compact && { minHeight: 38, minWidth: 0, paddingVertical: 8 }, style, autoGrow && props.multiline && { height: contentHeight, minHeight: 80 }]} accessibilityLabel={label} />
      {passwordVisibility && <Pressable onPress={passwordVisibility.onToggle} accessibilityRole="button" accessibilityLabel={passwordVisibility.visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} accessibilityHint={`Cho trường ${label}`} disabled={!editable} hitSlop={4} style={({ pressed }) => [styles.rightIcon, compact && { height: 42 }, pressed && styles.iconPressed]}>
        <SymbolView name={passwordVisibility.visible ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye', android: 'visibility', web: 'visibility' }} size={21} tintColor={colors.textSecondary} />
      </Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 7 }, label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary }, box: { minHeight: 54, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primaryLight, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  projectBox: { minHeight: 52, borderRadius: 12, borderColor: colors.border, backgroundColor: colors.primaryLight }, projectInput: { minHeight: 50, fontSize: 14, paddingVertical: 12 },
  focused: { borderColor: colors.primary }, errorBox: { borderColor: colors.error }, disabled: { opacity: 0.5 }, input: { flex: 1, minHeight: 52, fontSize: 15, color: colors.textPrimary, paddingVertical: 0 }, leftIcon: { width: 22, height: 22, marginRight: 10 }, rightIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginRight: -10 }, iconPressed: { backgroundColor: colors.border }, error: { fontSize: 13, color: colors.error },
});
