import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { ChatAttachment as Attachment } from '@/types/messaging';
import { ChatAttachment } from './ChatAttachment';

export function ChatImageViewer({ file, onClose }: { file: Attachment; onClose: () => void }) {
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <StatusBar style="light" />
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng xem ảnh" onPress={onClose} style={s.close}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor="#FFFFFF" /></Pressable>
          <Text numberOfLines={1} style={s.name}>{file.fileName}</Text>
        </View>
        <ChatAttachment file={file} fullScreen />
      </SafeAreaView>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#080B10' },
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingRight: 16 },
});
