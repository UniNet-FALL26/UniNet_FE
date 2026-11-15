import { useState } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SpecializationSelect } from './SpecializationSelect';
import { ProjectSelectModal } from './ProjectSelectModal';
import { projectFields } from '@/constants/project-fields';
import type { SkillCatalogItem } from '@/services/skill.service';
import { externalStyles as s } from './ExternalProjectLayout';

type Props = {
  specializationId: string; onSpecialization: (id: string) => void;
  title: string; projectField: string; description: string; skillIds: string[];
  onTitle: (value: string) => void; onField: (value: string) => void; onDescription: (value: string) => void; onSkills: (value: string[]) => void;
  catalog: SkillCatalogItem[]; loading: boolean; catalogError: string | null; reloadCatalog: () => void;
  errors?: Record<string, string>; disabled?: boolean; external?: boolean; compact?: boolean;
};
export function ProjectInformationFields({ specializationId, onSpecialization, title, projectField, description, skillIds, onTitle, onField, onDescription, onSkills, catalog, loading, catalogError, reloadCatalog, errors = {}, disabled = false, external = false, compact = false }: Props) {
  const wide = useWindowDimensions().width >= 600;
  const buttonStyle = compact ? { minHeight: 40, paddingHorizontal: 12 } : undefined;
  const buttonTextStyle = compact ? { fontSize: 14 } : undefined;
  const [fieldsOpen, setFieldsOpen] = useState(false), [skillSearch, setSkillSearch] = useState('');
  const [customField, setCustomField] = useState(false);
  const other = customField || (!!projectField && !projectFields.filter(field => field !== 'Khác').includes(projectField));
  return <View style={{ gap: compact ? 18 : 16 }}>
    <Input appearance="project" compact={compact} label="Tên dự án *" value={title} onChangeText={onTitle} editable={!disabled} maxLength={external ? 255 : undefined} error={errors.title} />
    <View style={{ flexDirection: compact && wide ? 'row' : 'column', gap: 16, alignItems: 'stretch' }}>
    <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
    <Text style={s.body}>Lĩnh vực dự án *</Text>
    <Button title={other ? 'Khác' : projectField || 'Chọn lĩnh vực dự án'} style={buttonStyle} textStyle={buttonTextStyle} variant="outline" disabled={disabled} onPress={() => setFieldsOpen(value => !value)} />
    <ProjectSelectModal title="Chọn lĩnh vực dự án" visible={fieldsOpen && !disabled} value={other ? 'Khác' : projectField} options={projectFields.map(field => ({ value: field, label: field }))} onSelect={field => { setCustomField(field === 'Khác'); onField(field === 'Khác' ? '' : field); }} onClose={() => setFieldsOpen(false)} />
    {other && <Input appearance="project" compact={compact} label="Tên lĩnh vực khác *" value={projectField} onChangeText={onField} editable={!disabled} maxLength={external ? 150 : undefined} />}
    {!!errors.projectField && <Text style={s.error}>{errors.projectField}</Text>}
    </View>
    <View style={{ flex: 1, minWidth: 0 }}><SpecializationSelect compact={compact} value={specializationId} onChange={onSpecialization} disabled={disabled} error={errors.specializationId} /></View>
    </View>
    <Input appearance="project" compact={compact} autoGrow label="Mô tả dự án *" value={description} onChangeText={onDescription} multiline numberOfLines={3} textAlignVertical="top" editable={!disabled} maxLength={external ? 2000 : undefined} error={errors.description} />
    <View style={{ gap: 8 }}>
    <Text style={s.body}>Kỹ năng / công nghệ{external ? ' *' : ''}</Text>
    <Input appearance="project" compact={compact} label="Tìm trong danh mục kỹ năng" value={skillSearch} onChangeText={setSkillSearch} editable={!disabled} placeholder="Nhập tên kỹ năng để tìm kiếm" />
    {loading && <Text style={s.small}>Đang tải danh mục kỹ năng…</Text>}{catalogError && <Text style={s.error}>{catalogError}</Text>}
    {!loading && (!catalog.length || catalogError) && <Button title="Tải lại danh mục kỹ năng" style={compact ? { ...buttonStyle, alignSelf: 'flex-start' } : undefined} textStyle={buttonTextStyle} variant="outline" onPress={reloadCatalog} disabled={disabled} />}
    <View style={[s.row, compact && { gap: 6 }]}>{catalog.filter(skill => skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase()) || skillIds.includes(skill.id)).map(skill => {
      const selected = skillIds.includes(skill.id);
      return <Pressable key={skill.id} accessibilityRole="checkbox" aria-checked={selected} accessibilityLabel={skill.name} accessibilityState={{ checked: selected, disabled }} hitSlop={compact ? 3 : undefined} disabled={disabled || (external && !selected && skillIds.length >= 30)} onPress={() => onSkills(selected ? skillIds.filter(id => id !== skill.id) : [...skillIds, skill.id])} style={[s.option, selected && s.selected, s.row, compact && { paddingVertical: 4, paddingHorizontal: 8, minHeight: 28, borderRadius: 7, gap: 6 }]}>{skill.iconUrl && <Image source={{ uri: skill.iconUrl }} style={{ width: compact ? 16 : 20, height: compact ? 16 : 20 }} />}<Text style={[s.body, compact && { fontSize: 12, lineHeight: 18 }]}>{skill.name}</Text></Pressable>;
    })}</View>
    {skillIds.filter(id => !catalog.some(skill => skill.id === id)).map(id => <Button key={id} title="Bỏ kỹ năng không còn trong danh mục" variant="outline" disabled={disabled} onPress={() => onSkills(skillIds.filter(value => value !== id))} />)}
    {!!errors.skillIds && <Text style={s.error}>{errors.skillIds}</Text>}
    </View>
  </View>;
}
