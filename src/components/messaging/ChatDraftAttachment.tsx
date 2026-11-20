import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ChatVideoPreview } from './ChatVideoPreview';
import { ChatDocumentIcon } from './ChatDocumentIcon';
import { documentPresentation, formatChatFileSize } from '@/utils/chat-files';
import type { ChatFileInput } from '@/types/messaging';

export function ChatDraftAttachment({ file, disabled, onRemove }: { file: ChatFileInput; disabled?: boolean; onRemove: () => void }) {
  const [failed, setFailed] = useState(false);
  const image = file.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
  const video = file.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
  const extension = documentPresentation(file.name, file.mimeType).label;
  const size = formatChatFileSize(file.size);
  const preview = (image || video) && !failed;
  return <View style={[s.frame, preview ? s.imageFrame : s.document]}>
    {preview && video ? <ChatVideoPreview uri={file.uri} label={file.name} compact onError={() => setFailed(true)} /> : preview ? <Image source={{ uri: file.uri }} accessibilityLabel={`Ảnh đính kèm: ${file.name}`} resizeMode="contain" style={s.image} onError={() => setFailed(true)} /> : <>
      <View style={s.documentIcon}>{video ? <SymbolView name={{ ios: 'video', android: 'videocam', web: 'videocam' }} size={21} tintColor="#1769E0" /> : <ChatDocumentIcon name={file.name} mimeType={file.mimeType} size={26} />}</View>
      <View style={s.copy}><Text style={s.name} numberOfLines={1}>{file.name}</Text><Text style={s.meta}>{[extension, size].filter(Boolean).join(' · ')}</Text></View>
    </>}
    <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ file ${file.name}`} disabled={disabled} onPress={onRemove} hitSlop={4} style={[s.remove, preview && s.imageRemove, disabled && s.disabled]}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={13} tintColor="#526580" /></Pressable>
  </View>;
}
const s = StyleSheet.create({
  frame: { borderWidth: 1, borderColor: '#E1E8F6', borderRadius: 10, backgroundColor: '#F8FAFD', flexShrink: 0 },
  imageFrame: { width: 72, height: 72 },
  image: { width: '100%', height: '100%', borderRadius: 9 },
  document: { width: 196, minHeight: 56, padding: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  documentIcon: { width: 30, height: 34, borderRadius: 7, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: '#263D5F', fontSize: 11, lineHeight: 16, fontWeight: '500' },
  meta: { color: '#8290A5', fontSize: 10, lineHeight: 15 },
  remove: { width: 22, height: 22, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  imageRemove: { position: 'absolute', top: 3, right: 3, borderWidth: 1, borderColor: '#E1E8F6' },
  disabled: { opacity: 0.45 },
});
