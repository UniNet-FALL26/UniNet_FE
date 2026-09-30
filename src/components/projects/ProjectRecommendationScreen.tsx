import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { Project, ProjectRecommendation } from "@/types/project";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export function ProjectRecommendationScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [recommendations, setRecommendations] = useState<
    ProjectRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  useEffect(() => {
    const id = projectId ?? "project-1";
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [detail, items] = await Promise.all([
          projectService.getProjectById(id),
          projectService.fetchRecommendations(id),
        ]);
        if (mounted) {
          setProject(detail);
          setRecommendations(items);
        }
      } catch {
        if (mounted) setError("Không thể tải đề xuất thành viên.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const handleInvite = async (recommendation: ProjectRecommendation) => {
    if (!project) return;
    try {
      await projectService.sendInvitation({
        projectId: project.id,
        inviteeId: recommendation.id,
        role: recommendation.recommendedRole,
        message: "Mời tham gia dự án dựa trên đề xuất phù hợp.",
      });
      setInvitedIds((current) => [...current, recommendation.id]);
    } catch {
      setError("Không thể gửi lời mời. Vui lòng thử lại sau.");
    }
  };

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
        {project?.roles.map((role) => (
          <View key={role.id} style={styles.roleRow}>
            <Text style={styles.roleName}>{role.role}</Text>
            <Text style={styles.roleMeta}>Còn {role.quantity} chỗ</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {recommendations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có đề xuất nào</Text>
          <Text style={styles.emptyText}>
            Bạn có thể quay lại sau hoặc mời thêm sinh viên phù hợp.
          </Text>
        </View>
      ) : (
        recommendations.map((recommendation) => (
          <View key={recommendation.id} style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initials(recommendation.fullName)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{recommendation.fullName}</Text>
                <Text style={styles.role}>
                  {recommendation.recommendedRole}
                </Text>
                <Text style={styles.skills}>{recommendation.skills}</Text>
                {recommendation.reason ? (
                  <Text style={styles.reason}>{recommendation.reason}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.actionRow}>
              <Button
                title="Xem hồ sơ"
                variant="outline"
                onPress={() => router.push("/(tabs)/groups" as never)}
                style={styles.flexButton}
              />
              <Button
                title={
                  invitedIds.includes(recommendation.id)
                    ? "Đã gửi lời mời"
                    : "Mời"
                }
                variant="primary"
                disabled={invitedIds.includes(recommendation.id)}
                onPress={() => handleInvite(recommendation)}
                style={styles.flexButton}
              />
            </View>
          </View>
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
