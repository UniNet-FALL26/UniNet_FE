import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

type Props = TextInputProps & { label: string; minimumHeight?: number };
export function ProfileTextInput({ label, value, multiline = true, minimumHeight = 46, style, onFocus, onBlur, onContentSizeChange, ...props }: Props) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false), [height, setHeight] = useState(minimumHeight), [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !multiline || !input.current) return;
    const node = input.current as unknown as HTMLTextAreaElement;
    node.style.height = '0px';
    const nextHeight = Math.max(minimumHeight, Math.ceil(node.scrollHeight) + 2);
    node.style.height = `${nextHeight}px`; setHeight(current => current === nextHeight ? current : nextHeight);
  }, [value, multiline, minimumHeight, width]);
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput {...props} ref={input} value={value} multiline={multiline} accessibilityLabel={label} placeholderTextColor={colors.textMuted}
      onLayout={event => { setWidth(event.nativeEvent.layout.width); props.onLayout?.(event); }}
      onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
      onContentSizeChange={event => {
        if (Platform.OS !== 'web' && multiline) setHeight(Math.max(minimumHeight, Math.ceil(event.nativeEvent.contentSize.height)));
        onContentSizeChange?.(event);
      }}
      scrollEnabled={!multiline}
      style={[s.input, Platform.OS === 'web' && s.webInput, multiline && { height, minHeight: minimumHeight, textAlignVertical: 'top' }, focused && s.focused, style]} />
  </View>;
}
const s = StyleSheet.create({
  field: { gap: 7 }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  input: { width: '100%', minHeight: 46, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  focused: { borderColor: colors.primary },
  webInput: { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', resize: 'none', overflow: 'hidden', boxSizing: 'border-box' } as TextStyle,
});
