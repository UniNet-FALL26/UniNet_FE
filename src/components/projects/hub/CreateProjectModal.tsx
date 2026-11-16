import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { pickProjectAsset } from '@/utils/project-hub-files';
import type { HubProject } from '@/types/project-hub';
import { ProjectCard } from './ProjectCard';
import { HubAction, HubIcon, HubModal, ProjectCover, hubColors, ui } from './ProjectHubUI';

export function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (project: HubProject) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState<0 | 1>(1);
  const status = origin === 1 ? 2 : 1;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [technology, setTechnology] = useState('');
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const wide = width >= 940;
  useEffect(() => {
    const abort = new AbortController();
    skillService.getSkills(abort.signal).then(setCatalog).catch(() => {});
    return () => abort.abort();
  }, []);
  const close = useCallback(() => { if (!saving && !uploading) onClose(); }, [saving, uploading, onClose]);
  const addTechnology = (value: string) => {
    const name = value.trim();
    if (!name) return;
    if (name.length > 80) { setError('Tên công nghệ tối đa 80 ký tự.'); return; }
    if (technologies.length >= 20) { setError('Mỗi dự án có tối đa 20 công nghệ.'); return; }
    if (!technologies.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) setTechnologies(items => [...items, name]);
    setTechnology('');
  };
  const upload = async () => {
    setError(''); setUploading(true);
    try { const file = await pickProjectAsset('logo'); if (file) setLogoUrl(file.url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải được ảnh dự án. Vui lòng thử lại.'); }
    finally { setUploading(false); }
  };
  const submit = async () => {
    if (!title.trim() || !description.trim()) { setError('Vui lòng nhập tên dự án và mô tả ngắn.'); return; }
    const names = technology.trim() && !technologies.some(t => t.toLowerCase() === technology.trim().toLowerCase()) ? [...technologies, technology.trim()] : technologies;
    if (names.length > 20 || names.some(t => t.length > 80)) { setError('Chọn tối đa 20 công nghệ, mỗi tên tối đa 80 ký tự.'); return; }
    setError(''); setSaving(true);
    try { onCreated(await projectHubService.create({ title: title.trim(), description: description.trim(), logoUrl, technologies: names, origin, status, visibility: 0 })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tạo được dự án. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const suggestions = technology.trim() ? catalog.filter(item => item.name.toLowerCase().includes(technology.toLowerCase()) && !technologies.includes(item.name)).slice(0, 6) : [];
  return <HubModal compact title="Tạo dự án mới" subtitle="Nhập thông tin cơ bản để tạo dự án. Bạn có thể bổ sung thông tin chi tiết sau." onClose={close}
    footer={<><HubAction compact title="Hủy" onPress={close} disabled={saving || uploading} /><HubAction compact title="Tạo dự án" icon="plus" variant="primary" busy={saving} disabled={uploading} onPress={() => void submit()} testID="project-create-submit" /></>}>
    <View style={[styles.layout, wide && styles.wide]}>
      <View style={styles.form}>
        <View style={styles.field}><Text style={styles.label}>Loại dự án</Text><View role="radiogroup" aria-label="Loại dự án" style={styles.choices}>
          {([{ value: 0, title: 'Tạo mới', icon: 'folder' }, { value: 1, title: 'Có sẵn', icon: 'external' }] as const).map(option => <Pressable key={option.value} role="radio" aria-label={option.title} aria-checked={origin === option.value} onPress={() => setOrigin(option.value)} style={[styles.choice, origin === option.value && styles.selected]}><HubIcon name={option.icon} size={16} color={origin === option.value ? hubColors.primary : hubColors.textSecondary} /><Text style={[styles.choiceText, origin === option.value && { color: hubColors.primary }]}>{option.title}</Text></Pressable>)}
        </View><Text style={styles.help}>{origin === 1 ? 'Thêm dự án đã có vào hồ sơ của bạn.' : 'Bắt đầu dự án mới trên UniNet.'}</Text></View>
        <View style={styles.field}><Text style={styles.label}>Tên dự án <Text style={ui.error}>*</Text></Text><View style={styles.counted}><TextInput testID="project-create-title" accessibilityLabel="Tên dự án" placeholder="Nhập tên dự án của bạn" placeholderTextColor={hubColors.textMuted} value={title} onChangeText={setTitle} maxLength={200} style={[ui.input, styles.input, styles.countedInput]} /><Text style={styles.counter}>{title.length}/200</Text></View></View>
        <View style={styles.field}><Text style={styles.label}>Ảnh/Logo dự án</Text><View style={styles.uploadRow}>
          {logoUrl && <View style={styles.uploadPreview}><ProjectCover url={logoUrl} title={title} height={94} /><Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh dự án" onPress={() => setLogoUrl(null)} disabled={saving || uploading} style={styles.removeImage}><HubIcon name="close" size={18} color={hubColors.textSecondary} /></Pressable></View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Tải ảnh dự án lên" disabled={uploading || saving} onPress={() => void upload()} style={styles.upload}><HubIcon name="plus" size={23} /><Text style={styles.uploadTitle}>{uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên'}</Text><Text style={styles.help}>PNG, JPG (tối đa 5 MB)</Text></Pressable>
        </View></View>
        <View style={styles.field}><Text style={styles.label}>Mô tả ngắn <Text style={ui.error}>*</Text></Text><View style={styles.textareaWrap}><TextInput testID="project-create-description" accessibilityLabel="Mô tả ngắn" placeholder="Dự án của bạn làm gì và dành cho ai?" placeholderTextColor={hubColors.textMuted} value={description} onChangeText={setDescription} multiline maxLength={500} style={[ui.input, styles.input, styles.textarea]} /><Text style={styles.textareaCounter}>{description.length}/500</Text></View></View>
        <View style={styles.field}><Text style={styles.label}>Công nghệ sử dụng</Text><View style={styles.techEntry}><TextInput accessibilityLabel="Chọn hoặc nhập công nghệ" placeholder="Chọn hoặc nhập công nghệ" placeholderTextColor={hubColors.textMuted} value={technology} onChangeText={setTechnology} onSubmitEditing={() => addTechnology(technology)} maxLength={80} style={[ui.input, styles.input, { flex: 1 }]} returnKeyType="done" /><Pressable accessibilityRole="button" accessibilityLabel="Thêm công nghệ" onPress={() => addTechnology(technology)} style={styles.techAdd}><HubIcon name="plus" /></Pressable></View>
          {suggestions.length > 0 && <View style={styles.suggestions}>{suggestions.map(item => <Pressable key={item.id} onPress={() => addTechnology(item.name)} accessibilityRole="button" style={styles.suggestion}><Text style={styles.help}>{item.name}</Text></Pressable>)}</View>}
          <View style={[ui.tags, { marginTop: 10 }]}>{technologies.map(name => <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ công nghệ ${name}`} key={name} onPress={() => setTechnologies(items => items.filter(item => item !== name))} style={[ui.tag, styles.techChip]}><Text style={[ui.tagText, { fontSize: 12 }]}>{name}</Text><HubIcon name="close" size={13} /></Pressable>)}</View>
          <Text style={styles.help}>Nhấn Enter hoặc dấu + để thêm công nghệ.</Text>
        </View>
        {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 16 }]}>{error}</Text>}
      </View>
      <View style={[styles.preview, wide && styles.previewWide]}><Text accessibilityRole="header" aria-level={3} style={styles.previewTitle}>Xem trước</Text><Text style={[styles.help, { marginTop: 5, marginBottom: 16 }]}>Dự án sẽ hiển thị như bên dưới trong danh sách và hồ sơ.</Text><ProjectCard title={title.trim() || 'Tên dự án của bạn'} description={description.trim() || 'Mô tả ngắn giúp mọi người hiểu hơn về ý tưởng và mục tiêu của dự án.'} coverUrl={logoUrl} technologies={technologies} width="100%" /><View style={styles.privacy}><HubIcon name="info" size={15} /><Text style={[styles.help, { flex: 1, marginTop: 0 }]}>Dự án mới ở chế độ riêng tư. Bạn có thể thay đổi khi chỉnh sửa.</Text></View></View>
    </View>
  </HubModal>;
}
const styles = StyleSheet.create({
  layout: { gap: 20 }, wide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 }, form: { flex: 1, minWidth: 0 }, preview: { minWidth: 0 }, previewWide: { flexShrink: 0, width: 280, borderLeftWidth: 1, borderColor: hubColors.line, paddingLeft: 20, alignSelf: 'stretch' },
  field: { marginBottom: 16 }, label: { color: hubColors.ink, fontWeight: '600', fontSize: 13, marginBottom: 6 }, input: { minHeight: 40, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, borderRadius: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, minHeight: 36, borderWidth: 1, borderColor: hubColors.line, borderRadius: 8 }, selected: { borderColor: hubColors.primary, backgroundColor: '#F2F6FF' }, choiceText: { fontSize: 12, fontWeight: '500', color: hubColors.textSecondary }, help: { fontSize: 11, lineHeight: 17, color: hubColors.textSecondary, marginTop: 6 },
  counted: { position: 'relative' }, countedInput: { paddingRight: 65 }, counter: { position: 'absolute', right: 11, top: 12, fontSize: 11, color: hubColors.textSecondary }, uploadRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, uploadPreview: { width: 156, position: 'relative' }, removeImage: { position: 'absolute', right: 6, top: 6, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 5 }, upload: { minHeight: 94, width: 156, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9FBFFF', borderRadius: 10, backgroundColor: '#F9FBFF', alignItems: 'center', justifyContent: 'center', padding: 10 }, uploadTitle: { fontSize: 13, color: hubColors.primary, marginTop: 5 },
  textareaWrap: { position: 'relative' }, textarea: { minHeight: 88, textAlignVertical: 'top', paddingBottom: 25, lineHeight: 20 }, textareaCounter: { position: 'absolute', right: 11, bottom: 9, color: hubColors.textSecondary, fontSize: 11 },
  techEntry: { flexDirection: 'row', gap: 8 }, techAdd: { width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: hubColors.line, backgroundColor: '#F6F9FF' }, techChip: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4 }, suggestions: { borderWidth: 1, borderColor: hubColors.line, borderRadius: 8, marginTop: 5, overflow: 'hidden' }, suggestion: { paddingHorizontal: 11, paddingVertical: 7 },
  previewTitle: { fontSize: 17, fontWeight: '700', color: hubColors.ink }, privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 14 },
});
