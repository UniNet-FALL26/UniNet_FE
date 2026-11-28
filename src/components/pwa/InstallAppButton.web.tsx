import { useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { pwaInstall } from '@/store/pwa-install.web';

export function InstallAppButton({ disabled = false, variant = 'link' }: { disabled?: boolean; variant?: 'link' | 'button' }) {
  const state = useSyncExternalStore(pwaInstall.subscribe, pwaInstall.getSnapshot, pwaInstall.getServerSnapshot);
  const [instructions, setInstructions] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function install() {
    setNotice(null);
    if (!state.canPrompt) { setInstructions(true); return; }
    const result = await pwaInstall.requestInstall();
    if (result === 'unavailable') setInstructions(true);
    else if (result === 'dismissed') setNotice('Bạn có thể cài UniNet sau từ menu trình duyệt.');
  }
  if (!state.available || state.installed) return null;
  return <View style={styles.container}>
    {variant === 'button' ? <Button title="Cài UniNet" variant="outline" disabled={disabled} loading={state.busy} onPress={() => { void install(); }} leadingIcon={<SymbolView name={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }} size={18} tintColor={colors.primary} />} />
      : <Pressable accessibilityRole="button" accessibilityLabel="Cài UniNet" accessibilityState={{ disabled: disabled || state.busy, busy: state.busy }}
      disabled={disabled || state.busy} onPress={() => { void install(); }} style={({ pressed }) => [styles.action, pressed && styles.pressed, (disabled || state.busy) && styles.disabled]}>
      <SymbolView name={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }} size={18} tintColor={colors.primary} />
      <Text style={styles.label}>{state.busy ? 'Đang mở cài đặt…' : 'Cài UniNet'}</Text>
    </Pressable>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.note}>{notice}</Text>}
    <Modal visible={instructions} transparent animationType="fade" accessibilityLabel="Cài UniNet trên thiết bị" onRequestClose={() => setInstructions(false)}>
      <View style={styles.scrim}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setInstructions(false)} />
        <View style={styles.dialog}>
          <Text role="heading" aria-level={2} style={styles.title}>Cài UniNet trên thiết bị</Text>
          <Text style={styles.body}>Mở UniNet từ màn hình chính, trong cửa sổ ứng dụng riêng.</Text>
          {state.ios ? <Text style={styles.steps}>1. Mở trang UniNet bằng Safari.{ '\n\n' }2. Nhấn Chia sẻ, chọn “Thêm vào Màn hình chính”.{ '\n\n' }3. Nhấn “Thêm” để hoàn tất.</Text>
            : <Text style={styles.steps}>1. Mở menu ⋮ hoặc ⋯ của Chrome/Edge.{ '\n\n' }2. Chọn “Cài đặt ứng dụng” hoặc “Cài UniNet”.{ '\n\n' }3. Xác nhận cài đặt. Nếu chưa thấy mục này, thử tải lại trang hoặc cập nhật trình duyệt.</Text>}
          {!!state.error && <Text accessibilityRole="alert" style={styles.note}>{state.error}</Text>}
          <Text style={styles.note}>Các tính năng của UniNet vẫn cần kết nối mạng.</Text>
          <Button title="Đã hiểu" onPress={() => setInstructions(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  container: { alignItems: 'stretch' }, action: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9 },
  pressed: { backgroundColor: colors.primaryLight }, disabled: { opacity: 0.55 }, label: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  note: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 }, scrim: { flex: 1, backgroundColor: 'rgba(16,40,75,0.36)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 16 },
  title: { color: colors.navy, fontSize: 22, lineHeight: 28, fontWeight: '700' }, body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 }, steps: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
});
