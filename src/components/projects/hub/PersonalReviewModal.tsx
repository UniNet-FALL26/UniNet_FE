import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AutoGrowingTextInput } from '@/components/ui/AutoGrowingTextInput';
import { projectHubService } from '@/services/project-hub.service';
import type { HubProject } from '@/types/project-hub';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';

export function PersonalReviewModal({ project, onSaved, onClose }: { project: HubProject; onSaved: (project: HubProject) => void; onClose: () => void }) {
  const [challenges, setChallenges] = useState(project.myReview?.challenges ?? ''), [lessons, setLessons] = useState(project.myReview?.lessonsLearned ?? '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  const close = () => { if (!locked.current) onClose(); };
  async function save() {
    if (locked.current) return;
    if (challenges.trim().length > 10000 || lessons.trim().length > 10000) { setError('Mỗi nội dung tổng kết tối đa 10.000 ký tự.'); return; }
    locked.current = true; setBusy(true); setError('');
    try { onSaved(await projectHubService.saveReview(project.id, { challenges: challenges.trim(), lessonsLearned: lessons.trim() })); onClose(); }
    catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <HubModal compact wide={false} icon="book" title="Tổng kết cá nhân" subtitle="Ghi lại khó khăn và bài học của riêng bạn trong dự án." onClose={close}
    footer={<><HubAction compact title="Hủy" disabled={busy} onPress={close} /><HubAction compact title="Lưu tổng kết" icon="save" variant="primary" busy={busy} onPress={() => void save()} testID="project-review-save" /></>}>
    <View style={styles.field}>
      <View style={styles.heading}><View style={[styles.emblem, { backgroundColor: '#FFF3DB' }]}><HubIcon name="warning" color={c.warning} size={17} /></View><Text style={styles.label}>Khó khăn đã gặp</Text><Text style={styles.counter}>{challenges.length}/10000</Text></View>
      <Text style={styles.hint}>Những trở ngại bạn gặp và cách bạn đã xử lý hoặc thích nghi.</Text>
      <AutoGrowingTextInput accessibilityLabel="Khó khăn đã gặp" value={challenges} onChangeText={setChallenges} minHeight={80} multiline maxLength={10000} editable={!busy} textAlignVertical="top" placeholder="Bạn gặp khó khăn gì khi thực hiện dự án?" placeholderTextColor={c.textMuted} style={[ui.input, styles.input]} />
    </View>
    <View style={styles.field}>
      <View style={styles.heading}><View style={styles.emblem}><HubIcon name="book" size={17} /></View><Text style={styles.label}>Bài học kinh nghiệm</Text><Text style={styles.counter}>{lessons.length}/10000</Text></View>
      <Text style={styles.hint}>Điều bạn học được và cách áp dụng tốt hơn trong những dự án tiếp theo.</Text>
      <AutoGrowingTextInput accessibilityLabel="Bài học kinh nghiệm" value={lessons} onChangeText={setLessons} minHeight={80} multiline maxLength={10000} editable={!busy} textAlignVertical="top" placeholder="Bạn rút ra bài học gì từ trải nghiệm này?" placeholderTextColor={c.textMuted} style={[ui.input, styles.input]} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
const styles = StyleSheet.create({ field: { padding: 12, borderRadius: 10, backgroundColor: '#F8FAFE', borderWidth: 1, borderColor: c.line, marginBottom: 14 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, emblem: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' }, label: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: c.ink }, counter: { fontSize: 10, color: c.textSecondary }, hint: { color: c.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 7, marginBottom: 10 }, input: { fontSize: 13, lineHeight: 20, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 8 } });
