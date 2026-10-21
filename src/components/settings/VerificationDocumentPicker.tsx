import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';
import { File as NativeFile } from 'expo-file-system';
import { colors } from '@/constants/colors';
import { validateVerificationDocument } from '@/utils/student-verification';
import type { VerificationDocument } from '@/types/student-verification';

export function VerificationDocumentPicker({ value, onChange, error, onError, disabled, title = 'Ảnh thẻ sinh viên / giấy xác nhận đang học' }: {
  value: VerificationDocument | null; onChange: (value: VerificationDocument | null) => void;
  error?: string; onError: (message: string) => void; disabled: boolean; title?: string;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const alive = useRef(true);
  const [preview, setPreview] = useState('');
  const [choosing, setChoosing] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (Platform.OS === 'web' && value?.file) {
      const uri = URL.createObjectURL(value.file); setPreview(uri);
      return () => URL.revokeObjectURL(uri);
    }
    setPreview(value?.uri || '');
  }, [value]);
  const accept = (file: VerificationDocument) => {
    const message = validateVerificationDocument(file);
    onError(message || ''); onChange(message ? null : file);
  };
  const choose = async () => {
    if (disabled || choosing) return;
    if (Platform.OS === 'web') { input.current?.click(); return; }
    setChoosing(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !alive.current) return;
      const asset = result.assets[0];
      accept({ name: asset.name, mimeType: asset.mimeType || '', size: asset.size ?? new NativeFile(asset.uri).size, uri: asset.uri });
    } catch { if (alive.current) onError('Không mở được bộ chọn giấy tờ. Vui lòng thử lại.'); }
    finally { if (alive.current) setChoosing(false); }
  };
  const fileFromWeb = (file?: File) => { if (file && !disabled) accept({ name: file.name, mimeType: file.type, size: file.size, uri: '', file }); };
  const picker = <View style={[s.zone, !!error && s.invalid]}>
    <Pressable accessibilityRole="button" accessibilityLabel={value ? 'Thay giấy tờ' : 'Chọn giấy tờ xác minh'} disabled={disabled || choosing} onPress={() => { void choose(); }} style={({ pressed }) => [s.pick, pressed && s.pressed]}>
      {value && preview && value.mimeType.startsWith('image/') ? <Image source={{ uri: preview }} contentFit="contain" style={s.preview} accessibilityLabel="Xem trước giấy tờ đã chọn" /> : <View style={s.uploadIcon}><SymbolView name={{ ios: value ? 'doc.fill' : 'square.and.arrow.up', android: value ? 'description' : 'upload', web: value ? 'description' : 'upload' }} size={28} tintColor={colors.primary} /></View>}
      <View style={s.copy}><Text style={s.pickTitle}>{choosing ? 'Đang mở bộ chọn…' : value ? value.name : Platform.OS === 'web' ? 'Kéo thả tệp vào đây hoặc nhấn để chọn' : 'Chọn ảnh hoặc tệp PDF'}</Text><Text style={s.hint}>{value ? `${value.mimeType === 'application/pdf' ? 'Tệp PDF · ' : ''}${(value.size / 1024).toFixed(0)} KB · Nhấn để thay tệp` : 'Hỗ trợ JPG, PNG, PDF (tối đa 5 MB)'}</Text></View>
    </Pressable>
    {value && <Pressable accessibilityRole="button" accessibilityLabel="Xóa giấy tờ" disabled={disabled} onPress={() => { onChange(null); onError(''); }} style={s.remove}><Text style={s.removeText}>Xóa tệp</Text></Pressable>}
  </View>;
  return <View style={s.field}>
    <Text style={s.label}>{title}</Text>
    {Platform.OS === 'web' ? createElement('div', { onDragOver: (event: React.DragEvent) => event.preventDefault(), onDrop: (event: React.DragEvent) => { event.preventDefault(); fileFromWeb(event.dataTransfer.files[0]); } }, picker, createElement('input', { ref: input, type: 'file', 'aria-label': 'Giấy tờ xác minh', accept: '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf', disabled, style: { display: 'none' }, onChange: (event: React.ChangeEvent<HTMLInputElement>) => { fileFromWeb(event.target.files?.[0]); event.target.value = ''; } })) : picker}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

const s = StyleSheet.create({
  field: { gap: 7 }, label: { color: colors.navy, fontSize: 12, fontWeight: '700', lineHeight: 18 }, zone: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#B8CFF4', borderRadius: 12, backgroundColor: '#F8FBFF', overflow: 'hidden' }, invalid: { borderColor: colors.error },
  pick: { minHeight: 110, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, uploadIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EAF2FF', justifyContent: 'center', alignItems: 'center' }, copy: { flex: 1, minWidth: 0, gap: 5 }, pickTitle: { color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '600' }, hint: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 }, preview: { width: 78, height: 92, borderRadius: 7 }, remove: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 16 }, removeText: { color: colors.error, fontSize: 12, fontWeight: '600' }, error: { color: colors.error, fontSize: 12, lineHeight: 18 }, pressed: { backgroundColor: '#EEF5FF' },
});
