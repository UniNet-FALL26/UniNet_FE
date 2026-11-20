import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

// Native SafeAreaView reads native window insets even when a parent shell has
// consumed them in JS context. Turn off the top edge once that space is handled.
export function useScreenSafeAreaEdges(): Edge[] {
  const { top } = useSafeAreaInsets();
  return top > 0 ? ['top'] : [];
}
