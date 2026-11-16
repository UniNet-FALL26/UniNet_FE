import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import type { SkillCatalogItem } from '@/services/skill.service';
import { projectHubService } from '@/services/project-hub.service';
import { normalizeProjectTechnologies, technologyKey } from '@/utils/project-technologies';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { TechnologyLogo } from './ProjectTechnologyChips';

export function ProjectTechnologiesModal({ project, catalog, onSaved, onClose }: { project: HubProject; catalog: SkillCatalogItem[]; onSaved: (project: HubProject) => void; onClose: () => void }) {
  const [selected, setSelected] = useState([...project.technologies]), [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const close = () => { if (!locked.current) onClose(); };
  const selectedKeys = new Set(selected.map(technologyKey));
  const customSelected = selected.filter(name => !catalog.some(item => technologyKey(item.name) === technologyKey(name))).map(name => ({ id: `custom-${name}`, name, iconUrl: null }));
  const options = [...catalog, ...customSelected].filter(item => technologyKey(item.name).includes(technologyKey(query)));
  const custom = query.trim() && !catalog.some(item => technologyKey(item.name) === technologyKey(query)) && !selectedKeys.has(technologyKey(query));
  function add(name: string) {
    try { setSelected(normalizeProjectTechnologies([...selected, name])); setQuery(''); setError(''); }
    catch (cause) { setError(messageOf(cause)); }
  }
  async function save() {
    if (locked.current) return;
    let technologies: string[];
    try { technologies = normalizeProjectTechnologies(selected); } catch (cause) { setError(messageOf(cause)); return; }
    locked.current = true; setBusy(true); setError('');
    try { onSaved(await projectHubService.update(project.id, { technologies })); onClose(); }
    catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <HubModal compact wide={false} icon="layers" title="Chỉnh sửa công nghệ sử dụng" onClose={close}
    footer={<><HubAction compact title="Hủy" onPress={close} disabled={busy} /><HubAction compact title="Lưu thay đổi" variant="primary" onPress={() => void save()} busy={busy} /></>}>
    <View style={styles.search}><HubIcon name="search" size={17} /><TextInput accessibilityLabel="Tìm hoặc nhập công nghệ" placeholder="Tìm hoặc nhập công nghệ" value={query} onChangeText={setQuery} editable={!busy} maxLength={80} style={styles.input} /></View>
    {!!custom && <HubAction compact title={`Thêm “${query.trim()}”`} icon="plus" onPress={() => add(query)} disabled={busy} />}
    <View style={styles.options}>{options.map(item => {
      const checked = selectedKeys.has(technologyKey(item.name));
      return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} aria-checked={checked} accessibilityState={{ checked, disabled: busy }} disabled={busy} onPress={() => checked ? setSelected(selected.filter(name => technologyKey(name) !== technologyKey(item.name))) : add(item.name)} style={[styles.option, checked && { backgroundColor: c.blueWash }]}>
        <TechnologyLogo name={item.name} iconUrl={item.iconUrl} /><Text style={styles.optionText}>{item.name}</Text>
      </Pressable>;
    })}</View>
    {!options.length && !custom && <Text style={styles.hint}>Không có công nghệ phù hợp.</Text>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
const styles = StyleSheet.create({ hint: { fontSize: 12, lineHeight: 19, color: c.textSecondary }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 10, marginTop: 0, marginBottom: 10 }, input: { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 13, color: c.ink }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }, option: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, borderWidth: 1, borderColor: c.line, borderRadius: 8, backgroundColor: '#FFFFFF', maxWidth: '100%' }, optionText: { color: c.ink, fontSize: 12, flexShrink: 1 } });
