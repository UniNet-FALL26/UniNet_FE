import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';
import { profileMedia } from './profile-media';

export function CertificateImageInput({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (busy: boolean) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function choose() {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); onBusy(true); setError('');
    try {
      const asset = await pickProfileImage();
      if (!asset || controller.signal.aborted) return;
      setPreview(asset.uri);
      const url = await uploadProfileImage(asset, controller.signal);
      if (!controller.signal.aborted) onChange(url);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được ảnh chứng chỉ. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) { setPreview(null); setBusy(false); onBusy(false); }
      if (request.current === controller) request.current = null;
    }
  }
  return <View style={s.field}>
    <Text style={s.label}>Ảnh / biểu tượng chứng chỉ</Text>
    <View style={s.row}>
      <View style={s.preview}>{preview || value ? <Image source={profileMedia(preview || value)} contentFit="contain" accessibilityLabel="Ảnh chứng chỉ đã chọn" style={s.image} /> : <SymbolView name={{ ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' }} size={28} tintColor={colors.primary} />}</View>
      <View style={s.actions}>
        <Button title="Tải lên" variant="outline" loading={busy} disabled={busy} leadingIcon={<SymbolView name={{ ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }} size={16} tintColor={colors.primary} />} style={s.uploadButton} textStyle={s.uploadText} onPress={() => { void choose(); }} />
        {!!value && <Button title="Bỏ ảnh" variant="outline" disabled={busy} leadingIcon={<SymbolView name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={15} tintColor={colors.textSecondary} />} style={s.removeButton} textStyle={s.removeText} onPress={() => onChange('')} />}
      </View>
    </View>
    <Text style={s.hint}>Chọn ảnh để dùng làm biểu tượng cho chứng chỉ.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
const s = StyleSheet.create({
  field: { gap: 7 }, label: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, flexShrink: 1 },
  uploadButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 8, gap: 5, backgroundColor: colors.primaryLight, borderColor: '#D5E5FB' }, uploadText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  removeButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 8, gap: 5, backgroundColor: '#F3F5F8', borderColor: '#E4E9F0' }, removeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  preview: { width: 64, height: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface },
  image: { width: 56, height: 56 }, hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, error: { color: colors.error, fontSize: 13 },
});
