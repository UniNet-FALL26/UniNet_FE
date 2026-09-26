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
          if (detail.roles?.[0]) setJoinRole(detail.roles[0].role);
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
  const isCreator = project ? account?.id === project.creator?.id : false;
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

  const isRecruiting = project.recruitmentStatus === "ĐANG TUYỂN";
  const isPublic = project.status === "CÔNG KHAI";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER WITH SYNCED BACK BUTTON */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.eyebrow}>
            {project.projectField?.toUpperCase() || "CHI TIẾT DỰ ÁN"}
          </Text>
          <Text style={styles.title}>{project.title}</Text>
        </View>
      </View>

      {/* STATUS BADGES & CREATOR BAR */}
      <View style={styles.creatorBanner}>
        <View style={styles.creatorProfile}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorAvatarText}>
              {initials(project.creator?.displayName || "UN")}
            </Text>
          </View>
          <View>
            <Text style={styles.creatorLabel}>Người khởi xướng</Text>
            <Text style={styles.creatorName}>
              {project.creator?.displayName || "Thành viên UniNet"}
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              isRecruiting ? styles.badgeSuccess : styles.badgeMuted,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isRecruiting ? styles.badgeTextSuccess : styles.badgeTextMuted,
              ]}
            >
              ● {project.recruitmentStatus}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              isPublic ? styles.badgePrimary : styles.badgePrivate,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isPublic ? styles.badgeTextPrimary : styles.badgeTextPrivate,
              ]}
            >
              {isPublic ? "🌐 Công khai" : "🔒 Riêng tư"}
            </Text>
          </View>
        </View>
      </View>

      {/* METRIC CARDS */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>👥</Text>
          <Text style={styles.metricValue}>
            {project.currentMemberCount} / {project.memberTarget}
          </Text>
          <Text style={styles.metricLabel}>Thành viên</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>⏳</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {project.estimatedDuration || "Tự do"}
          </Text>
          <Text style={styles.metricLabel}>Thời lượng</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>📅</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {formatDate(project.recruitmentDeadline)}
          </Text>
          <Text style={styles.metricLabel}>Hạn chót tuyển</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>⚡</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {project.commitmentLevel || "Thỏa thuận"}
          </Text>
          <Text style={styles.metricLabel}>Cam kết</Text>
        </View>
      </View>

      {/* DESCRIPTION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mô tả dự án</Text>
        </View>
        <Text style={styles.descriptionText}>{project.description}</Text>
      </View>

      {/* TECHNOLOGIES */}
      {project.technologies?.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Công nghệ sử dụng</Text>
          </View>
          <View style={styles.tagsContainer}>
            {project.technologies.map((tech) => (
              <View key={tech} style={styles.techTag}>
                <Text style={styles.techTagText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ROLES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Vị trí đang tìm kiếm</Text>
          <Text style={styles.sectionCountText}>
            {project.roles?.length || 0} vai trò
          </Text>
        </View>

        <View style={styles.rolesList}>
          {project.roles.map((role, idx) => (
            <View key={role.id || idx} style={styles.roleCard}>
              <View style={styles.roleCardHeader}>
                <View style={styles.roleNameWrap}>
                  <View style={styles.roleBullet} />
                  <Text style={styles.roleName}>{role.role}</Text>
                </View>
                <View style={styles.roleQuantityBadge}>
                  <Text style={styles.roleQuantityText}>
                    Cần {role.quantity} bạn
                  </Text>
                </View>
              </View>

              {role.requirements ? (
                <View style={styles.roleReqBox}>
                  <Text style={styles.roleReqLabel}>Yêu cầu:</Text>
                  <Text style={styles.roleRequirements}>
                    {role.requirements}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* MORE DETAILS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thông tin bàn giao & kế hoạch</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Lĩnh vực chuyên ngành:</Text>
          <Text style={styles.detailValue}>
            {project.projectField || "Công nghệ phần mềm"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Sản phẩm đầu ra dự kiến:</Text>
          <Text style={styles.detailValue}>
            {project.expectedOutput
              ? formatDate(project.expectedOutput)
              : "Chưa thiết lập"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Thời gian ước tính:</Text>
          <Text style={styles.detailValue}>
            {project.estimatedDuration ?? "Linh hoạt"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mức độ cam kết thời gian:</Text>
          <Text style={styles.detailValue}>
            {project.commitmentLevel ?? "Không bắt buộc"}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* JOIN REQUEST SECTION (GUEST) */}
      {!isCreator && canRecruit && joinRequestState === "idle" && (
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Tham gia cùng nhóm</Text>
          <Text style={styles.actionCardSub}>
            Chọn vị trí bạn tự tin đóng góp và gửi lời nhắn cho người khởi tạo.
          </Text>

          <Text style={styles.inputLabel}>Chọn vai trò muốn ứng tuyển *</Text>
          <View style={styles.rolePickerWrap}>
            {roleOptions.map((role) => {
              const active = joinRole === role.role;
              return (
                <Pressable
                  key={role.id}
                  onPress={() => setJoinRole(role.role)}
                  style={[
                    styles.roleChoiceChip,
                    active && styles.roleChoiceChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChoiceText,
                      active && styles.roleChoiceTextActive,
                    ]}
                  >
                    {role.role}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Lời nhắn / Giới thiệu bản thân"
            value={joinMessage}
            onChangeText={setJoinMessage}
            placeholder="Chia sẻ lý do, kinh nghiệm hoặc kỹ năng nổi bật..."
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />

          <Button
            title="Gửi đơn ứng tuyển"
            variant="primary"
            onPress={handleJoinRequest}
            style={styles.fullButton}
          />
        </View>
      )}

      {!isCreator && canRecruit && joinRequestState === "pending" && (
        <View style={styles.statusBox}>
          <Text style={styles.statusBoxIcon}>⏳</Text>
          <Text style={styles.statusBoxTitle}>Đang đợi duyệt hồ sơ</Text>
          <Text style={styles.statusBoxDesc}>
            Lời nhắn của bạn đã được chuyển đến người khởi xướng dự án.
          </Text>
          <Button
            title="Rút lại yêu cầu"
            variant="outline"
            onPress={handleWithdrawRequest}
            style={{ marginTop: 8 }}
          />
        </View>
      )}

      {!isCreator && joinRequestState === "member" && (
        <View style={[styles.statusBox, styles.statusBoxSuccess]}>
          <Text style={styles.statusBoxIcon}>🎉</Text>
          <Text style={styles.statusBoxTitle}>Bạn đã là thành viên</Text>
          <Text style={styles.statusBoxDesc}>
            Bạn đang cùng xây dựng và phát triển dự án này.
          </Text>
        </View>
      )}

      {/* RECOMMENDATIONS (CREATOR VIEW) */}
      {isCreator && canRecruit && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Gợi ý nhân sự phù hợp (AI)</Text>
            <Text style={styles.sectionCountText}>
              {recommendations.length} ứng viên
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {recommendations.map((rec) => {
              const isInvited = invitedIds.includes(rec.id);
              return (
                <View key={rec.id} style={styles.candidateCard}>
                  <View style={styles.candidateTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {initials(rec.fullName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.candidateName}>{rec.fullName}</Text>
                      <Text style={styles.candidateRole}>
                        Vị trí gợi ý: {rec.recommendedRole}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.candidateSkillBox}>
                    <Text style={styles.candidateSkillsLabel}>Kỹ năng:</Text>
                    <Text style={styles.candidateSkills}>{rec.skills}</Text>
                  </View>

                  {rec.reason ? (
                    <Text style={styles.candidateReason}>💡 {rec.reason}</Text>
                  ) : null}

                  <View style={styles.candidateActions}>
                    <Button
                      title="Hồ sơ"
                      variant="outline"
                      onPress={() => router.back()}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={isInvited ? "Đã gửi lời mời" : "Mời tham gia"}
                      variant="primary"
                      disabled={isInvited}
                      onPress={() => handleInvite(rec)}
                      style={{ flex: 1.4 }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
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

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 780,
    width: "100%",
    alignSelf: "center",
  },

  /* HEADER & BACK BUTTON (SYNCED VỚI CREATE FORM) */
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.65,
  },
  backIcon: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2,
  },
  headerInfo: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
  },

  /* CREATOR BANNER */
  creatorBanner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  creatorProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  creatorAvatarText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  creatorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  creatorName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeSuccess: {
    backgroundColor: "#E8F8F0",
  },
  badgeTextSuccess: {
    color: "#0F9D58",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeMuted: {
    backgroundColor: "#F1F5F9",
  },
  badgeTextMuted: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  badgePrimary: {
    backgroundColor: "#EEF5FF",
  },
  badgeTextPrimary: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  badgePrivate: {
    backgroundColor: "#FFF4E5",
  },
  badgeTextPrivate: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },

  /* METRICS GRID */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: "flex-start",
  },
  metricIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  /* SECTION CARDS */
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  descriptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },

  /* TAGS */
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  techTag: {
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#D3E4FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  techTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  /* ROLES LIST */
  rolesList: {
    gap: 10,
  },
  roleCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 12,
    gap: 8,
  },
  roleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  roleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  roleName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  roleQuantityBadge: {
    backgroundColor: "#E8F1FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleQuantityText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  roleReqBox: {
    backgroundColor: colors.surface,
    padding: 9,
    borderRadius: 8,
  },
  roleReqLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  roleRequirements: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },

  /* DETAILS LIST */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },

  /* ACTION BOX (GUEST FORM) */
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  actionCardTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
  },
  actionCardSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  rolePickerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChoiceChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleChoiceChipActive: {
    backgroundColor: "#EEF5FF",
    borderColor: colors.primary,
  },
  roleChoiceText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  roleChoiceTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  fullButton: {
    width: "100%",
  },

  /* STATUS BANNER BOXES */
  statusBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  statusBoxSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  statusBoxIcon: {
    fontSize: 26,
  },
  statusBoxTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  statusBoxDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },

  /* RECOMMENDATION CANDIDATE CARDS */
  candidateCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: colors.background,
  },
  candidateTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  candidateName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  candidateRole: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  candidateSkillBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
  },
  candidateSkillsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  candidateSkills: {
    color: colors.textPrimary,
    fontSize: 11,
    flex: 1,
  },
  candidateReason: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  candidateActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  /* ERROR */
  errorBox: {
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD1D1",
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  emptyText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
  },
});
