import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AutoGrowingTextInput } from '@/components/ui/AutoGrowingTextInput';
import type { HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubModal, hubColors as c, ui } from './ProjectHubUI';

export function ProjectSummaryModal({ project, onSaved, onClose }: { project: HubProject; onSaved: (project: HubProject) => void; onClose: () => void }) {
  const [title, setTitle] = useState(project.title), [description, setDescription] = useState(project.description);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const close = () => { if (!locked.current) onClose(); };
  async function save() {
    if (locked.current) return;
    if (!title.trim() || !description.trim()) { setError('Vui lòng nhập tên dự án và giới thiệu ngắn.'); return; }
    if (title.trim().length > 200 || description.trim().length > 500) { setError('Tên dự án tối đa 200 ký tự, giới thiệu ngắn tối đa 500 ký tự.'); return; }
    locked.current = true; setBusy(true); setError('');
    try {
      const saved = await projectHubService.update(project.id, { title: title.trim(), description: description.trim() });
      onSaved(saved); onClose();
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <HubModal compact wide={false} title="Chỉnh sửa thông tin dự án" onClose={close}
    footer={<><HubAction compact title="Hủy" onPress={close} disabled={busy} /><HubAction compact title="Lưu thay đổi" variant="primary" onPress={() => void save()} busy={busy} testID="project-summary-save" /></>}>
    <View style={styles.field}><View style={styles.labelRow}><Text style={styles.label}>Tên dự án <Text style={ui.error}>*</Text></Text><Text style={styles.counter}>{title.length}/200</Text></View><TextInput accessibilityLabel="Tên dự án" value={title} onChangeText={setTitle} maxLength={200} editable={!busy} style={[ui.input, styles.input]} /></View>
    <View style={styles.field}><View style={styles.labelRow}><Text style={styles.label}>Giới thiệu ngắn <Text style={ui.error}>*</Text></Text><Text style={styles.counter}>{description.length}/500</Text></View><AutoGrowingTextInput minHeight={64} accessibilityLabel="Giới thiệu ngắn" value={description} onChangeText={setDescription} maxLength={500} multiline editable={!busy} textAlignVertical="top" style={[ui.input, styles.input, styles.description]} /></View>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
const styles = StyleSheet.create({ field: { marginBottom: 16 }, labelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 6 }, label: { color: c.ink, fontSize: 13, fontWeight: '600' }, counter: { color: c.textSecondary, fontSize: 11 }, input: { minHeight: 40, paddingVertical: 9, paddingHorizontal: 11, fontSize: 13, borderRadius: 8 }, description: { lineHeight: 20 } });
