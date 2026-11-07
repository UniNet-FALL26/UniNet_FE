import { SymbolView } from 'expo-symbols';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = { urls: readonly string[]; index: number | null; onIndexChange: (index: number) => void; onClose: () => void };

export function CommunityMediaLightbox({ urls, index, onIndexChange, onClose }: Props) {
  if (index === null || !urls[index]) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View testID="community-media-lightbox" style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng xem ảnh bài viết" onPress={onClose} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={28} tintColor="#FFF" /></Pressable>
      <View style={s.content}>
        <Image source={{ uri: urls[index] }} resizeMode="cover" blurRadius={24} accessible={false} style={s.backdrop} />
        <Image accessibilityLabel={`Ảnh bài viết ${index + 1}`} source={{ uri: urls[index] }} resizeMode="contain" style={StyleSheet.absoluteFill} />
        {urls.length > 1 && <>
          <Pressable accessibilityRole="button" accessibilityLabel="Ảnh trước" onPress={() => onIndexChange((index + urls.length - 1) % urls.length)} style={[s.arrow, { left: 16 }]}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={30} tintColor="#FFF" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ảnh tiếp theo" onPress={() => onIndexChange((index + 1) % urls.length)} style={[s.arrow, { right: 16 }]}><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={30} tintColor="#FFF" /></Pressable>
        </>}
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  close: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)' },
  content: { width: '100%', height: '80%', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, transform: [{ scale: 1.15 }], pointerEvents: 'none' },
  arrow: { position: 'absolute', top: '50%', transform: [{ translateY: -24 }], width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
});
