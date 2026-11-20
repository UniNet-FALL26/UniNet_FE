import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import type { ChatAttachment as Attachment } from '@/types/messaging';
import { messagingService } from '@/services/messaging.service';
import { API_URL } from '@/constants/config';
import { tokenStorage } from '@/utils/storage';
import { refreshSession } from '@/services/api';

export function ChatAttachment({ file }: { file: Attachment }) {
  const [uri, setUri] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (file.fileType === 2) return;
    let disposed = false, blobUrl = ''; const controller = new AbortController(); setError(''); setUri('');
    if (Platform.OS === 'web') messagingService.attachmentBlob(file, controller.signal).then(blob => { blobUrl = URL.createObjectURL(blob); if (!disposed) setUri(blobUrl); else URL.revokeObjectURL(blobUrl); }).catch(cause => { if (!disposed) setError(cause instanceof Error ? cause.message : 'Chưa tải được file.'); });
    else setUri(API_URL + file.fileUrl);
    return () => { disposed = true; controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [file.id, file.fileType, file.fileUrl, attempt]);
  async function download() {
    if (busy) return; setBusy(true); setError('');
    try {
      if (Platform.OS === 'web') { const blob = await messagingService.attachmentBlob(file); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      else {
        if (!/^\/messaging\/attachments\/[a-f0-9-]+\/content$/.test(file.fileUrl)) throw new Error('Đường dẫn file không hợp lệ.');
        const session = tokenStorage.getSession(); if (!session) throw new Error('Vui lòng đăng nhập lại.');
        if (session.expiresAt && Date.parse(session.expiresAt) < Date.now() + 30000) await refreshSession(session);
        if (tokenStorage.getSession()?.generation !== session.generation) throw new Error('Phiên đăng nhập đã thay đổi.');
        const fs = await import('expo-file-system/legacy'); const sharing = await import('expo-sharing');
        const saved = await fs.downloadAsync(API_URL + file.fileUrl, `${fs.cacheDirectory}chat-${file.id}.${file.fileName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'file'}`, { headers: { Authorization: `Bearer ${tokenStorage.getSession()!.accessToken}` } });
        if (saved.status !== 200) throw new Error('Không tải được file.');
        await sharing.shareAsync(saved.uri, { mimeType: file.mimeType, dialogTitle: file.fileName });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được file.'); } finally { setBusy(false); }
  }
  return <View style={s.frame}>
    {file.fileType !== 2 && !uri && !error && <View style={s.loading}><ActivityIndicator size="small" color="#1769E0" /></View>}
    {uri && file.fileType === 0 && <Image source={{ uri, ...(Platform.OS !== 'web' ? { headers: { Authorization: `Bearer ${tokenStorage.getSession()?.accessToken}` } } : {}) }} accessibilityLabel={file.fileName} resizeMode="cover" style={s.image} onError={() => setError('Chưa tải được ảnh.')} />}
    {uri && file.fileType === 1 && <ChatVideo uri={uri} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`Tải file ${file.fileName}`} onPress={() => { void download(); }} disabled={busy} style={s.fileRow}>{busy ? <ActivityIndicator size="small" color="#1769E0" /> : <SymbolView name={{ ios: 'arrow.down.doc', android: 'download', web: 'download' }} size={17} tintColor="#1769E0" />}<View style={{ flex: 1 }}><Text style={s.fileName} numberOfLines={1}>{file.fileName}</Text><Text style={s.fileSize}>{file.fileSize >= 1024 * 1024 ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.fileSize / 1024))} KB`}</Text></View></Pressable>
    {!!error && <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)}><Text role="alert" style={s.error}>{error}</Text></Pressable>}
  </View>;
}
function ChatVideo({ uri }: { uri: string }) { const player = useVideoPlayer({ uri, ...(Platform.OS !== 'web' ? { headers: { Authorization: `Bearer ${tokenStorage.getSession()?.accessToken}` } } : {}) }); return <VideoView player={player} style={s.image} nativeControls fullscreenOptions={{ enable: true }} />; }
const s = StyleSheet.create({ frame: { width: 220, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E3EAF6' }, image: { width: '100%', height: 155 }, loading: { height: 100, justifyContent: 'center', alignItems: 'center' }, fileRow: { padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }, fileName: { color: '#263D5F', fontSize: 11, lineHeight: 17 }, fileSize: { fontSize: 10, color: '#8492A8', marginTop: 1 }, error: { color: '#B8324D', fontSize: 10, lineHeight: 16, padding: 8 } });
