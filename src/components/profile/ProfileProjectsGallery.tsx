import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { PortfolioProject, ProfileTheme } from '@/types/portfolio';
import { HubModal } from '@/components/projects/hub/ProjectHubUI';
import { PortfolioProjectCard } from './PortfolioProjectCard';
import { useProfileEditing } from './ProfileEditContext';

function cardWidth(width: number): DimensionValue {
  if (!width) return '100%';
  const columns = width >= 810 ? 3 : width >= 540 ? 2 : 1;
  return Math.max(0, Math.floor((width - (columns - 1) * 12) / columns));
}

export function ProfileProjectsGallery({ projects, theme, thumbnail, width = 0, cardTestID, heading }: {
  projects: PortfolioProject[]; theme: ProfileTheme; thumbnail?: boolean; width?: number; cardTestID?: string;
  heading: (action: ReactNode) => ReactNode;
}) {
  const editing = useProfileEditing();
  const [open, setOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(width);
  const [modalWidth, setModalWidth] = useState(0);
  const visibleProjects = editing ? projects : projects.slice(0, 3);
  const remaining = projects.length - visibleProjects.length;
  const close = () => setOpen(false);
  const label = `Xem thêm (+${remaining})`;
  const action = remaining > 0 ? thumbnail
    ? <Text style={[s.moreText, { color: theme.accentStrong }]}>{label}</Text>
    : <Pressable testID="profile-projects-more" accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={({ pressed }) => [s.more, pressed && { opacity: 0.65 }]}><Text style={[s.moreText, { color: theme.accentStrong }]}>{label}</Text></Pressable>
    : null;
  return <View testID="profile-projects-section">
    {heading(action)}
    <View testID="profile-projects-preview" onLayout={event => setPreviewWidth(event.nativeEvent.layout.width)} style={s.grid}>
      {visibleProjects.map((project, index) => <PortfolioProjectCard key={`${project.projectId ?? project.title}-${index}`} project={project} width={cardWidth(previewWidth)} theme={theme} thumbnail={thumbnail} testID={cardTestID ?? 'profile-project-card'} />)}
    </View>
    {open && <HubModal compact maxWidth={1040} title={`Tất cả dự án (${projects.length})`} onClose={close} contentContainerStyle={{ backgroundColor: theme.page }}>
      <View testID="profile-projects-all" onLayout={event => setModalWidth(event.nativeEvent.layout.width)} style={s.grid}>
        {projects.map((project, index) => <PortfolioProjectCard key={`${project.projectId ?? project.title}-${index}`} project={project} width={cardWidth(modalWidth)} theme={theme} onNavigate={close} testID="profile-project-modal-card" />)}
      </View>
    </HubModal>}
  </View>;
}

const s = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  more: { minHeight: 36, justifyContent: 'center', paddingVertical: 6 },
  moreText: { fontSize: 12, lineHeight: 20, fontWeight: '600' },
});
