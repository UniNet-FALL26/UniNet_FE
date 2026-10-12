import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import { RecommendedMemberCard } from "@/components/projects/RecommendedMemberCard";
import type { CreateProjectRequest, ProjectDetail, ProjectRecommendation } from "@/types/project";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export function ProjectRecommendationScreen() {
  const { projectId, draft: draftParam } = useLocalSearchParams<{ projectId?: string; draft?: string }>();
  const draft = useMemo(() => {
    try { return draftParam ? JSON.parse(draftParam) as CreateProjectRequest : null; }
    catch { return null; }
  }, [draftParam]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const effectiveId = createdId ?? projectId;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [recommendations, setRecommendations] = useState<
    ProjectRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  useEffect(() => {
    const id = effectiveId;
    if (!id && draft) { setLoading(false); return; }
    const controller = new AbortController();
    let mounted = true;
    async function load() {
      setLoading(true); setError(null); setProject(null); setRecommendations([]); setInvitedIds([]);
      try {
        if (!id) throw new Error("Không tìm thấy mã dự án.");
        const [detail, items] = await Promise.all([
          projectService.getProjectById(id, controller.signal),
          projectService.fetchRecommendations(id, controller.signal),
        ]);
        if (mounted) {
          setProject(detail);
          setRecommendations(items);
        }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Không thể tải đề xuất thành viên.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [effectiveId, draft, retry]);

  const handleCreate = async () => {
    if (!draft || creatingRef.current || createdId) return;
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const created = await projectService.createProject(draft);
      setProject(created);
      setCreatedId(created.id);
      router.setParams({ projectId: created.id, draft: undefined });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo dự án. Vui lòng thử lại.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const handleInvite = async (recommendation: ProjectRecommendation, role: string) => {
    if (!project) return;
    try {
      await projectService.sendInvitation({
        projectId: project.id,
        inviteeId: recommendation.userId,
        role,
        message: "Mời tham gia dự án dựa trên đề xuất phù hợp.",
      });
      setInvitedIds((current) => [...current, recommendation.userId]);
    } catch {
      setError("Không thể gửi lời mời. Vui lòng thử lại sau.");
    }
  };

  if (draft && !effectiveId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>UNINET</Text>
        <Text style={styles.title}>Xác nhận tạo dự án</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{draft.title}</Text>
          <Text>{draft.projectField}</Text>
          <Text>{draft.description}</Text>
          <Text>Số thành viên: {draft.memberTarget}</Text>
          <Text>Hạn tuyển: {new Date(draft.recruitmentDeadline).toLocaleString("vi-VN")}</Text>
          <Text>Dự kiến hoàn thành: {new Date(draft.expectedOutput).toLocaleDateString("vi-VN")}</Text>
          <Text>{draft.visibility === 0 ? "Riêng tư" : "Công khai"}</Text>
          {draft.roleRequirements.map((role, index) => <View key={index} style={styles.roleRow}>
            <View style={{ flex: 1 }}><Text style={styles.roleName}>{role.role}</Text><Text>{role.requirements}</Text></View>
            <Text style={styles.roleMeta}>{role.quantity} chỗ</Text>
          </View>)}
        </View>
        <Text style={styles.subtitle}>Đề xuất thành viên sẽ được tải sau khi dự án được tạo.</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button title="Tạo dự án" loading={creating} disabled={creating} onPress={handleCreate} />
        <Button title="Quay lại chỉnh sửa" variant="outline" disabled={creating} onPress={() => router.back()} />
      </ScrollView>
    );
  }

  if (loading) return <Loading />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>UNINET</Text>
      <Text style={styles.title}>Đề xuất thành viên</Text>
      <Text style={styles.subtitle}>
        {project?.title ?? "Dự án"} ·{" "}
        {project
          ? Math.max(project.memberTarget - project.currentMemberCount, 0)
          : 0}{" "}
        thành viên còn thiếu
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Các vai trò đang tuyển</Text>
        {project?.roleRequirements.map((role) => (
          <View key={role.id} style={styles.roleRow}>
            <Text style={styles.roleName}>{role.roleName}</Text>
            <Text style={styles.roleMeta}>Còn {role.quantity} chỗ</Text>
          </View>
        ))}
      </View>

      {error ? <View><Text style={styles.errorText}>{error}</Text><Button title="Thử lại" onPress={() => setRetry((value) => value + 1)} /></View> : null}

      {error ? null : recommendations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có đề xuất nào</Text>
          <Text style={styles.emptyText}>
            Bạn có thể quay lại sau hoặc mời thêm sinh viên phù hợp.
          </Text>
        </View>
      ) : (
        recommendations.map((recommendation) => (
          <RecommendedMemberCard key={recommendation.userId} member={recommendation} roles={project?.roleRequirements ?? []} invited={invitedIds.includes(recommendation.userId)} onInvite={handleInvite} />
        ))
      )}

      <Button
        title="Bỏ qua"
        variant="outline"
        onPress={() => router.push("/(tabs)/groups" as never)}
        style={styles.skipButton}
      />
    </ScrollView>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 32,
    gap: 18,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  kicker: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  title: { color: colors.navy, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryTitle: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleName: { color: colors.textPrimary, fontWeight: "700" },
  roleMeta: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  name: { color: colors.navy, fontSize: 17, fontWeight: "800" },
  role: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  skills: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  reason: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  actionRow: { flexDirection: "row", gap: 12 },
  flexButton: { flex: 1 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: "600" },
  skipButton: { marginTop: 8 },
});
