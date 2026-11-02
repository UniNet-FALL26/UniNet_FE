import { ToastHost } from '@/components/ui/ToastHost';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProfileTextInput } from './ProfileTextInput';
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
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}><ToastHost modal /><View style={s.dialog} accessibilityViewIsModal>
    <View style={s.header}><Text role="heading" aria-level={2} style={s.title}>{label || definition.label}</Text></View>
    <ScrollView style={s.scroll} contentContainerStyle={s.fields} keyboardShouldPersistTaps="handled">
    <ProfileTextInput label={image ? 'Liên kết ảnh' : definition.label} value={value} onChangeText={next => { setValue(next); setError(''); }} autoFocus multiline={!numeric} minimumHeight={'multiline' in definition && definition.multiline ? 88 : 46} keyboardType={numeric ? 'decimal-pad' : image ? 'url' : field === 'contactEmail' ? 'email-address' : 'default'} autoCapitalize={image || field === 'contactEmail' ? 'none' : 'sentences'} maxLength={numeric ? undefined : definition.max} />
    {image && <Text style={s.hint}>Nhập liên kết ảnh HTTP hoặc HTTPS. Để trống để bỏ ảnh.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </ScrollView>
    <View style={s.actions}><Button title="Hủy" variant="outline" onPress={onClose} style={s.action} textStyle={s.actionText} /><Button title="Xác nhận" onPress={confirm} style={s.action} textStyle={s.actionText} /></View>
  </View></KeyboardAvoidingView></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, padding: 18, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center' }, dialog: { width: '100%', maxWidth: 480, maxHeight: '90%', borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' }, header: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }, scroll: { flexShrink: 1 }, fields: { padding: 20, gap: 16 }, title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary }, hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, error: { fontSize: 13, color: colors.error }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }, action: { minHeight: 38, minWidth: 80, paddingHorizontal: 16, borderRadius: 8 }, actionText: { fontSize: 13, fontWeight: '600' } });
