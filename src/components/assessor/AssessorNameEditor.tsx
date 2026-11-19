import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { ProfileTextInput } from '@/components/profile/ProfileTextInput';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { assessorStyles as shared } from './assessor-ui';

type Props = { fullName: string; onSave: (name: string, signal: AbortSignal) => Promise<void>; onClose: () => void };
export function AssessorNameEditor({ fullName, onSave, onClose }: Props) {
  const [name, setName] = useState(fullName), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const close = () => { if (!pending.current) onClose(); };
  const save = async () => {
    if (pending.current) return;
    if (!name.trim() || name.trim().length > 255) { setError('Họ tên phải có từ 1 đến 255 ký tự.'); return; }
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await onSave(name.trim(), controller.signal); if (!controller.signal.aborted) onClose(); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa lưu được họ tên.'); }
    finally { pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel="Chỉnh sửa họ tên" style={s.dialog}>
        <Text role="heading" style={shared.sectionTitle}>Chỉnh sửa họ tên</Text>
        <ProfileTextInput label="Họ và tên" autoFocus maxLength={255} editable={!busy} value={name} onChangeText={setName} />
        {!!error && <Text accessibilityRole="alert" style={shared.error}>{error}</Text>}
        <View style={s.actions}><Button title="Hủy" variant="outline" disabled={busy} onPress={close} style={s.cancelAction} textStyle={s.cancelLabel} /><Button title="Lưu họ tên" loading={busy} onPress={() => void save()} style={s.saveAction} textStyle={s.actionLabel} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.4)', alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 20 },
  field: { gap: 8 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 4 },
  cancelAction: { minHeight: 38, minWidth: 72, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.background, borderColor: colors.border },
  saveAction: { minHeight: 38, minWidth: 108, paddingHorizontal: 16, borderRadius: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600' }, cancelLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
});
