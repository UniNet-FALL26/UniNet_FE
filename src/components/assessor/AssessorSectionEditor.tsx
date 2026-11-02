import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { assessorProfileSections, type AssessorProfileSection, type AssessorProfileSectionValues } from '@/constants/assessor-profile-sections';
import type { AssessorProfile } from '@/services/assessor-profile.service';
import { assessorStyles as shared } from './assessor-ui';

type Props = { section: AssessorProfileSection; profile: AssessorProfile; onSave: (values: AssessorProfileSectionValues, signal: AbortSignal) => Promise<void>; onClose: () => void };
export function AssessorSectionEditor({ section, profile, onSave, onClose }: Props) {
  const config = assessorProfileSections[section];
  const [draft, setDraft] = useState<AssessorProfileSectionValues>(() => Object.fromEntries(config.fields.map(([key]) => {
    if (key === 'expertise') return [key, (profile.assessorJson?.expertise ?? (profile.assessorJson === undefined && profile.major ? [profile.major] : [])).join(', ')];
    if (key === 'yearsOfExperience') return [key, String(profile.assessorJson?.yearsOfExperience ?? 0)];
    if (key === 'university' && profile.assessorJson === undefined) return [key, profile.universityName ?? ''];
    return [key, String((key in profile ? profile[key as keyof AssessorProfile] : profile.assessorJson?.[key as keyof NonNullable<AssessorProfile['assessorJson']>]) ?? '')];
  })));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmClear, setConfirmClear] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const close = () => { if (!pending.current) onClose(); };
  const submit = async (clear = false) => {
    if (pending.current) return;
    if (!clear && section === 'work' && (!/^\d+$/.test(draft.yearsOfExperience) || Number(draft.yearsOfExperience) > 80)) { setError('Số năm kinh nghiệm phải là số nguyên từ 0 đến 80.'); return; }
    const values = clear ? Object.fromEntries(config.fields.map(([key]) => [key, key === 'yearsOfExperience' ? '0' : ''])) : draft;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await onSave(values, controller.signal); if (!controller.signal.aborted) onClose(); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa lưu được thông tin.'); }
    finally { pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={`Chỉnh sửa ${config.title}`} style={s.dialog}>
        <View style={s.header}><Text role="heading" style={shared.sectionTitle}>{config.title}</Text><Text style={shared.muted}>Cập nhật thông tin trong phần này.</Text></View>
        <ScrollView style={s.scroll} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {!!error && <Text accessibilityRole="alert" style={shared.error}>{error}</Text>}
          {config.fields.map(([key, label, limit], index) => <View key={key} style={s.field}>
            <Text style={shared.label}>{label}</Text>
            <TextInput accessibilityLabel={label} autoFocus={index === 0} value={draft[key]} onChangeText={value => setDraft(current => ({ ...current, [key]: value }))}
              editable={!busy} maxLength={limit} multiline={key === 'bio' || key === 'expertise'}
              keyboardType={key === 'yearsOfExperience' ? 'number-pad' : key === 'phone' ? 'phone-pad' : key === 'contactEmail' ? 'email-address' : 'default'}
              autoCapitalize={section === 'links' || key === 'contactEmail' ? 'none' : 'sentences'} style={[shared.input, key === 'bio' && s.multiline]} />
            {key === 'expertise' && <Text style={shared.muted}>Phân cách các lĩnh vực bằng dấu phẩy.</Text>}
            {section === 'links' && <Text style={shared.muted}>Nhập liên kết bắt đầu bằng https:// hoặc http://.</Text>}
          </View>)}
          {confirmClear ? <View style={s.clearConfirm}><Text style={shared.body}>Xóa thông tin trong phần {config.title}? Các phần khác được giữ lại.</Text><Button title="Xác nhận xóa" variant="outline" disabled={busy} onPress={() => void submit(true)} style={s.compact} textStyle={s.label} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmClear(false)} style={s.keep}><Text style={shared.link}>Giữ lại thông tin</Text></Pressable></View>
            : <Pressable accessibilityRole="button" accessibilityLabel={`Xóa thông tin ${config.title}`} disabled={busy} onPress={() => setConfirmClear(true)} style={s.clear}><Text style={s.clearLabel}>Xóa thông tin phần này</Text></Pressable>}
        </ScrollView>
        <View style={s.footer}><Button title="Hủy" variant="outline" disabled={busy} onPress={close} style={s.compact} textStyle={s.label} /><Button title="Lưu thay đổi" loading={busy} onPress={() => void submit()} style={s.compact} textStyle={s.label} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, padding: 16, backgroundColor: 'rgba(16,40,75,0.4)', alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface },
  header: { padding: 20, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border }, scroll: { flexShrink: 1 }, form: { padding: 20, gap: 16 },
  field: { gap: 8 }, multiline: { minHeight: 120, textAlignVertical: 'top' },
  footer: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  compact: { minHeight: 38, paddingHorizontal: 16, borderRadius: 8 }, label: { fontSize: 13, fontWeight: '600' },
  clear: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }, clearLabel: { fontSize: 12, color: colors.error },
  clearConfirm: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }, keep: { alignItems: 'center', minHeight: 40, justifyContent: 'center' },
});
