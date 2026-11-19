import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { pickProjectAsset } from '@/utils/project-hub-files';
import type { HubProject } from '@/types/project-hub';
import { ProjectCard } from './ProjectCard';
import { HubAction, HubIcon, HubModal, ProjectCover, hubColors, ui } from './ProjectHubUI';
import { normalizeProjectTechnologies, technologyKey } from '@/utils/project-technologies';
import { TechnologyLogo } from './ProjectTechnologyChips';
import { AutoGrowingTextInput } from '@/components/ui/AutoGrowingTextInput';

export function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (project: HubProject) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const status = 1;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [technology, setTechnology] = useState('');
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(''), [catalogAttempt, setCatalogAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const wide = width >= 940;
  useEffect(() => {
    const abort = new AbortController();
    setCatalogLoading(true); setCatalogError('');
    skillService.getSkills(abort.signal).then(items => { if (!abort.signal.aborted) setCatalog(items); })
      .catch(() => { if (!abort.signal.aborted) setCatalogError('Chưa tải được danh sách công nghệ. Vui lòng thử lại.'); })
      .finally(() => { if (!abort.signal.aborted) setCatalogLoading(false); });
    return () => abort.abort();
  }, [catalogAttempt]);
  const close = useCallback(() => { if (!saving && !uploading) onClose(); }, [saving, uploading, onClose]);
  const addTechnology = (value: string) => {
    const item = catalog.find(item => technologyKey(item.name) === technologyKey(value));
    if (!item || saving) return;
    try { setTechnologies(normalizeProjectTechnologies([...technologies, item.name])); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa chọn được công nghệ.'); }
  };
  const upload = async () => {
    setError(''); setUploading(true);
    try { const file = await pickProjectAsset('logo'); if (file) setLogoUrl(file.url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải được ảnh dự án. Vui lòng thử lại.'); }
    finally { setUploading(false); }
  };
  const submit = async () => {
    if (!title.trim() || !description.trim()) { setError('Vui lòng nhập tên dự án và mô tả ngắn.'); return; }
    const names = technologies;
    setError(''); setSaving(true);
    try { onCreated(await projectHubService.create({ title: title.trim(), description: description.trim(), logoUrl, technologies: names, status, visibility: 1 })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tạo được dự án. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const selectedKeys = new Set(technologies.map(technologyKey));
  const options = [...new Map(catalog.map(item => [technologyKey(item.name), item])).values()].filter(item => technologyKey(item.name).includes(technologyKey(technology)));
  return <HubModal compact title="Tạo dự án mới" subtitle="Nhập thông tin cơ bản để tạo dự án. Bạn có thể bổ sung thông tin chi tiết sau." onClose={close}
    footer={<><HubAction compact title="Hủy" onPress={close} disabled={saving || uploading} /><HubAction compact title="Tạo dự án" icon="plus" variant="primary" busy={saving} disabled={uploading} onPress={() => void submit()} testID="project-create-submit" /></>}>
    <View style={[styles.layout, wide && styles.wide]}>
      <View style={styles.form}>
        <View style={styles.field}><Text style={styles.label}>Tên dự án <Text style={ui.error}>*</Text></Text><View style={styles.counted}><TextInput testID="project-create-title" accessibilityLabel="Tên dự án" placeholder="Nhập tên dự án của bạn" placeholderTextColor={hubColors.textMuted} value={title} onChangeText={setTitle} maxLength={200} style={[ui.input, styles.input, styles.countedInput]} /><Text style={styles.counter}>{title.length}/200</Text></View></View>
        <View style={styles.field}><Text style={styles.label}>Ảnh/Logo dự án</Text><View style={styles.uploadRow}>
          {logoUrl && <View style={styles.uploadPreview}><ProjectCover url={logoUrl} title={title} height={94} /><Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh dự án" onPress={() => setLogoUrl(null)} disabled={saving || uploading} style={styles.removeImage}><HubIcon name="close" size={18} color={hubColors.textSecondary} /></Pressable></View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Tải ảnh dự án lên" disabled={uploading || saving} onPress={() => void upload()} style={styles.upload}><HubIcon name="plus" size={23} /><Text style={styles.uploadTitle}>{uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên'}</Text><Text style={styles.help}>PNG, JPG (tối đa 5 MB)</Text></Pressable>
        </View></View>
        <View style={styles.field}><Text style={styles.label}>Mô tả ngắn <Text style={ui.error}>*</Text></Text><View style={styles.textareaWrap}><AutoGrowingTextInput minHeight={88} testID="project-create-description" accessibilityLabel="Mô tả ngắn" placeholder="Dự án của bạn làm gì và dành cho ai?" placeholderTextColor={hubColors.textMuted} value={description} onChangeText={setDescription} multiline maxLength={500} style={[ui.input, styles.input, styles.textarea]} /><Text style={styles.textareaCounter}>{description.length}/500</Text></View></View>
        <View style={styles.field}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Text style={styles.label}>Công nghệ sử dụng</Text><Text accessibilityLiveRegion="polite" style={[styles.help, { marginTop: 0, marginBottom: 6 }]}>Đã chọn {technologies.length}/20</Text></View>
          <View style={styles.suggestions}>
            <View style={styles.techSearch}><HubIcon name="search" size={17} /><TextInput accessibilityLabel="Tìm công nghệ" placeholder="Tìm trong danh sách công nghệ…" value={technology} onChangeText={setTechnology} editable={!saving} maxLength={80} style={{ flex: 1, minWidth: 0, paddingVertical: 10, color: hubColors.ink, fontSize: 13 }} /></View>
            {catalogLoading ? <View style={{ padding: 16 }}><ActivityIndicator color={hubColors.primary} accessibilityLabel="Đang tải công nghệ" /></View> : catalogError ? <View style={{ padding: 12, gap: 8 }}><Text accessibilityRole="alert" style={ui.error}>{catalogError}</Text><HubAction compact title="Tải lại danh sách công nghệ" disabled={saving} onPress={() => setCatalogAttempt(value => value + 1)} /></View> : <View role="group" accessibilityLabel="Danh sách công nghệ" style={styles.technologyOptions}>{options.map(item => {
              const checked = selectedKeys.has(technologyKey(item.name)), disabled = saving || !checked && technologies.length >= 20;
              return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={() => checked ? setTechnologies(values => values.filter(name => technologyKey(name) !== technologyKey(item.name))) : addTechnology(item.name)} style={[styles.suggestion, checked && { backgroundColor: hubColors.blueWash, borderColor: '#9FBFFF' }, disabled && { opacity: 0.5 }]}><TechnologyLogo name={item.name} iconUrl={item.iconUrl} /><Text style={{ flexShrink: 1, minWidth: 0, fontSize: 12, color: checked ? hubColors.primary : hubColors.ink }}>{item.name}</Text></Pressable>;
            })}{!options.length && <Text style={styles.help}>{technology.trim() ? 'Không có công nghệ phù hợp trong danh sách.' : 'Danh sách công nghệ hiện chưa có dữ liệu.'}</Text>}</View>}
          </View>
          <Text style={styles.help}>Bấm vào công nghệ để chọn hoặc bỏ chọn. Tối đa 20 mục.</Text>
        </View>
        {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 16 }]}>{error}</Text>}
      </View>
      <View style={[styles.preview, wide && styles.previewWide]}><Text accessibilityRole="header" aria-level={3} style={styles.previewTitle}>Xem trước</Text><Text style={[styles.help, { marginTop: 5, marginBottom: 16 }]}>Dự án sẽ hiển thị như bên dưới trong danh sách và hồ sơ.</Text><ProjectCard title={title.trim() || 'Tên dự án của bạn'} description={description.trim() || 'Mô tả ngắn giúp mọi người hiểu hơn về ý tưởng và mục tiêu của dự án.'} coverUrl={logoUrl} technologies={technologies} width="100%" /><View style={styles.privacy}><HubIcon name="info" size={15} /><Text style={[styles.help, { flex: 1, marginTop: 0 }]}>Sau khi tạo, bạn có thể bổ sung thông tin chi tiết và mời bạn bè tham gia.</Text></View></View>
    </View>
  </HubModal>;
}
const styles = StyleSheet.create({
  layout: { gap: 20 }, wide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 }, form: { flex: 1, minWidth: 0 }, preview: { minWidth: 0 }, previewWide: { flexShrink: 0, width: 280, borderLeftWidth: 1, borderColor: hubColors.line, paddingLeft: 20, alignSelf: 'stretch' },
  field: { marginBottom: 16 }, label: { color: hubColors.ink, fontWeight: '600', fontSize: 13, marginBottom: 6 }, input: { minHeight: 40, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, borderRadius: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, minHeight: 36, borderWidth: 1, borderColor: hubColors.line, borderRadius: 8 }, selected: { borderColor: hubColors.primary, backgroundColor: '#F2F6FF' }, choiceText: { fontSize: 12, fontWeight: '500', color: hubColors.textSecondary }, help: { fontSize: 11, lineHeight: 17, color: hubColors.textSecondary, marginTop: 6 },
  counted: { position: 'relative' }, countedInput: { paddingRight: 65 }, counter: { position: 'absolute', right: 11, top: 12, fontSize: 11, color: hubColors.textSecondary }, uploadRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, uploadPreview: { width: 156, position: 'relative' }, removeImage: { position: 'absolute', right: 6, top: 6, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 5 }, upload: { minHeight: 94, width: 156, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9FBFFF', borderRadius: 10, backgroundColor: '#F9FBFF', alignItems: 'center', justifyContent: 'center', padding: 10 }, uploadTitle: { fontSize: 13, color: hubColors.primary, marginTop: 5 },
  textareaWrap: { position: 'relative' }, textarea: { minHeight: 88, textAlignVertical: 'top', paddingBottom: 25, lineHeight: 20 }, textareaCounter: { position: 'absolute', right: 11, bottom: 9, color: hubColors.textSecondary, fontSize: 11 },
  techSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderBottomWidth: 1, borderColor: hubColors.line }, suggestions: { borderWidth: 1, borderColor: hubColors.line, borderRadius: 8, overflow: 'hidden' }, technologyOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%', borderWidth: 1, borderColor: hubColors.line, borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8, minHeight: 36 },
  previewTitle: { fontSize: 17, fontWeight: '700', color: hubColors.ink }, privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 14 },
});
