import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

export function AutoGrowingTextInput({ minHeight = 96, ...props }: TextInputProps & { minHeight?: number }) {
  const input = useRef<TextInput>(null);
  const [height, setHeight] = useState(minHeight), [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = input.current as unknown as HTMLTextAreaElement | null;
    if (!element) return;
    const minimum = element.style.minHeight;
    element.style.minHeight = '0px'; element.style.height = '0px';
    const computed = getComputedStyle(element);
    const border = (parseFloat(computed.borderTopWidth) || 0) + (parseFloat(computed.borderBottomWidth) || 0);
    const next = Math.max(minHeight, Math.ceil(element.scrollHeight + border));
    element.style.minHeight = minimum; element.style.height = `${next}px`;
    setHeight(previous => previous === next ? previous : next);
  }, [props.value, width, minHeight]);
  return <TextInput {...props} ref={input} scrollEnabled={false} onLayout={event => { setWidth(event.nativeEvent.layout.width); props.onLayout?.(event); }} onContentSizeChange={event => { if (Platform.OS !== 'web') setHeight(Math.max(minHeight, Math.ceil(event.nativeEvent.contentSize.height + 2))); props.onContentSizeChange?.(event); }} style={[props.style, { minHeight, height, overflow: 'hidden' }]} />;
}
