import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ChatVideoPreview } from './ChatVideoPreview';
import { SymbolView } from 'expo-symbols';
import type { ChatAttachment as Attachment } from '@/types/messaging';
import { loadChatAttachment, type ChatAttachmentResource } from '@/utils/load-chat-attachment';
import { downloadChatAttachment } from '@/utils/download-chat-attachment';
import { documentPresentation, formatChatFileSize } from '@/utils/chat-files';
import { ChatDocumentIcon } from './ChatDocumentIcon';

export function ChatAttachment({ file, fullScreen = false }: { file: Attachment; fullScreen?: boolean }) {
  const { id, fileType, fileUrl, fileName, fileSize, mimeType } = file;
  const [uri, setUri] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const { width, height } = useWindowDimensions();
  const photoWidth = Math.min(280, width * 0.68, Math.min(300, height * 0.4) * aspectRatio);
  useEffect(() => {
    if (fileType === 2) return;
    let disposed = false;
    let resource: ChatAttachmentResource | undefined;
    const controller = new AbortController();
    loadChatAttachment({ id, fileType, fileUrl, fileName, fileSize, mimeType }, controller.signal).then(loaded => {
      if (disposed) loaded.dispose();
      else { resource = loaded; setUri(loaded.uri); setError(''); }
    }).catch(cause => { if (!disposed) setError(cause instanceof Error ? cause.message : 'Không tải được file trò chuyện.'); });
    return () => { disposed = true; controller.abort(); resource?.dispose(); };
  }, [id, fileType, fileUrl, fileName, fileSize, mimeType, attempt]);
  async function download() {
    if (busy) return; setBusy(true); setError('');
    try { await downloadChatAttachment(file);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file.'); } finally { setBusy(false); }
  }
  return <View style={[s.frame, file.fileType !== 2 && s.imageFrame, file.fileType === 0 && { width: photoWidth }, fullScreen && s.fullScreenFrame]}>
    {file.fileType !== 2 && !uri && !error && <View style={s.loading}><ActivityIndicator size="small" color="#1769E0" /></View>}
    {!!uri && file.fileType === 0 && <Image key={`${file.id}:${attempt}`} source={{ uri }} accessibilityLabel={file.fileName} resizeMode="contain" style={[s.photo, fullScreen ? s.fullScreenPhoto : { aspectRatio }]} onLoad={event => {
      // React Native Web wraps a DOM load event; native uses source dimensions.
      type ImageTarget = { naturalWidth?: number; naturalHeight?: number };
      const loaded = event as unknown as { nativeEvent?: { source?: { width?: number; height?: number }; target?: ImageTarget }; target?: ImageTarget };
      const source = loaded.nativeEvent?.source;
      const target = loaded.nativeEvent?.target ?? loaded.target;
      const width = source?.width ?? target?.naturalWidth;
      const height = source?.height ?? target?.naturalHeight;
      if (typeof width === 'number' && typeof height === 'number' && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) setAspectRatio(width / height);
    }} onError={() => setError('Chưa tải được ảnh.')} />}
    {!!uri && file.fileType === 1 && <ChatVideoPreview key={`${file.id}:${attempt}`} uri={uri} label={file.fileName} onError={() => setError('Không phát được video. Bạn có thể tải file để xem.')} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`Tải file ${file.fileName}`} onPress={() => { void download(); }} disabled={busy} style={file.fileType !== 2 && !!uri && !error ? [s.imageDownload, file.fileType === 1 && s.videoDownload] : s.fileRow}>{busy ? <ActivityIndicator size="small" color="#1769E0" /> : <View style={file.fileType === 2 ? s.documentIcon : undefined}>{file.fileType === 2 ? <ChatDocumentIcon name={file.fileName} mimeType={file.mimeType} size={26} /> : <SymbolView name={{ ios: 'arrow.down.doc', android: 'download', web: 'download' }} size={17} tintColor="#1769E0" />}</View>}{(file.fileType === 2 || !uri || !!error) && <View style={{ flex: 1 }}><Text style={s.fileName} numberOfLines={1}>{file.fileName}</Text><Text style={s.fileSize}>{file.fileType === 2 ? `${documentPresentation(file.fileName, file.mimeType).label} · ` : ''}{formatChatFileSize(file.fileSize)}</Text></View>}</Pressable>
    {!!error && <Pressable accessibilityRole="button" onPress={() => { setUri(''); setError(''); setAttempt(value => value + 1); }}><Text role="alert" style={s.error}>{error}</Text></Pressable>}
  </View>;
}
const s = StyleSheet.create({ fullScreenFrame: { flex: 1, width: '100%', maxWidth: '100%', backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 }, fullScreenPhoto: { width: '100%', height: '100%' }, frame: { width: 210, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E3EAF6' }, imageFrame: { width: 320, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 }, photo: { width: '100%' }, imageDownload: { position: 'absolute', right: 6, bottom: 6, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.85)' }, videoDownload: { top: 6, bottom: undefined }, documentIcon: { width: 32, height: 36, borderRadius: 7, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, loading: { height: 100, justifyContent: 'center', alignItems: 'center' }, fileRow: { minHeight: 54, padding: 9, flexDirection: 'row', gap: 8, alignItems: 'center' }, fileName: { color: '#263D5F', fontSize: 11, lineHeight: 17 }, fileSize: { fontSize: 10, color: '#8492A8', marginTop: 1 }, error: { color: '#B8324D', fontSize: 10, lineHeight: 16, padding: 8 } });
