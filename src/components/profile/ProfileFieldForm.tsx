import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import type { PortfolioResponse } from '@/types/portfolio';
import { profileEditFields, profileFieldValue, updateProfileField, type ProfileEditField } from '@/utils/profile-fields';

export function ProfileFieldForm({ data, field, onConfirm, onClose, label }: { data: PortfolioResponse; field: ProfileEditField; onConfirm: (data: PortfolioResponse) => void; onClose: () => void; label?: string }) {
  const definition = profileEditFields[field];
  const [value, setValue] = useState(() => profileFieldValue(data, field));
  const [error, setError] = useState('');
  const numeric = 'kind' in definition && definition.kind === 'number';
  const image = field === 'avatarUrl' || field === 'coverUrl';
  const confirm = () => { try { onConfirm(updateProfileField(data, field, value)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Thông tin không hợp lệ.'); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
    <Text role="heading" aria-level={2} style={s.title}>{label || definition.label}</Text>
    <Input label={image ? 'Liên kết ảnh' : definition.label} value={value} onChangeText={next => { setValue(next); setError(''); }} autoFocus multiline={'multiline' in definition && definition.multiline} keyboardType={numeric ? 'decimal-pad' : image ? 'url' : field === 'contactEmail' ? 'email-address' : 'default'} autoCapitalize={image || field === 'contactEmail' ? 'none' : 'sentences'} maxLength={numeric ? undefined : definition.max} />
    {image && <Text style={s.hint}>Nhập liên kết ảnh HTTP hoặc HTTPS. Để trống để bỏ ảnh.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.actions}><Button title="Hủy" variant="outline" onPress={onClose} style={{ flex: 1 }} /><Button title="Xác nhận" onPress={confirm} style={{ flex: 1 }} /></View>
  </View></KeyboardAvoidingView></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, padding: 18, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 480, borderRadius: 12, padding: 20, backgroundColor: colors.surface, gap: 16 }, title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary }, hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, error: { fontSize: 13, color: colors.error }, actions: { flexDirection: 'row', gap: 10 } });
