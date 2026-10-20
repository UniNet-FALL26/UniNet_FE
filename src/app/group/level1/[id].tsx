import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CompletedDetailView } from '@/components/projects/CompletedDetailView';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { projectService } from '@/services/project.service';
import { ApiProjectStatus, type ProjectDetail } from '@/types/project';
import { useAuthStore } from '@/store/auth.store';

export default function Level1ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useAuthStore();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setProject(null); setError(null);
    projectService.getProjectById(id ?? '', controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (data.status !== ApiProjectStatus.Completed) setError('Dự án chưa hoàn thành.');
      else if (!data.isCreator) setError('Chỉ người tạo dự án có quyền xem kết quả kiểm tra cấp 1.');
      else setProject(data);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể tải dự án.'); });
    return () => controller.abort();
  }, [id, account?.id, revision]);
  if (error) return <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}><Text accessibilityRole="alert">{error}</Text><Button title="Thử lại" onPress={() => setRevision(v => v + 1)} /><Button title="Quay lại" variant="outline" onPress={() => router.back()} /></View>;
  if (!project) return <Loading />;
  return <CompletedDetailView key={`${account?.id}:${project.id}`} project={project} level1Only />;
}
