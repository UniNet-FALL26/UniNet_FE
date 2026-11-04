import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { projectFields } from '@/constants/project-fields';
import type { SkillCatalogItem } from '@/services/skill.service';
import { externalStyles as s } from './ExternalProjectLayout';

type Props = {
  title: string; projectField: string; description: string; skillIds: string[];
  onTitle: (value: string) => void; onField: (value: string) => void; onDescription: (value: string) => void; onSkills: (value: string[]) => void;
  catalog: SkillCatalogItem[]; loading: boolean; catalogError: string | null; reloadCatalog: () => void;
  errors?: Record<string, string>; disabled?: boolean; external?: boolean;
};
export function ProjectInformationFields({ title, projectField, description, skillIds, onTitle, onField, onDescription, onSkills, catalog, loading, catalogError, reloadCatalog, errors = {}, disabled = false, external = false }: Props) {
  const [fieldsOpen, setFieldsOpen] = useState(false), [skillSearch, setSkillSearch] = useState('');
  const [customField, setCustomField] = useState(false);
  const other = customField || (!!projectField && !projectFields.filter(field => field !== 'Khác').includes(projectField));
  return <>
    <Input appearance="project" label="Tên dự án *" value={title} onChangeText={onTitle} editable={!disabled} maxLength={external ? 255 : undefined} error={errors.title} />
    <Text style={s.body}>Lĩnh vực dự án *</Text>
    <Button title={other ? 'Khác' : projectField || 'Chọn lĩnh vực dự án'} variant="outline" disabled={disabled} onPress={() => setFieldsOpen(value => !value)} />
    {fieldsOpen && <View style={s.row}>{projectFields.map(field => <Button key={field} title={field} variant="outline" disabled={disabled} onPress={() => { setCustomField(field === 'Khác'); onField(field === 'Khác' ? '' : field); setFieldsOpen(false); }} />)}</View>}
    {other && <Input appearance="project" label="Tên lĩnh vực khác *" value={projectField} onChangeText={onField} editable={!disabled} maxLength={external ? 150 : undefined} />}
    {!!errors.projectField && <Text style={s.error}>{errors.projectField}</Text>}
    <Input appearance="project" label="Mô tả dự án *" value={description} onChangeText={onDescription} multiline numberOfLines={6} textAlignVertical="top" style={{ minHeight: 130 }} editable={!disabled} maxLength={external ? 2000 : undefined} error={errors.description} />
    <Text style={s.body}>Kỹ năng / công nghệ{external ? ' *' : ''}</Text>
    <Input appearance="project" label="Tìm trong danh mục kỹ năng" value={skillSearch} onChangeText={setSkillSearch} editable={!disabled} placeholder="Nhập tên kỹ năng để tìm kiếm" />
    {loading && <Text style={s.small}>Đang tải danh mục kỹ năng…</Text>}{catalogError && <Text style={s.error}>{catalogError}</Text>}
    {!loading && (!catalog.length || catalogError) && <Button title="Tải lại danh mục kỹ năng" variant="outline" onPress={reloadCatalog} disabled={disabled} />}
    <View style={s.row}>{catalog.filter(skill => skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase()) || skillIds.includes(skill.id)).map(skill => {
      const selected = skillIds.includes(skill.id);
      return <Pressable key={skill.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled }} disabled={disabled || (external && !selected && skillIds.length >= 30)} onPress={() => onSkills(selected ? skillIds.filter(id => id !== skill.id) : [...skillIds, skill.id])} style={[s.option, selected && s.selected, s.row]}>{skill.iconUrl && <Image source={{ uri: skill.iconUrl }} style={{ width: 20, height: 20 }} />}<Text style={s.body}>{selected ? '✓ ' : ''}{skill.name}</Text></Pressable>;
    })}</View>
    {skillIds.filter(id => !catalog.some(skill => skill.id === id)).map(id => <Button key={id} title="Bỏ kỹ năng không còn trong danh mục" variant="outline" disabled={disabled} onPress={() => onSkills(skillIds.filter(value => value !== id))} />)}
    {!!errors.skillIds && <Text style={s.error}>{errors.skillIds}</Text>}
  </>;
}
