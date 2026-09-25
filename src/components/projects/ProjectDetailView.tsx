import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import { useAuthStore } from "@/store/auth.store";
import type { Project, ProjectRecommendation } from "@/types/project";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [recommendations, setRecommendations] = useState<
    ProjectRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [joinRole, setJoinRole] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinRequestState, setJoinRequestState] = useState<
    "idle" | "pending" | "rejected" | "member"
  >("idle");
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  useEffect(() => {
    const projectId = id ?? "project-1";
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [detail, recs] = await Promise.all([
          projectService.getProjectById(projectId),
          projectService.fetchRecommendations(projectId),
        ]);
        if (mounted) {
          setProject(detail);
          setRecommendations(recs);
          if (detail.roles[0]) setJoinRole(detail.roles[0].role);
        }
      } catch {
        if (mounted)
          setError("Không thể tải thông tin dự án. Vui lòng thử lại sau.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const roleOptions = useMemo(() => project?.roles ?? [], [project]);
  const isCreator = project ? account?.id === project.creator.id : false;
  const isMember = project
    ? project.currentMemberCount > 1 && account?.id === "current-user"
    : false;
  const canRecruit = project
    ? project.recruitmentStatus === "ĐANG TUYỂN" &&
      project.status === "CÔNG KHAI"
    : false;

  useEffect(() => {
    if (!project) return;
    const pendingOrRejected = project.recruitmentStatus === "ĐANG TUYỂN";
    if (pendingOrRejected && account?.id === "current-user")
      setJoinRequestState("pending");
    else if (isMember) setJoinRequestState("member");
  }, [account, isMember, project]);

  const handleJoinRequest = async () => {
    if (!project || !joinRole) {
      setError("Bạn cần chọn một vai trò để gửi yêu cầu tham gia.");
      return;
    }
    try {
      await projectService.submitJoinRequest({
        projectId: project.id,
        role: joinRole,
        message: joinMessage.trim() || undefined,
      });
      setJoinRequestState("pending");
      setError(null);
    } catch {
      setError("Không thể gửi yêu cầu tham gia. Vui lòng thử lại sau.");
    }
  };

  const handleWithdrawRequest = () => {
    setJoinRequestState("idle");
    setJoinMessage("");
  };

  const handleInvite = async (recommendation: ProjectRecommendation) => {
    if (!project) return;
    try {
      await projectService.sendInvitation({
        projectId: project.id,
        inviteeId: recommendation.id,
        role: recommendation.recommendedRole,
      });
      setInvitedIds((current) => [...current, recommendation.id]);
    } catch {
      setError("Không thể gửi lời mời. Vui lòng thử lại.");
    }
  };

  if (loading) return <Loading />;
  if (!project)
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyText}>Không tìm thấy dự án.</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>UNINET</Text>
      <Text style={styles.title}>{project.title}</Text>
      <Text style={styles.creator}>
        Người tạo: {project.creator.displayName}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Thành viên</Text>
          <Text style={styles.summaryValue}>
            {project.currentMemberCount}/{project.memberTarget}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Hạn tuyển</Text>
          <Text style={styles.summaryValue}>
            {formatDate(project.recruitmentDeadline)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Mục tiêu</Text>
        <Text style={styles.bodyText}>{project.objective}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Mô tả</Text>
        <Text style={styles.bodyText}>{project.description}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Công nghệ</Text>
        <View style={styles.tagsWrap}>
          {project.technologies.map((tech) => (
            <View key={tech} style={styles.tag}>
              <Text style={styles.tagText}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Vai trò đang tuyển</Text>
        {project.roles.map((role) => (
          <View key={role.id} style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleName}>{role.role}</Text>
              <Text style={styles.roleCount}>Cần {role.quantity}</Text>
            </View>
            <Text style={styles.requirements}>{role.requirements}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Thông tin bổ sung</Text>
        <Text style={styles.metaText}>
          Thời gian dự kiến: {project.estimatedDuration ?? "Chưa cập nhật"}
        </Text>
        <Text style={styles.metaText}>
          Sản phẩm đầu ra: {project.expectedOutput ?? "Chưa cập nhật"}
        </Text>
        <Text style={styles.metaText}>
          Mức độ cam kết: {project.commitmentLevel ?? "Chưa cập nhật"}
        </Text>
        <Text style={styles.metaText}>Trạng thái dự án: {project.status}</Text>
        <Text style={styles.metaText}>
          Trạng thái tuyển: {project.recruitmentStatus}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isCreator && canRecruit && joinRequestState === "idle" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Gửi yêu cầu tham gia</Text>
          <Text style={styles.sectionLabel}>Chọn vai trò</Text>
          <View style={styles.rolePicker}>
            {roleOptions.map((role) => (
              <Pressable
                key={role.id}
                onPress={() => setJoinRole(role.role)}
                style={[
                  styles.optionButton,
                  joinRole === role.role && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    joinRole === role.role && styles.optionTextActive,
                  ]}
                >
                  {role.role}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Lời nhắn tùy chọn"
            value={joinMessage}
            onChangeText={setJoinMessage}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
          <Button
            title="Gửi yêu cầu tham gia"
            variant="primary"
            onPress={handleJoinRequest}
          />
        </View>
      ) : null}

      {!isCreator && canRecruit && joinRequestState === "pending" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Đang chờ</Text>
          <Button
            title="Rút yêu cầu tham gia"
            variant="outline"
            onPress={handleWithdrawRequest}
          />
        </View>
      ) : null}

      {!isCreator && joinRequestState === "rejected" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Đã từ chối tham gia dự án này</Text>
        </View>
      ) : null}

      {!isCreator && joinRequestState === "member" ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Bạn đã là thành viên của dự án</Text>
        </View>
      ) : null}

      {isCreator && canRecruit ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>
            Các thành viên có thể phù hợp với nhóm của bạn
          </Text>
          {recommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationCard}>
              <View style={styles.recommendationRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(recommendation.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendationName}>
                    {recommendation.fullName}
                  </Text>
                  <Text style={styles.recommendationRole}>
                    {recommendation.recommendedRole}
                  </Text>
                  <Text style={styles.recommendationSkills}>
                    {recommendation.skills}
                  </Text>
                  {recommendation.reason ? (
                    <Text style={styles.recommendationReason}>
                      {recommendation.reason}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.recommendationActions}>
                <Button
                  title="Xem hồ sơ"
                  variant="outline"
                  onPress={() => router.back()}
                  style={styles.actionButton}
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
                  style={styles.actionButton}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 18,
    maxWidth: 820,
    width: "100%",
    alignSelf: "center",
  },
  kicker: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
  creator: { color: colors.textSecondary, fontSize: 14 },
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  sectionBlock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionLabel: { color: colors.navy, fontSize: 15, fontWeight: "800" },
  bodyText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleName: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  roleCount: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  requirements: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  metaText: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  actionBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  actionTitle: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  rolePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionText: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  optionTextActive: { color: colors.primary },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  recommendationCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  recommendationName: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  recommendationRole: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  recommendationSkills: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  recommendationReason: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  recommendationActions: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1 },
  errorText: { color: colors.error, fontSize: 13, fontWeight: "600" },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  emptyText: { color: colors.navy, fontSize: 16, fontWeight: "700" },
});
