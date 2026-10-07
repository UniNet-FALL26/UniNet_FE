import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';

export function ProfilePhotoForm({ initialAsset, onConfirm, onClose }: { initialAsset: ImagePickerAsset; onConfirm: (url: string) => void; onClose: () => void }) {
  const [asset, setAsset] = useState<ImagePickerAsset | null>(initialAsset);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false);
  useEffect(() => {
    setError(''); setUrl(asset ? null : '');
    if (!asset) return;
    const controller = new AbortController();
    uploadProfileImage(asset, controller.signal).then(next => { if (!controller.signal.aborted) setUrl(next); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh. Vui lòng thử lại.'); });
    return () => controller.abort();
  }, [asset, attempt]);
  const choose = async () => {
    setChoosing(true);
    try { const next = await pickProfileImage(); if (next) { setUrl(null); setAsset(next); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh.'); }
    finally { setChoosing(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
    <Text role="heading" aria-level={2} style={s.title}>Chọn ảnh hồ sơ</Text>
    {asset ? <Image source={{ uri: asset.uri }} contentFit="contain" style={s.preview} accessibilityLabel="Ảnh đã chọn từ máy" /> : <Text>Ảnh sẽ được bỏ khỏi hồ sơ.</Text>}
    <Text style={s.hint}>Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</Text>
    {asset && url === null && !error && <Text style={s.hint}>Đang tải ảnh lên…</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button title="Chọn ảnh khác" variant="outline" onPress={() => { void choose(); }} loading={choosing} />
    {!!error && asset && <Button title="Thử tải lại" variant="outline" onPress={() => setAttempt(value => value + 1)} />}
    {asset && <Button title="Bỏ ảnh" variant="outline" onPress={() => { setUrl(''); setAsset(null); }} />}
    <View style={s.actions}><Button title="Hủy" variant="outline" onPress={onClose} style={{ flex: 1 }} /><Button title="Xác nhận" disabled={url === null || choosing} onPress={() => { if (url !== null) onConfirm(url); }} style={{ flex: 1 }} /></View>
  </View></View></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, padding: 18, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 480, borderRadius: 12, padding: 20, backgroundColor: colors.surface, gap: 12 }, title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary }, preview: { width: '100%', height: 220 }, hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, error: { fontSize: 13, color: colors.error }, actions: { flexDirection: 'row', gap: 10 } });
