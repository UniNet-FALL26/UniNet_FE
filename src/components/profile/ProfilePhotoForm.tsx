import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { backgroundRemovalService, type BackgroundRemovalPreview } from '@/services/background-removal.service';

export function ProfilePhotoForm({ initialAsset, portrait = false, onConfirm, onClose }: { initialAsset: ImagePickerAsset; portrait?: boolean; onConfirm: (url: string) => void; onClose: () => void }) {
  const [asset, setAsset] = useState<ImagePickerAsset | null>(initialAsset);
  const [url, setUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackgroundRemovalPreview | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upload = useRef<AbortController | null>(null);
  const activeSession = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; upload.current?.abort(); };
  }, []);
  useEffect(() => {
    setError(''); setUrl(asset ? null : ''); setPreview(null);
    if (!asset) return;
    const controller = new AbortController();
    if (portrait) {
      backgroundRemovalService.process(asset, controller.signal).then(next => {
        if (controller.signal.aborted) { void backgroundRemovalService.release(next.sessionId).catch(() => {}); return; }
        activeSession.current = next.sessionId; setPreview(next);
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tách được nền. Vui lòng thử lại.'); });
    } else {
      uploadProfileImage(asset, controller.signal).then(next => { if (!controller.signal.aborted) setUrl(next); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh. Vui lòng thử lại.'); });
    }
    return () => {
      controller.abort();
      if (activeSession.current) { void backgroundRemovalService.release(activeSession.current).catch(() => {}); activeSession.current = null; }
    };
  }, [asset, attempt, portrait]);
  const choose = async () => {
    if (upload.current) return;
    setChoosing(true);
    try { const next = await pickProfileImage(); if (next && mounted.current) { setUrl(null); setPreview(null); setAsset(next); } }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh.'); }
    finally { if (mounted.current) setChoosing(false); }
  };
  const confirm = async () => {
    if (upload.current || choosing) return;
    if (!asset || !portrait) { if (url !== null) onConfirm(url); return; }
    if (!preview) return;
    const controller = new AbortController(); upload.current = controller;
    setUploading(true); setError('');
    try {
      const uploadedUrl = await backgroundRemovalService.confirm(preview.sessionId, controller.signal);
      if (!controller.signal.aborted) { activeSession.current = null; onConfirm(uploadedUrl); }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh lên Cloudinary. Vui lòng thử lại.'); }
    finally { upload.current = null; if (mounted.current) setUploading(false); }
  };
  const close = () => { if (!upload.current) onClose(); };
  const processing = !!asset && (portrait ? !preview : url === null) && !error;
  return <Modal visible transparent animationType="fade" onRequestClose={close}><View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal><ScrollView contentContainerStyle={s.content}>
    <Text role="heading" aria-level={2} style={s.title}>{portrait ? 'Ảnh chân dung' : 'Chọn ảnh hồ sơ'}</Text>
    {asset ? <View style={s.previews}>
      <View style={s.column}><Text style={s.hint}>Ảnh gốc</Text><Image source={{ uri: asset.uri }} contentFit="contain" style={s.preview} accessibilityLabel="Ảnh đã chọn từ máy" /></View>
      {portrait && preview && <View style={s.column}><Text style={s.hint}>Ảnh đã tách nền</Text><View style={s.checker}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 10 }, (_, row) => <View key={row} style={s.checkerRow}>{Array.from({ length: 10 }, (_, col) => <View key={col} style={[s.tile, { backgroundColor: (row + col) % 2 ? '#DDE1E6' : '#FFFFFF' }]} />)}</View>)}</View>
        <Image source={{ uri: preview.previewUrl }} contentFit="contain" style={s.preview} accessibilityLabel="Ảnh chân dung tách nền trong suốt" />
      </View></View>}
    </View> : <Text>Ảnh sẽ được bỏ khỏi hồ sơ.</Text>}
    <Text style={s.hint}>Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</Text>
    {processing && <Text accessibilityLiveRegion="polite" style={s.hint}>{portrait ? 'Đang tách nền ảnh chân dung...' : 'Đang tải ảnh lên…'}</Text>}
    {uploading && <Text accessibilityLiveRegion="polite" style={s.hint}>Đang lưu ảnh lên Cloudinary...</Text>}
    {portrait && preview && !uploading && <Text style={s.hint}>Xác nhận để dùng ảnh này. Sau đó bấm Lưu hồ sơ để lưu thay đổi.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button title="Chọn ảnh khác" variant="outline" disabled={uploading} onPress={() => { void choose(); }} loading={choosing} />
    {!!error && asset && !preview && <Button title={portrait ? 'Thử tách nền lại' : 'Thử tải lại'} variant="outline" onPress={() => setAttempt(value => value + 1)} />}
    {asset && <Button title="Bỏ ảnh" variant="outline" disabled={uploading || choosing} onPress={() => { setUrl(''); setAsset(null); }} />}
    <View style={s.actions}><Button title="Hủy" variant="outline" disabled={uploading} onPress={close} style={{ flex: 1 }} /><Button title="Xác nhận" loading={uploading} disabled={choosing || (!!asset && portrait ? !preview : url === null)} onPress={() => { void confirm(); }} style={{ flex: 1 }} /></View>
  </ScrollView></View></View></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, padding: 18, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 12, backgroundColor: colors.surface }, content: { padding: 20, gap: 12 }, title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary }, previews: { flexDirection: 'row', gap: 10 }, column: { flex: 1, minWidth: 0, gap: 4 }, preview: { width: '100%', height: 180 }, checker: { overflow: 'hidden', borderRadius: 6 }, checkerRow: { flex: 1, flexDirection: 'row' }, tile: { flex: 1 }, hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, error: { fontSize: 13, color: colors.error }, actions: { flexDirection: 'row', gap: 10 } });
