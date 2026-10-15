import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { splitProfileImageUrl, withProfileImageCrop } from '@/utils/profile-image-crop';

type CropTarget = 'avatarUrl' | 'coverUrl';

export function ProfilePhotoForm({ initialAsset, onConfirm, onClose, cropFor, editExisting = false }: { initialAsset: ImagePickerAsset; onConfirm: (url: string) => void; onClose: () => void; cropFor?: CropTarget; editExisting?: boolean }) {
import { portraitService, type PortraitPreview } from '@/services/portrait.service';

export function ProfilePhotoForm({ initialAsset, portrait = false, onConfirm, onClose }: { initialAsset: ImagePickerAsset; portrait?: boolean; onConfirm: (url: string) => void; onClose: () => void }) {
  const [asset, setAsset] = useState<ImagePickerAsset | null>(initialAsset);
  const [initialCrop] = useState(() => splitProfileImageUrl(initialAsset.uri).crop);
  const [editingOriginal, setEditingOriginal] = useState(editExisting);
  const [url, setUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortraitPreview | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [cropReady, setCropReady] = useState(!cropFor);
  const [cropZoom, setCropZoom] = useState(initialCrop.zoom);
  const [cropX, setCropX] = useState(initialCrop.x);
  const [cropY, setCropY] = useState(initialCrop.y);
  const [frameWidth, setFrameWidth] = useState(360);
  const frameHeight = cropFor === 'coverUrl' ? 120 : 180;
  const dragStart = useRef({ cropX: 0, cropY: 0 });
  const zoomStart = useRef(1);
  const zoomTrackWidth = 260;
  const currentCrop = useRef({ cropX, cropY, frameWidth, frameHeight, cropZoom, asset });
  currentCrop.current = { cropX, cropY, frameWidth, frameHeight, cropZoom, asset };
  const cropDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dragStart.current = { cropX: currentCrop.current.cropX, cropY: currentCrop.current.cropY }; },
    onPanResponderMove: (_, gesture) => {
      const state = currentCrop.current;
      if (!state.asset) return;
      const scale = Math.max(state.frameWidth / state.asset.width, state.frameHeight / state.asset.height) * state.cropZoom;
      const overflowX = Math.max(1, (state.asset.width * scale - state.frameWidth) / 2);
      const overflowY = Math.max(1, (state.asset.height * scale - state.frameHeight) / 2);
      setCropX(Math.max(-1, Math.min(1, dragStart.current.cropX + gesture.dx / overflowX)));
      setCropY(Math.max(-1, Math.min(1, dragStart.current.cropY + gesture.dy / overflowY)));
    },
  })).current;
  const zoomDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      zoomStart.current = 1 + Math.max(0, Math.min(1, event.nativeEvent.locationX / zoomTrackWidth)) * 2;
      setCropZoom(zoomStart.current);
    },
    onPanResponderMove: (_, gesture) => setCropZoom(Math.max(1, Math.min(3, zoomStart.current + gesture.dx / zoomTrackWidth * 2))),
  })).current;

  useEffect(() => {
    setError(''); setUrl(asset && cropReady ? null : '');
    if (!asset || !cropReady || editingOriginal) return;
    const controller = new AbortController();
    uploadProfileImage(asset, controller.signal).then(next => { if (!controller.signal.aborted) setUrl(next); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh. Vui lòng thử lại.'); });
    return () => controller.abort();
  }, [asset, attempt, cropReady, editingOriginal]);

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
      portraitService.process(asset, controller.signal).then(next => {
        if (controller.signal.aborted) { void portraitService.release(next.sessionId).catch(() => {}); return; }
        activeSession.current = next.sessionId; setPreview(next);
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tách được nền. Vui lòng thử lại.'); });
    } else {
      uploadProfileImage(asset, controller.signal).then(next => { if (!controller.signal.aborted) setUrl(next); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh. Vui lòng thử lại.'); });
    }
    return () => {
      controller.abort();
      if (activeSession.current) { void portraitService.release(activeSession.current).catch(() => {}); activeSession.current = null; }
    };
  }, [asset, attempt, portrait]);
  const choose = async () => {
    if (upload.current) return;
    setChoosing(true);
    try {
      const next = await pickProfileImage(cropFor);
      if (next) {
        setUrl(null); setAsset(next); setEditingOriginal(false); setCropZoom(1); setCropX(0); setCropY(0);
        setCropReady(!cropFor);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh.'); }
    finally { setChoosing(false); }
  };

  const applyCrop = () => {
    if (!asset || !cropFor) return;
    setError('');
    if (editingOriginal) {
      setUrl(withProfileImageCrop(asset.uri, { x: cropX, y: cropY, zoom: cropZoom }));
      return;
    }
    setCropReady(true);
  };

  const renderedCropImage = () => {
    if (!asset || !cropFor) return null;
    const scale = Math.max(frameWidth / asset.width, frameHeight / asset.height) * cropZoom;
    const width = asset.width * scale;
    const height = asset.height * scale;
    const imageSource = splitProfileImageUrl(asset.uri).source;
    return <Image source={{ uri: imageSource }} contentFit="fill" onLoad={event => {
      const { width: naturalWidth, height: naturalHeight } = event.source;
      if (naturalWidth && naturalHeight && (naturalWidth !== asset.width || naturalHeight !== asset.height)) setAsset(current => current?.uri === asset.uri ? { ...current, width: naturalWidth, height: naturalHeight } : current);
    }} style={{ position: 'absolute', width, height, left: (frameWidth - width) / 2 + cropX * (frameWidth - width) / 2, top: (frameHeight - height) / 2 + cropY * (frameHeight - height) / 2 }} accessibilityLabel="Ảnh được căn trong khung cắt" />;
  };

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
    <ScrollView style={s.dialogScroll} contentContainerStyle={s.dialogContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
    <Text role="heading" aria-level={2} style={s.title}>{cropFor ? cropFor === 'coverUrl' ? 'Căn khung ảnh bìa' : 'Căn khung ảnh đại diện' : 'Chọn ảnh hồ sơ'}</Text>
    {asset && cropFor ? <>
      <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)} style={[s.cropFrame, { width: cropFor === 'avatarUrl' ? frameHeight : '100%', maxWidth: cropFor === 'avatarUrl' ? frameHeight : 360, height: frameHeight }]} {...cropDrag.panHandlers}>
        {renderedCropImage()}
        <View pointerEvents="none" style={s.cropGuides}><View style={s.cropGuideVertical} /><View style={s.cropGuideHorizontal} /></View>
      </View>
      <Text style={s.hint}>Kéo ảnh để chỉnh vị trí trong khung.</Text>
      <View style={s.zoomRow}><Text style={s.zoomLabel}>−</Text><View style={s.zoomTrack} {...zoomDrag.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Mức phóng to ảnh" accessibilityValue={{ min: 100, max: 300, now: Math.round(cropZoom * 100) }}><View style={[s.zoomFill, { width: `${((cropZoom - 1) / 2) * 100}%` }]} /><View style={[s.zoomThumb, { left: `${((cropZoom - 1) / 2) * 100}%` }]} /></View><Text style={s.zoomLabel}>+</Text><Text style={s.zoomValue}>{Math.round(cropZoom * 100)}%</Text></View>
      <Button title={editingOriginal ? 'Áp dụng khung' : 'Dùng khung ảnh này'} onPress={applyCrop} style={s.smallButton} />
      {(cropX !== 0 || cropY !== 0 || cropZoom !== 1) && <Button title="Khôi phục ảnh gốc" variant="outline" style={s.smallButton} onPress={() => { setCropX(0); setCropY(0); setCropZoom(1); setUrl(editingOriginal && asset ? splitProfileImageUrl(asset.uri).source : null); }} />}
    </> : asset ? <Image source={{ uri: asset.uri }} contentFit="cover" style={[s.preview, cropFor === 'coverUrl' && s.coverPreview, cropFor === 'avatarUrl' && s.avatarPreview]} accessibilityLabel="Ảnh đã được căn khung" /> : <Text>Ảnh sẽ được bỏ khỏi hồ sơ.</Text>}
    {!editingOriginal && <Text style={s.hint}>Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</Text>}
    {asset && cropReady && url === null && !error && <Text style={s.hint}>Đang tải ảnh lên…</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.photoActions}>
    {!!error && editingOriginal && asset && <Button title="Giữ ảnh gốc" variant="outline" style={s.smallButton} onPress={() => setUrl(asset.uri)} />}
      <Button title="Chọn ảnh khác" variant="outline" style={s.smallButton} onPress={() => { void choose(); }} loading={choosing} />
    </View>
    {!!error && asset && cropReady && <Button title="Thử tải lại" variant="outline" onPress={() => setAttempt(value => value + 1)} />}
    {asset && <Pressable accessibilityRole="button" onPress={() => { setUrl(''); setAsset(null); setCropReady(true); }} style={s.removeAction}><Text style={s.removeText}>Bỏ ảnh</Text></Pressable>}
    </ScrollView>
    <View style={s.actions}><Button title="Hủy" variant="outline" onPress={onClose} style={{ ...s.footerButton, flex: 1 }} /><Button title="Xác nhận" disabled={url === null || choosing || (!cropReady && !url)} onPress={() => { if (url !== null) onConfirm(cropFor && url ? withProfileImageCrop(url, { x: cropX, y: cropY, zoom: cropZoom }) : url); }} style={{ ...s.footerButton, flex: 1 }} /></View>
  </View></View></Modal>;
}

const s = StyleSheet.create({ overlay: { flex: 1, padding: 12, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 480, height: '94%', maxHeight: 680, borderRadius: 12, padding: 12, backgroundColor: colors.surface }, dialogScroll: { flex: 1 }, dialogContent: { gap: 7, paddingBottom: 8 }, title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary }, preview: { width: '100%', height: 220 }, coverPreview: { height: 140 }, avatarPreview: { width: 220, height: 220, alignSelf: 'center', borderRadius: 14 }, cropFrame: { alignSelf: 'center', overflow: 'hidden', backgroundColor: '#0B1220', borderRadius: 10, position: 'relative', cursor: 'grab' as never }, cropGuides: { ...StyleSheet.absoluteFill, borderWidth: 3, borderColor: '#00E5FF' }, cropGuideVertical: { position: 'absolute', top: 0, bottom: 0, left: '33.333%', width: 1, backgroundColor: 'rgba(255,255,255,0.75)' }, cropGuideHorizontal: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,0.75)' }, zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, zoomTrack: { flex: 1, height: 18, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.border, position: 'relative', cursor: 'pointer' as never }, zoomFill: { position: 'absolute', left: 0, height: 5, backgroundColor: colors.primary, borderRadius: 3 }, zoomThumb: { position: 'absolute', top: 2, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface }, zoomLabel: { minWidth: 16, color: colors.textSecondary, fontSize: 14, fontWeight: '700', textAlign: 'center' }, zoomValue: { minWidth: 38, color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'right' }, hint: { fontSize: 11, lineHeight: 15, color: colors.textSecondary, textAlign: 'center' }, error: { fontSize: 12, color: colors.error, textAlign: 'center' }, photoActions: { flexDirection: 'row', gap: 8 }, smallButton: { flex: 1, minHeight: 38, paddingHorizontal: 8 }, removeAction: { alignSelf: 'center', paddingVertical: 2 }, removeText: { color: colors.error, fontSize: 12, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }, footerButton: { minHeight: 38, paddingHorizontal: 8 } });
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
      const uploadedUrl = await portraitService.confirm(preview.sessionId, controller.signal);
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
