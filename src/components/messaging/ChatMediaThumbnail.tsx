import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { loadChatAttachment, type ChatAttachmentResource } from '@/utils/load-chat-attachment';
import type { ChatAttachment } from '@/types/messaging';
import { HubIcon } from '@/components/projects/hub/ProjectHubUI';
import { ChatVideoPreview } from './ChatVideoPreview';

export function ChatMediaThumbnail({ file }: { file: ChatAttachment }) {
  const { id, fileType, fileUrl, fileName, fileSize, mimeType } = file;
  const [uri, setUri] = useState(''), [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let resource: ChatAttachmentResource | undefined;
    const controller = new AbortController();
    loadChatAttachment({ id, fileType, fileUrl, fileName, fileSize, mimeType }, controller.signal).then(loaded => {
      if (disposed) loaded.dispose();
      else { resource = loaded; setUri(loaded.uri); setFailed(false); }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; controller.abort(); resource?.dispose(); };
  }, [id, fileType, fileUrl, fileName, fileSize, mimeType]);
  return <View pointerEvents="none" style={s.frame}>
    {failed ? <HubIcon name={file.fileType === 1 ? 'play' : 'image'} size={26} color="#8190A6" /> : !uri ? <ActivityIndicator color="#1769FF" size="small" /> : file.fileType === 1 ? <ChatVideoPreview uri={uri} label={file.fileName} compact onError={() => setFailed(true)} /> : <Image source={{ uri }} accessibilityLabel={file.fileName} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />}
  </View>;
}
const s = StyleSheet.create({ frame: { flex: 1, width: '100%', height: '100%', backgroundColor: '#EDF2F8', alignItems: 'center', justifyContent: 'center' } });
