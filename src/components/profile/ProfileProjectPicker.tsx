import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { portfolioService } from '@/services/portfolio.service';
import type { PortfolioProject } from '@/types/portfolio';
import { HubAction, HubIcon, HubModal, ProjectCover } from '@/components/projects/hub/ProjectHubUI';

type Props = {
  projects: PortfolioProject[]; limit: number; visible?: boolean; refresh?: number; notice?: string;
  onApply: (projects: PortfolioProject[]) => void;
  onCreate: (projects: PortfolioProject[]) => void;
  onClose: () => void;
};

export function ProfileProjectPicker({ projects, limit, visible = true, refresh = 0, notice, onApply, onCreate, onClose }: Props) {
  const [draft, setDraft] = useState(projects);
  const [previousProjects, setPreviousProjects] = useState(projects);
  const [options, setOptions] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { width } = useWindowDimensions();
  if (previousProjects !== projects) { setPreviousProjects(projects); setDraft(projects); }
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const eligible = await portfolioService.getEligibleProjects(controller.signal);
      if (controller.signal.aborted) return;
      const unique = new Map<string, PortfolioProject>();
      for (const project of eligible) {
        const projectId = project.projectId ?? project.id;
        if (projectId) unique.set(projectId, { ...project, projectId, technologies: project.technologies ?? [], featured: false });
      }
      // Keep selected entries if an older response does not include them.
      for (const project of projects) if (project.projectId && !unique.has(project.projectId)) unique.set(project.projectId, project);
      setOptions([...unique.values()]);
    };
    load().catch(() => { if (!controller.signal.aborted) setError('Không tải được danh sách dự án. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, refresh, projects]);
  const list = [...options, ...projects.filter(project => !project.projectId)];
  const selectedIndex = (project: PortfolioProject) => draft.findIndex(item => project.projectId ? item.projectId === project.projectId : item === project);
  const toggle = (project: PortfolioProject) => setDraft(current => {
    const index = current.findIndex(item => project.projectId ? item.projectId === project.projectId : item === project);
    return index >= 0 ? current.filter((_, i) => i !== index) : current.length < limit ? [...current, project] : current;
  });
  if (!visible) return null;
  return <HubModal title="Thêm dự án vào hồ sơ" subtitle="Chọn các dự án muốn hiển thị trong hồ sơ cá nhân của bạn." icon="layers" maxWidth={640} compact onClose={onClose}
    contentContainerStyle={{ padding: width < 600 ? 12 : 18, gap: 12 }}
    footer={<View style={s.footer}><Text accessibilityLiveRegion="polite" style={s.count}>Đã chọn: {draft.length} dự án</Text><View style={s.actions}><HubAction compact title="Hủy" onPress={onClose} /><HubAction compact title="Thêm vào hồ sơ" icon="check" variant="primary" onPress={() => onApply(draft)} /></View></View>}>
    <View testID="profile-project-picker" style={{ gap: 12 }}>
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.hint}>{notice}</Text>}
      {loading && <ActivityIndicator accessibilityLabel="Đang tải dự án" color={colors.primary} />}
      {!!error && <View style={s.empty}><Text accessibilityRole="alert" style={s.error}>{error}</Text><HubAction compact title="Thử lại" onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} /></View>}
      {!loading && !error && !list.length && <Text style={s.empty}>Chưa có dự án đã hoàn thành để thêm vào hồ sơ.</Text>}
      {!loading && !error && list.map((project, index) => {
        const selected = selectedIndex(project), checked = selected >= 0, disabled = !checked && draft.length >= limit;
        return <View key={project.projectId ?? `manual-${index}`} style={[s.card, checked && s.selected]}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={project.title} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={() => toggle(project)} style={[s.project, disabled && { opacity: 0.5 }]}>
            <ProjectCover url={project.coverUrl ?? null} title={project.title} height={width < 400 ? 54 : 60} hideTitle style={{ width: width < 400 ? 68 : 104, borderRadius: 7 }} />
            <View style={s.copy}><Text numberOfLines={1} style={s.title}>{project.title}</Text>{!!project.description && <Text numberOfLines={1} style={s.description}>{project.description}</Text>}<View style={s.tags}>{project.technologies.slice(0, 3).map((tech, i) => <Text key={`${tech}-${i}`} style={s.tag}>{tech}</Text>)}{project.technologies.length > 3 && <Text style={s.tag}>+{project.technologies.length - 3}</Text>}</View></View>
          </Pressable>
        </View>;
      })}
      {draft.length >= limit && <Text style={s.hint}>Hồ sơ đã đạt giới hạn {limit} dự án.</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Thêm dự án mới" onPress={() => onCreate(draft)} style={s.create}><HubIcon name="plus" size={22} /><Text style={s.createText}>Thêm dự án mới</Text></Pressable>
    </View>
  </HubModal>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#E2E8F3', borderRadius: 9, backgroundColor: colors.surface, overflow: 'hidden' }, selected: { borderColor: '#75A4FF', backgroundColor: '#F0F5FF' }, project: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 10, minHeight: 76 }, copy: { flex: 1, minWidth: 0, gap: 3 }, title: { fontSize: 13, fontWeight: '700', color: colors.textPrimary }, description: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 }, tag: { fontSize: 9, fontWeight: '600', color: colors.primary, backgroundColor: '#E3EDFF', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  footer: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, count: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', borderRadius: 16, backgroundColor: '#EDF1F7', paddingHorizontal: 10, paddingVertical: 7 }, actions: { flexDirection: 'row', gap: 8 }, hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary }, empty: { padding: 18, gap: 10, color: colors.textSecondary, fontSize: 13 }, error: { color: colors.error, fontSize: 13 },
  create: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#9FBFFF', backgroundColor: '#F6F9FF', borderRadius: 9, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }, createText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
