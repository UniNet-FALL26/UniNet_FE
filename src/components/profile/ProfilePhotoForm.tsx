import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { backgroundRemovalService, type BackgroundRemovalPreview } from '@/services/background-removal.service';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { splitProfileImageUrl, withProfileImageCrop } from '@/utils/profile-image-crop';
import { PortraitProcessingPreview } from './PortraitProcessingPreview';

type CropTarget = 'avatarUrl' | 'coverUrl';
type Props = {
  initialAsset: ImagePickerAsset;
  onConfirm: (url: string) => void;
  onClose: () => void;
  portrait?: boolean;
  cropFor?: CropTarget;
  editExisting?: boolean;
  confirmationHint?: string;
};

export function ProfilePhotoForm({ initialAsset, onConfirm, onClose, portrait = false, cropFor, editExisting = false, confirmationHint = 'Xác nhận để dùng ảnh này. Sau đó bấm Lưu hồ sơ để lưu thay đổi.' }: Props) {
  const [asset, setAsset] = useState<ImagePickerAsset | null>(initialAsset);
  const [initialCrop] = useState(() => splitProfileImageUrl(initialAsset.uri).crop);
  const [editingOriginal, setEditingOriginal] = useState(editExisting);
  const [url, setUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackgroundRemovalPreview | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropReady, setCropReady] = useState(!cropFor);
  const [cropZoom, setCropZoom] = useState(initialCrop.zoom);
  const [cropX, setCropX] = useState(initialCrop.x);
  const [cropY, setCropY] = useState(initialCrop.y);
  const [frameWidth, setFrameWidth] = useState(360);
  const frameHeight = cropFor === 'coverUrl' ? 120 : 180;
  const upload = useRef<AbortController | null>(null);
  const activeSession = useRef<string | null>(null);
  const mounted = useRef(true);
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
    mounted.current = true;
    return () => {
      mounted.current = false;
      upload.current?.abort();
      if (activeSession.current) void backgroundRemovalService.release(activeSession.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    setError('');
    setPreview(null);
    setUrl(asset ? null : '');
    if (!asset || editingOriginal || (cropFor && !cropReady)) return;

    const controller = new AbortController();
    if (portrait) {
      backgroundRemovalService.process(asset, controller.signal).then(next => {
        if (controller.signal.aborted) { void backgroundRemovalService.release(next.sessionId).catch(() => {}); return; }
        activeSession.current = next.sessionId;
        if (mounted.current) setPreview(next);
      }).catch(cause => {
        if (!controller.signal.aborted && mounted.current) setError(cause instanceof Error ? cause.message : 'Chưa tách được nền. Vui lòng thử lại.');
      });
    } else {
      uploadProfileImage(asset, controller.signal).then(next => {
        if (!controller.signal.aborted && mounted.current) setUrl(next);
      }).catch(cause => {
        if (!controller.signal.aborted && mounted.current) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh. Vui lòng thử lại.');
      });
    }
    return () => {
      controller.abort();
      if (activeSession.current) {
        const sessionId = activeSession.current;
        activeSession.current = null;
        void backgroundRemovalService.release(sessionId).catch(() => {});
      }
    };
  }, [asset, attempt, cropFor, cropReady, editingOriginal, portrait]);

  const choose = async () => {
    if (upload.current) return;
    setChoosing(true);
    try {
      const next = await pickProfileImage(cropFor);
      if (next) {
        setUrl(null);
        setPreview(null);
        setAsset(next);
        setEditingOriginal(false);
        setCropZoom(1); setCropX(0); setCropY(0);
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
      if (naturalWidth && naturalHeight && (naturalWidth !== asset.width || naturalHeight !== asset.height))
        setAsset(current => current?.uri === asset.uri ? { ...current, width: naturalWidth, height: naturalHeight } : current);
    }} style={{ position: 'absolute', width, height, left: (frameWidth - width) / 2 + cropX * (frameWidth - width) / 2, top: (frameHeight - height) / 2 + cropY * (frameHeight - height) / 2 }} accessibilityLabel="Ảnh được căn trong khung cắt" />;
  };

  const confirm = async () => {
    if (upload.current || choosing) return;
    if (!asset) { if (url !== null) onConfirm(url); return; }
    if (portrait) {
      if (!preview) return;
      const controller = new AbortController(); upload.current = controller; setUploading(true); setError('');
      try {
        const uploadedUrl = await backgroundRemovalService.confirm(preview.sessionId, controller.signal);
        if (!controller.signal.aborted && mounted.current) { activeSession.current = null; onConfirm(uploadedUrl); }
      } catch (cause) {
        if (!controller.signal.aborted && mounted.current) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh lên Cloudinary. Vui lòng thử lại.');
      } finally { upload.current = null; if (mounted.current) setUploading(false); }
      return;
    }
    if (url !== null) onConfirm(cropFor && url ? withProfileImageCrop(url, { x: cropX, y: cropY, zoom: cropZoom }) : url);
  };

  const close = () => { if (!upload.current) onClose(); };
  const processing = !!asset && !editingOriginal && (portrait ? !preview : cropFor ? !cropReady || url === null : url === null) && !error;

  return <Modal visible transparent animationType="fade" onRequestClose={close}><View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
    <ScrollView style={s.dialogScroll} contentContainerStyle={s.dialogContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
      <Text role="heading" aria-level={2} style={s.title}>{cropFor ? cropFor === 'coverUrl' ? 'Căn khung ảnh bìa' : 'Căn khung ảnh đại diện' : portrait ? 'Ảnh chân dung' : 'Chọn ảnh hồ sơ'}</Text>
      {asset && cropFor ? <>
        <View onLayout={event => setFrameWidth(event.nativeEvent.layout.width)} style={[s.cropFrame, { width: cropFor === 'avatarUrl' ? frameHeight : '100%', maxWidth: cropFor === 'avatarUrl' ? frameHeight : 360, height: frameHeight }]} {...cropDrag.panHandlers}>
          {renderedCropImage()}
          <View pointerEvents="none" style={s.cropGuides}><View style={s.cropGuideVertical} /><View style={s.cropGuideHorizontal} /></View>
        </View>
        <Text style={s.hint}>Kéo ảnh để chỉnh vị trí trong khung.</Text>
        <View style={s.zoomRow}><Text style={s.zoomLabel}>−</Text><View style={s.zoomTrack} {...zoomDrag.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Mức phóng to ảnh" accessibilityValue={{ min: 100, max: 300, now: Math.round(cropZoom * 100) }}><View style={[s.zoomFill, { width: `${((cropZoom - 1) / 2) * 100}%` }]} /><View style={[s.zoomThumb, { left: `${((cropZoom - 1) / 2) * 100}%` }]} /></View><Text style={s.zoomLabel}>+</Text><Text style={s.zoomValue}>{Math.round(cropZoom * 100)}%</Text></View>
        <Button title={editingOriginal ? 'Áp dụng khung' : 'Dùng khung ảnh này'} onPress={applyCrop} style={s.smallButton} />
        {(cropX !== 0 || cropY !== 0 || cropZoom !== 1) && <Button title="Khôi phục ảnh gốc" variant="outline" style={s.smallButton} onPress={() => { setCropX(0); setCropY(0); setCropZoom(1); if (editingOriginal && asset) setUrl(splitProfileImageUrl(asset.uri).source); }} />}
      </> : asset && portrait ? <PortraitProcessingPreview key={`${asset.uri}-${attempt}`} source={asset.uri} preview={preview?.previewUrl} processing={processing} uploading={uploading} /> : asset ? <View style={s.previews}>
        <View style={s.column}><Text style={s.hint}>Ảnh gốc</Text><Image source={{ uri: asset.uri }} contentFit="contain" style={s.preview} accessibilityLabel="Ảnh đã chọn từ máy" /></View>
      </View> : <Text>Ảnh sẽ được bỏ khỏi hồ sơ.</Text>}
      {!!asset && <Text style={s.hint}>Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</Text>}
      {processing && !portrait && <Text accessibilityLiveRegion="polite" style={s.hint}>Đang tải ảnh lên…</Text>}
      {portrait && preview && !uploading && <Text style={s.hint}>{confirmationHint}</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.photoActions}>
        {!!error && asset && !editingOriginal && <Button title={portrait ? 'Thử tách nền lại' : 'Thử tải lại'} variant="outline" style={s.smallButton} onPress={() => setAttempt(value => value + 1)} />}
        <Button title="Chọn ảnh khác" variant="outline" style={s.smallButton} disabled={uploading} onPress={() => { void choose(); }} loading={choosing} />
      </View>
      {asset && <Pressable accessibilityRole="button" disabled={uploading || choosing} onPress={() => { setUrl(''); setPreview(null); setAsset(null); setCropReady(true); }} style={s.removeAction}><Text style={s.removeText}>Bỏ ảnh</Text></Pressable>}
    </ScrollView>
    <View style={s.actions}><Button title="Hủy" variant="outline" disabled={uploading} onPress={close} style={{ ...s.footerButton, flex: 1 }} /><Button title="Xác nhận" loading={uploading} disabled={choosing || processing || (!!asset && portrait ? !preview : url === null)} onPress={() => { void confirm(); }} style={{ ...s.footerButton, flex: 1 }} /></View>
  </View></View></Modal>;
}

const s = StyleSheet.create({ overlay: { flex: 1, padding: 12, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 480, height: '94%', maxHeight: 680, borderRadius: 12, padding: 12, backgroundColor: colors.surface }, dialogScroll: { flex: 1 }, dialogContent: { gap: 7, paddingBottom: 8 }, title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary }, preview: { width: '100%', height: 220 }, previews: { flexDirection: 'row', gap: 10 }, column: { flex: 1, minWidth: 0, gap: 4 }, checker: { overflow: 'hidden', borderRadius: 6 }, checkerRow: { flex: 1, flexDirection: 'row' }, tile: { flex: 1 }, coverPreview: { height: 140 }, avatarPreview: { width: 220, height: 220, alignSelf: 'center', borderRadius: 14 }, cropFrame: { alignSelf: 'center', overflow: 'hidden', backgroundColor: '#0B1220', borderRadius: 10, position: 'relative', cursor: 'grab' as never }, cropGuides: { ...StyleSheet.absoluteFill, borderWidth: 3, borderColor: '#00E5FF' }, cropGuideVertical: { position: 'absolute', top: 0, bottom: 0, left: '33.333%', width: 1, backgroundColor: 'rgba(255,255,255,0.75)' }, cropGuideHorizontal: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,0.75)' }, zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, zoomTrack: { flex: 1, height: 18, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.border, position: 'relative', cursor: 'pointer' as never }, zoomFill: { position: 'absolute', left: 0, height: 5, backgroundColor: colors.primary, borderRadius: 3 }, zoomThumb: { position: 'absolute', top: 2, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface }, zoomLabel: { minWidth: 16, color: colors.textSecondary, fontSize: 14, fontWeight: '700', textAlign: 'center' }, zoomValue: { minWidth: 38, color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'right' }, hint: { fontSize: 11, lineHeight: 15, color: colors.textSecondary, textAlign: 'center' }, error: { fontSize: 12, color: colors.error, textAlign: 'center' }, photoActions: { flexDirection: 'row', gap: 8 }, smallButton: { flex: 1, minHeight: 38, paddingHorizontal: 8 }, removeAction: { alignSelf: 'center', paddingVertical: 2 }, removeText: { color: colors.error, fontSize: 12, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }, footerButton: { minHeight: 38, paddingHorizontal: 8 } });
