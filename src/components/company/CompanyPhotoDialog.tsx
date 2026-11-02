import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { ToastHost } from '@/components/ui/ToastHost';
import { ActionFeedback } from '@/components/ui/ActionFeedback';
import { imageBody } from '@/utils/image-picker';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';

type Props = {
  initialAsset: ImagePickerAsset;
  target: 'avatarUrl' | 'coverUrl';
  onSave: (url: string, signal: AbortSignal) => Promise<void>;
  onClose: () => void;
};

export function CompanyPhotoDialog({ initialAsset, target, onSave, onClose }: Props) {
  const [asset, setAsset] = useState(initialAsset);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const upload = useRef<AbortController | null>(null);
  const uploadedUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; upload.current?.abort(); };
  }, []);

  const choose = async () => {
    if (upload.current || choosing) return;
    setChoosing(true); setError('');
    try {
      const next = await pickProfileImage(target);
      if (next) {
        await imageBody(next);
        if (mounted.current) { setAsset(next); uploadedUrl.current = null; }
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không chọn được ảnh. Vui lòng thử lại.');
    } finally { if (mounted.current) setChoosing(false); }
  };
  const confirm = async () => {
    if (upload.current || choosing) return;
    const controller = new AbortController();
    upload.current = controller; setBusy(true); setError('');
    try {
      const url = uploadedUrl.current ?? await uploadProfileImage(asset, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      uploadedUrl.current = url;
      await onSave(url, controller.signal);
      if (!controller.signal.aborted && mounted.current) onClose();
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) setError(cause instanceof Error ? cause.message : 'Không lưu được ảnh. Vui lòng thử lại.');
    } finally {
      upload.current = null;
      if (mounted.current) setBusy(false);
    }
  };
  const close = () => { if (!upload.current && !choosing) onClose(); };

  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <View style={s.overlay}><ToastHost modal /><View testID="company-photo-dialog" role="dialog" aria-modal accessibilityViewIsModal style={s.dialog}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text role="heading" aria-level={2} style={s.title}>{target === 'avatarUrl' ? 'Xem trước ảnh đại diện' : 'Xem trước ảnh bìa'}</Text>
        <View style={[s.previewFrame, target === 'avatarUrl' && s.avatarFrame]}><Image source={{ uri: asset.uri }} contentFit="contain" accessibilityLabel="Ảnh đã chọn từ máy" style={s.preview} /></View>
        <Text style={s.hint}>Xác nhận để tải lên và lưu ảnh vào hồ sơ. Ảnh sẽ được cập nhật ngay sau khi lưu.</Text>
        <Text style={s.hint}>JPG, PNG hoặc WebP · tối đa 5 MB.</Text>
        {!!error && <ActionFeedback type="error" message={error} />}
        <Button title="Chọn ảnh khác" variant="outline" disabled={busy || choosing} loading={choosing} onPress={() => { void choose(); }} />
      </ScrollView>
      <View style={s.actions}><Button title="Hủy" variant="outline" disabled={busy || choosing} onPress={close} style={s.action} /><Button title="Xác nhận" loading={busy} disabled={busy || choosing} onPress={() => { void confirm(); }} style={s.action} /></View>
    </View></View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.4)', alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 18, padding: 16, backgroundColor: colors.surface },
  content: { gap: 14, paddingBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  previewFrame: { width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  avatarFrame: { alignSelf: 'center', maxWidth: 280, height: 260 },
  preview: { width: '100%', height: '100%' },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  action: { flex: 1, minHeight: 44 },
});
