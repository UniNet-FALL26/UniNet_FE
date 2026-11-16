import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { HubFile, HubLink, HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { pickProjectAsset } from '@/utils/project-hub-files';
import { HubAction, HubIcon, HubModal, ProjectCover, hubColors as c, ui } from './ProjectHubUI';
import { Choice, Field, FormSection, lines, messageOf, openProjectUrl, safeUrl, technologies, validDate } from './ProjectHubFields';

export function EditProjectModal({ project, onSaved, onClose }: { project: HubProject; onSaved: (value: HubProject) => void; onClose: () => void }) {
  const [title, setTitle] = useState(project.title), [description, setDescription] = useState(project.description);
  const [logoUrl, setLogoUrl] = useState(project.logoUrl), [tech, setTech] = useState(project.technologies.join(', '));
  const [status, setStatus] = useState(project.status), [visibility, setVisibility] = useState(project.visibility);
  const [intro, setIntro] = useState(project.details.description ?? ''), [features, setFeatures] = useState(project.details.features.join('\n'));
  const results = project.details.results;
  const [problem, setProblem] = useState(results.problem ?? ''), [solution, setSolution] = useState(results.solution ?? '');
  const [objectives, setObjectives] = useState((results.objectives ?? []).join('\n')), [achievements, setAchievements] = useState((results.achievements ?? []).join('\n'));
  const [product, setProduct] = useState(results.expectedProduct ?? ''), [value, setValue] = useState(results.expectedValue ?? ''), [growth, setGrowth] = useState(results.expectedGrowth ?? '');
  const [start, setStart] = useState(project.details.startDate ?? ''), [end, setEnd] = useState(project.details.endDate ?? '');
  const [documents, setDocuments] = useState(project.details.documents), [media, setMedia] = useState(project.details.media), [links, setLinks] = useState(project.details.links);
  const [linkLabel, setLinkLabel] = useState(''), [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [tab, setTab] = useState<'general' | 'content' | 'files'>('general');
  const narrow = useWindowDimensions().width < 760;
  async function upload(kind: 'logo' | 'media' | 'document') {
    setError(''); setUploading(true);
    try { const file = await pickProjectAsset(kind); if (!file) return; if (kind === 'logo') setLogoUrl(file.url); else if (kind === 'media') setMedia(old => [...old, file]); else setDocuments(old => [...old, file]); }
    catch (cause) { setError(messageOf(cause)); } finally { setUploading(false); }
  }
  async function save() {
    setError('');
    if (!title.trim() || !description.trim()) { setTab('general'); setError('Vui lòng nhập tên và mô tả ngắn của dự án.'); return; }
    if (!validDate(start) || !validDate(end) || (start && end && start > end)) { setTab('content'); setError('Ngày cần có dạng YYYY-MM-DD; ngày kết thúc không được trước ngày bắt đầu.'); return; }
    setBusy(true);
    try {
      const saved = await projectHubService.update(project.id, {
        title: title.trim(), description: description.trim(), logoUrl: logoUrl ?? '', technologies: technologies(tech), ...(status === 3 ? {} : { status }), visibility,
        details: { ...project.details, description: intro.trim() || null, features: lines(features), startDate: start || null, endDate: end || null,
          results: { ...results, problem: problem.trim(), solution: solution.trim(), objectives: lines(objectives), achievements: lines(achievements), expectedProduct: product.trim(), expectedValue: value.trim(), expectedGrowth: growth.trim() }, documents, media, links },
      });
      onSaved(saved); onClose();
    } catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  function addLink() {
    if (!linkLabel.trim() || !safeUrl(linkUrl.trim())) { setError('Nhập tên liên kết và địa chỉ http:// hoặc https:// hợp lệ.'); return; }
    setLinks(old => [...old, { label: linkLabel.trim(), url: linkUrl.trim() }]); setLinkLabel(''); setLinkUrl(''); setError('');
  }
  return <HubModal title="Chỉnh sửa dự án" subtitle="Hoàn thiện câu chuyện, sản phẩm và kết quả dự án của bạn." onClose={busy || uploading ? () => undefined : onClose} footer={<><HubAction title="Hủy" onPress={onClose} disabled={busy || uploading} /><HubAction testID="project-edit-save" title="Lưu thay đổi" variant="primary" onPress={() => void save()} busy={busy} disabled={uploading} /></>}>
    <View style={styles.tabs}>{([{ id: 'general', label: 'Thông tin cơ bản' }, { id: 'content', label: 'Nội dung dự án' }, { id: 'files', label: 'Tệp & liên kết' }] as const).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}><Text style={{ color: tab === item.id ? c.primary : c.textSecondary, fontWeight: '600' }}>{item.label}</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 18 }]}>{error}</Text>}
    {tab === 'general' && <View style={[styles.columns, narrow && styles.stacked]}><View style={{ flex: 1 }}>
      <Field label="Tên dự án *" value={title} onChange={setTitle} maxLength={200} />
      <Field label="Mô tả ngắn *" value={description} onChange={setDescription} multiline maxLength={500} />
      <Field label="Công nghệ sử dụng" value={tech} onChange={setTech} placeholder="Unity, C#, PostgreSQL…" hint="Phân cách các công nghệ bằng dấu phẩy." />
      <Choice label="Trạng thái dự án" value={status} onChange={setStatus} options={[{ value: 0, label: 'Chờ duyệt' }, { value: 1, label: 'Đang thực hiện' }, { value: 2, label: 'Hoàn thành' }]} />
      <Choice<0 | 1> label="Quyền hiển thị" value={visibility} onChange={setVisibility} options={[{ value: 0, label: 'Riêng tư' }, { value: 1, label: 'Công khai' }]} />
    </View><View style={{ width: narrow ? '100%' : 300, gap: 14 }}><Text style={ui.label}>Ảnh / Logo dự án</Text><ProjectCover url={logoUrl} title={title} height={180} /><HubAction title="Thay ảnh dự án" icon="upload" busy={uploading} onPress={() => void upload('logo')} />{logoUrl && <HubAction title="Gỡ ảnh" icon="trash" variant="quiet" onPress={() => setLogoUrl(null)} />}<Text style={ui.muted}>PNG, JPG · tối đa 5 MB</Text></View></View>}
    {tab === 'content' && <>
      <Field label="Giới thiệu dự án" value={intro} onChange={setIntro} multiline maxLength={20000} />
      <View style={[styles.columns, narrow && styles.stacked]}><View style={{ flex: 1 }}><Field label="Ngày bắt đầu" value={start} onChange={setStart} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Ngày kết thúc / dự kiến kết thúc" value={end} onChange={setEnd} placeholder="YYYY-MM-DD" /></View></View>
      <FormSection title="Vấn đề & Giải pháp" icon="target"><Field label="Vấn đề cần giải quyết" value={problem} onChange={setProblem} multiline /><Field label="Giải pháp của dự án" value={solution} onChange={setSolution} multiline /></FormSection>
      <Field label="Mục tiêu dự án" value={objectives} onChange={setObjectives} multiline hint="Mỗi mục tiêu trên một dòng." />
      <Field label="Chức năng chính" value={features} onChange={setFeatures} multiline hint="Mỗi chức năng trên một dòng." />
      <FormSection title={status === 2 ? 'Kết quả đạt được' : 'Kết quả mong đợi'} icon="trophy">
        <Field label="Kết quả / thành tựu" value={achievements} onChange={setAchievements} multiline hint="Mỗi kết quả trên một dòng." />
        <Field label="Sản phẩm dự kiến" value={product} onChange={setProduct} multiline /><Field label="Giá trị mang lại" value={value} onChange={setValue} multiline /><Field label="Định hướng phát triển" value={growth} onChange={setGrowth} multiline />
      </FormSection>
    </>}
    {tab === 'files' && <>
      <FormSection title="Tài liệu" icon="document"><AssetRows files={documents} onRemove={index => setDocuments(old => old.filter((_, i) => i !== index))} /><HubAction title="Tải tài liệu lên" icon="upload" busy={uploading} disabled={documents.length >= 12} onPress={() => void upload('document')} /><Text style={ui.muted}>PDF, Word hoặc văn bản · tối đa 20 MB/tệp.</Text></FormSection>
      <FormSection title="Hình ảnh & Video demo" icon="image"><AssetRows files={media} onRemove={index => setMedia(old => old.filter((_, i) => i !== index))} /><HubAction title="Thêm hình ảnh / video" icon="plus" busy={uploading} disabled={media.length >= 12} onPress={() => void upload('media')} /></FormSection>
      <FormSection title="Liên kết" icon="link"><LinkRows links={links} onRemove={index => setLinks(old => old.filter((_, i) => i !== index))} /><Field label="Tên liên kết" value={linkLabel} onChange={setLinkLabel} placeholder="GitHub, Figma, Website demo…" /><Field label="Địa chỉ liên kết" value={linkUrl} onChange={setLinkUrl} placeholder="https://" /><HubAction title="Thêm liên kết" icon="plus" disabled={links.length >= 20} onPress={addLink} /></FormSection>
    </>}
  </HubModal>;
}
function AssetRows({ files, onRemove }: { files: HubFile[]; onRemove: (index: number) => void }) {
  return <View style={{ gap: 10, marginBottom: 14 }}>{files.map((file, i) => <View key={`${file.url}-${i}`} style={styles.fileRow}>{file.type === 'image' ? <Image source={{ uri: file.url }} style={styles.fileThumb} /> : <HubIcon name={file.type === 'video' ? 'play' : 'document'} />}<Pressable style={{ flex: 1 }} accessibilityRole="link" onPress={() => openProjectUrl(file.url)}><Text numberOfLines={2} style={{ color: c.ink, fontSize: 14 }}>{file.name}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Gỡ ${file.name}`} onPress={() => onRemove(i)} style={ui.iconButton}><HubIcon name="close" size={18} /></Pressable></View>)}</View>;
}
function LinkRows({ links, onRemove }: { links: HubLink[]; onRemove: (index: number) => void }) {
  return <View style={{ gap: 10, marginBottom: 16 }}>{links.map((link, i) => <View key={`${link.url}-${i}`} style={styles.fileRow}><HubIcon name="link" /><Text numberOfLines={1} style={{ flex: 1, color: c.ink }}>{link.label}</Text><Pressable accessibilityLabel={`Gỡ liên kết ${link.label}`} accessibilityRole="button" style={ui.iconButton} onPress={() => onRemove(i)}><HubIcon name="close" size={18} /></Pressable></View>)}</View>;
}
const styles = StyleSheet.create({ columns: { flexDirection: 'row', gap: 30 }, stacked: { flexDirection: 'column' }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderBottomWidth: 1, borderColor: c.line, marginBottom: 26 }, tab: { minHeight: 45, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: c.primary }, fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderWidth: 1, borderColor: c.line, borderRadius: 9 }, fileThumb: { width: 50, height: 38, borderRadius: 5 } });
