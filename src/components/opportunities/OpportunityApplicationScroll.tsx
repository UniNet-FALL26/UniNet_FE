import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type ScrollViewProps } from 'react-native';

export function OpportunityApplicationScroll({ enabled, children, ...props }: ScrollViewProps & { enabled: boolean; children: ReactNode }) {
  const frame = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const originalOffset = useRef<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>();

  useEffect(() => {
    if (!enabled) return;
    const rememberOffset = () => { originalOffset.current ??= offset.current; };
    const restoreOffset = () => {
      const y = originalOffset.current;
      originalOffset.current = null;
      if (y !== null) scroll.current?.scrollTo({ y, animated: false });
    };
    if (Platform.OS === 'web') {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const fullHeight = viewport.height;
      const resize = () => {
        if (fullHeight - viewport.height > 120) {
          rememberOffset();
          frame.current?.measureInWindow((_x, y) => {
            setViewportHeight(Math.max(0, viewport.height + viewport.offsetTop - y));
          });
        } else {
          setViewportHeight(undefined);
          restoreOffset();
        }
      };
      viewport.addEventListener('resize', resize);
      return () => {
        viewport.removeEventListener('resize', resize);
        originalOffset.current = null;
      };
    }
    const willShow = Keyboard.addListener('keyboardWillShow', rememberOffset);
    const didShow = Keyboard.addListener('keyboardDidShow', () => {
      rememberOffset();
      const input = TextInput.State.currentlyFocusedInput();
      if (input) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(input, 16, true);
    });
    const didHide = Keyboard.addListener('keyboardDidHide', restoreOffset);
    return () => {
      willShow.remove();
      didShow.remove();
      didHide.remove();
      originalOffset.current = null;
    };
  }, [enabled]);

  return <View ref={frame} collapsable={false} style={{ flex: 1, minHeight: 0 }} onLayout={() => {
    if (enabled && Platform.OS !== 'web') frame.current?.measureInWindow((_x, y) => setKeyboardOffset(y));
  }}>
    <KeyboardAvoidingView enabled={enabled && Platform.OS !== 'web'} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset} style={{ flex: 1, minHeight: 0, maxHeight: enabled ? viewportHeight : undefined }}>
      <ScrollView {...props} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} scrollEventThrottle={16} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }} onLayout={event => {
        props.onLayout?.(event);
        if (enabled && Platform.OS === 'web' && viewportHeight !== undefined) scroll.current?.scrollToEnd({ animated: false });
      }}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
