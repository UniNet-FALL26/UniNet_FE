import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { getProjectLinkType, normalizeProjectLinks } from '@/utils/project-links';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { ProjectLinkTypePicker } from './ProjectLinkTypePicker';

export function ProjectLinksModal({ project, onSaved, onClose }: { project: HubProject; onSaved: (project: HubProject) => void; onClose: () => void }) {
  const stacked = useWindowDimensions().width < 520;
  const nextId = useRef(project.details.links.length);
  const [links, setLinks] = useState(() => project.details.links.length
    ? project.details.links.map((link, id) => ({ ...link, label: getProjectLinkType(link.label).label, id }))
    : [{ id: nextId.current++, label: '', url: '' }]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const close = () => { if (!locked.current) onClose(); };
  function change(id: number, field: 'label' | 'url', value: string) {
    setLinks(current => current.map(link => link.id === id ? { ...link, [field]: value } : link));
    setError('');
  }
  async function save() {
    if (locked.current || !project.isOwner) return;
    let normalized;
    try { normalized = normalizeProjectLinks(links); }
    catch (cause) { setError(messageOf(cause)); return; }
    locked.current = true; setBusy(true); setError('');
    try {
      onSaved(await projectHubService.update(project.id, { details: { ...project.details, links: normalized } }));
      onClose();
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <HubModal compact wide={false} icon="link" title="Chỉnh sửa liên kết dự án" subtitle="Thêm GitHub, website, bản demo hoặc tài liệu của dự án. Tối đa 30 liên kết." onClose={close}
    footer={<><HubAction compact title="Hủy" onPress={close} disabled={busy} /><HubAction compact title="Lưu thay đổi" icon="save" variant="primary" onPress={() => void save()} busy={busy} /></>}>
    {links.map((link, index) => <View key={link.id} style={styles.row}>
      <View style={styles.heading}><Text style={styles.badge}>Liên kết {index + 1}</Text><HubAction compact title={`Xóa liên kết ${index + 1}`} icon="trash" variant="danger" style={styles.remove} disabled={busy} onPress={() => { setLinks(current => current.filter(item => item.id !== link.id)); setError(''); }} /></View>
      <View style={[styles.field, stacked && styles.stacked]}><View style={styles.labelRow}><HubIcon name="tag" color="#627293" size={17} /><Text style={styles.label}>Loại liên kết</Text></View>
        <ProjectLinkTypePicker value={link.label} onChange={value => change(link.id, 'label', value)} index={index + 1} disabled={busy} />
      </View>
      <View style={[styles.field, stacked && styles.stacked]}><View style={styles.labelRow}><HubIcon name="link" color="#627293" size={17} /><Text style={styles.label}>Địa chỉ URL</Text></View>
        <TextInput accessibilityLabel={`Địa chỉ URL ${index + 1}`} placeholder="https://github.com/..." value={link.url} onChangeText={value => change(link.id, 'url', value)} maxLength={2048} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy} style={[ui.input, styles.input, stacked && styles.stackedInput]} />
      </View>
    </View>)}
    <HubAction compact title="Thêm liên kết" icon="plus" variant="quiet" style={styles.add} disabled={busy || links.length >= 30} onPress={() => { const id = nextId.current++; setLinks(current => [...current, { id, label: '', url: '' }]); setError(''); }} />
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
const styles = StyleSheet.create({
  row: { gap: 10, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: '#CBD7FA', borderRadius: 14, backgroundColor: '#F5F7FF', experimental_backgroundImage: 'linear-gradient(115deg, #F9FAFF, #F2F5FF)', boxShadow: '0 3px 7px rgba(51, 80, 155, 0.04)' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  badge: { color: '#1640C8', backgroundColor: '#DDE6FF', borderRadius: 15, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6, fontSize: 13, fontWeight: '700' },
  remove: { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 0, minHeight: 32 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 34, gap: 10, width: 116 },
  label: { color: c.ink, fontSize: 12, fontWeight: '600' },
  input: { flex: 1, minWidth: 0, minHeight: 34, paddingVertical: 7, paddingHorizontal: 11, fontSize: 12, borderRadius: 9, borderColor: '#D1DBF2', backgroundColor: '#FFFFFF' },
  stackedInput: { flex: 0, width: '100%' },
  add: { minHeight: 42, borderWidth: 1, borderStyle: 'dashed', borderColor: '#6D91FF', borderRadius: 12, backgroundColor: '#F7F9FF', marginTop: 2, marginBottom: 8 },
});
