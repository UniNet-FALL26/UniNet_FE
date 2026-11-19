import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AutoGrowingTextInput } from '@/components/ui/AutoGrowingTextInput';
import type { HubProject } from '@/types/project-hub';
import { projectHubService } from '@/services/project-hub.service';
import { buildProjectOverviewDetails, overviewDraft, overviewGuides, type OverviewGuideId, type ProjectOverviewDraft } from '@/utils/project-overview-content';
import { ProjectOverviewHelp } from './ProjectOverviewHelp';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubModal, hubColors as c, ui } from './ProjectHubUI';

export function ProjectOverviewModal({ project, onSaved, onClose }: { project: HubProject; onSaved: (project: HubProject) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(() => overviewDraft(project.details));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const columns = useWindowDimensions().width >= 760;
  const completed = project.status === 2;
  const close = () => { if (!locked.current) onClose(); };
  const update = (key: keyof ProjectOverviewDraft, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  async function save() {
    if (locked.current) return;
    setError('');
    try {
      const details = buildProjectOverviewDetails(project.details, draft, completed);
      locked.current = true; setBusy(true);
      onSaved(await projectHubService.update(project.id, { details })); onClose();
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  const field = (key: keyof ProjectOverviewDraft, label: string, maxLength?: number, placeholder?: string, hint?: string) => <View style={styles.field}>
    <Text style={styles.label}>{label}</Text><AutoGrowingTextInput accessibilityLabel={label} value={draft[key]} onChangeText={value => update(key, value)} editable={!busy} multiline maxLength={maxLength} placeholder={placeholder} placeholderTextColor={c.textMuted} textAlignVertical="top" style={[ui.input, styles.input]} />{hint && <Text style={styles.hint}>{hint}</Text>}
  </View>;
  return <HubModal compact icon="document" title="Chỉnh sửa nội dung dự án" subtitle="Bổ sung câu chuyện, mục tiêu và những giá trị mà dự án mang lại." onClose={close} footer={<><HubAction compact title="Hủy" onPress={close} disabled={busy} /><HubAction compact title="Lưu nội dung" icon="save" variant="primary" busy={busy} onPress={() => void save()} testID="project-overview-save" /></>}>
    <EditorSection section="introduction">{field('introduction', 'Giới thiệu dự án', 20000, 'Dự án là gì, dành cho ai và mang lại giá trị gì?')}</EditorSection>
    <EditorSection section="problemSolution"><View style={[styles.columns, !columns && styles.stacked]}><View style={styles.column}>{field('problem', 'Vấn đề', 4000, 'Người dùng đang gặp khó khăn gì và điều đó ảnh hưởng đến họ ra sao?')}</View><View style={styles.column}>{field('solution', 'Giải pháp', 4000, 'Dự án giải quyết khó khăn đó bằng cách nào?')}</View></View></EditorSection>
    <EditorSection section="objectives">{field('objectives', 'Mục tiêu dự án', 40039, 'Hoàn thiện bản demo cho nhóm người dùng mục tiêu.\nThử nghiệm và ghi nhận phản hồi để cải thiện sản phẩm.', 'Mỗi mục tiêu một dòng · tối đa 40 mục, mỗi mục 1.000 ký tự.')}</EditorSection>
    <EditorSection section="features">{field('features', 'Chức năng chính', 100099, 'Tạo và quản lý tài khoản.\nLập kế hoạch và theo dõi tiến độ.', 'Mỗi chức năng một dòng · tối đa 100 mục, mỗi mục 1.000 ký tự.')}</EditorSection>
    <EditorSection section={completed ? 'achievements' : 'results'}>
      {completed ? field('achievements', 'Kết quả đạt được', 40039, 'Đã bàn giao sản phẩm nào? Đã thử nghiệm và ghi nhận kết quả gì?', 'Mỗi kết quả một dòng · tối đa 40 mục, mỗi mục 1.000 ký tự.') : <>
        {field('expectedProduct', 'Sản phẩm mong đợi', 4000, 'Bản demo, ứng dụng hoặc tài liệu cụ thể sẽ hoàn thành.')}
        {field('expectedValue', 'Giá trị mang lại', 4000, 'Người dùng được hỗ trợ điều gì và có thể kiểm chứng lợi ích ra sao?')}
        {field('expectedGrowth', 'Hướng phát triển', 4000, 'Các bước tiếp theo sau phiên bản đầu và cơ sở để ưu tiên chúng.')}
      </>}
    </EditorSection>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
function EditorSection({ section, children }: { section: OverviewGuideId; children: ReactNode }) {
  return <View style={styles.section}><View style={styles.headingRow}><Text accessibilityRole="header" aria-level={3} style={styles.heading}>{overviewGuides[section].title}</Text><ProjectOverviewHelp section={section} /></View>{children}</View>;
}
const styles = StyleSheet.create({ section: { marginBottom: 18, padding: 16, borderWidth: 1, borderRadius: 14, backgroundColor: '#F5F7FF', borderColor: '#D4DFF7' }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, heading: { fontSize: 15, fontWeight: '700', color: c.ink, flexShrink: 1 }, columns: { flexDirection: 'row', gap: 14 }, stacked: { flexDirection: 'column', gap: 0 }, column: { flex: 1, minWidth: 0 }, field: { marginBottom: 12 }, label: { fontSize: 12, fontWeight: '600', color: c.ink, marginBottom: 6 }, input: { fontSize: 13, lineHeight: 20, minHeight: 96, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 9, borderColor: '#D1DBF2' }, hint: { fontSize: 11, lineHeight: 17, color: c.textSecondary, marginTop: 5 } });
