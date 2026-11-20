import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { portfolioService } from '@/services/portfolio.service';
import type { PortfolioProject } from '@/types/portfolio';
import { PortfolioProjectDetails, PortfolioProjectTitle } from './PortfolioProjectDetails';
import { ProfileTextInput } from './ProfileTextInput';

type Props = {
  projects: PortfolioProject[];
  limit: number;
  onApply: (projects: PortfolioProject[]) => void;
  onManual: () => void;
  onClose: () => void;
};

export function ProfileProjectPicker({ projects, limit, onApply, onManual, onClose }: Props) {
  const [draft, setDraft] = useState(projects);
  const [options, setOptions] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    portfolioService.getEligibleProjects(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const unique = new Map<string, PortfolioProject>();
      for (const project of result) {
        const projectId = project.projectId ?? project.id;
        if (projectId) unique.set(projectId, { ...project, projectId, technologies: project.technologies ?? [], featured: false });
      }
      setOptions([...unique.values()]);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Không tải được danh sách dự án. Vui lòng thử lại.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const available = options.filter(option => !draft.some(project => project.projectId === option.projectId));
  const update = (index: number, fields: Partial<PortfolioProject>) => {
    setDraft(current => current.map((project, position) => position === index ? { ...project, ...fields } : project));
  };
  const move = (index: number, direction: -1 | 1) => {
    setDraft(current => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  };

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={s.dialog}>
        <Text accessibilityRole="header" style={s.heading}>Dự án trong hồ sơ</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {!!draft.length && <Text style={s.title}>Đã thêm ({draft.length}/{limit})</Text>}
          {draft.map((project, index) => <View key={project.projectId ?? `${project.title}-${index}`} style={s.card}>
            <PortfolioProjectTitle project={project} style={s.title} />
            {!!project.projectId && <>
              <ProfileTextInput label="Đóng góp cá nhân" value={project.personalContribution ?? ''} maxLength={2000}
                onChangeText={personalContribution => update(index, { personalContribution })} />
              <Pressable accessibilityRole="checkbox" accessibilityLabel={`Dự án nổi bật: ${project.title}`}
                accessibilityState={{ checked: project.featured }} onPress={() => update(index, { featured: !project.featured })} style={s.control}>
                <Text style={s.link}>{project.featured ? '☑' : '☐'} Dự án nổi bật</Text>
              </Pressable>
            </>}
            <View style={s.row}>
              <Button title="Lên" accessibilityLabel={`Đưa ${project.title} lên`} variant="outline" disabled={index === 0} onPress={() => move(index, -1)} />
              <Button title="Xuống" accessibilityLabel={`Đưa ${project.title} xuống`} variant="outline" disabled={index === draft.length - 1} onPress={() => move(index, 1)} />
              <Button title="Bỏ khỏi hồ sơ" accessibilityLabel={`Bỏ ${project.title} khỏi hồ sơ`} variant="outline" onPress={() => setDraft(current => current.filter((_, position) => position !== index))} />
            </View>
          </View>)}
          <Text style={s.title}>Dự án UniNet đã hoàn thành</Text>
          {loading && <ActivityIndicator accessibilityLabel="Đang tải dự án" color={colors.primary} />}
          {!!error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text>
            <Button title="Thử lại" variant="outline" onPress={() => { setError(''); setLoading(true); setAttempt(value => value + 1); }} />
          </View>}
          {!loading && !error && !available.length && <Text style={s.hint}>{options.length ? 'Bạn đã thêm tất cả dự án đủ điều kiện.' : 'Bạn chưa có dự án đã hoàn thành đủ điều kiện.'}</Text>}
          {draft.length >= limit && <Text style={s.hint}>Hồ sơ đã đạt giới hạn {limit} dự án.</Text>}
          {available.map(project => <View key={project.projectId} style={s.card}>
            <PortfolioProjectTitle project={project} style={s.title} />
            <PortfolioProjectDetails project={project} color={colors.textSecondary} />
            <Button title="Thêm vào hồ sơ" accessibilityLabel={`Thêm ${project.title} vào hồ sơ`} variant="outline" disabled={draft.length >= limit}
              onPress={() => setDraft(current => current.length >= limit || current.some(item => item.projectId === project.projectId) ? current : [...current, project])} />
          </View>)}
          <Button title="Nhập dự án thủ công" variant="outline" onPress={onManual} disabled={draft !== projects} />
          {draft !== projects && <Text style={s.hint}>Xác nhận hoặc hủy thay đổi trước khi nhập dự án thủ công.</Text>}
        </ScrollView>
        <View style={s.actions}>
          <Button title="Hủy" variant="outline" onPress={onClose} />
          <Button title="Xác nhận" onPress={() => onApply(draft)} />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,40,75,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
  heading: { padding: 18, borderBottomWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 18, gap: 12 },
  card: { padding: 12, gap: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  hint: { color: colors.textSecondary, fontSize: 13 },
  error: { color: colors.error, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  control: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.primary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderColor: colors.border },
});
