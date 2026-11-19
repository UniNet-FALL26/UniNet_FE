import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toastStore, type ToastMessage } from '@/store/toast.store';
import { colors } from '@/constants/colors';

export function ToastHost({ modal = false }: { modal?: boolean }) {
  const id = useId();
  const snapshot = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
  const [visible, setVisible] = useState<ToastMessage | null>(null);
  const motion = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const activeHost = snapshot.modalHosts.at(-1);
  const active = modal ? activeHost === id : !activeHost;
  const current = active ? snapshot.toast : null;
  useEffect(() => modal ? toastStore.registerModal(id) : undefined, [id, modal]);
  useEffect(() => {
    motion.stopAnimation();
    if (current) {
      setVisible(current); motion.setValue(0);
      Animated.timing(motion, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(motion, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => { if (finished) setVisible(null); });
    }
    return () => motion.stopAnimation();
  }, [current, motion]);
  if (!visible || !active) return null;
  const success = visible.type === 'success';
  const tint = success ? colors.success : colors.error;
  return <View pointerEvents="box-none" style={[s.host, { top: insets.top + 12 }]}>
    <Animated.View testID="action-toast" accessibilityRole="alert" accessibilityLiveRegion={success ? 'polite' : 'assertive'} style={[s.card, { borderColor: success ? '#BCE4CD' : '#F1C1C6', opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] }]}>
      <SymbolView name={success ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } : { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }} size={24} tintColor={tint} />
      <Text style={s.message}>{visible.message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => toastStore.dismiss(visible.id)} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={17} tintColor={colors.textSecondary} /></Pressable>
    </Animated.View>
  </View>;
}
const s = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 2147483647, elevation: 100 },
  card: { width: '100%', maxWidth: 560, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, paddingVertical: 10, borderWidth: 1, borderRadius: 14, backgroundColor: colors.primaryLight, boxShadow: '0 8px 28px rgba(16,40,75,0.16)' },
  message: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
