import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import {
  API_PROJECT_STATUS_LABEL,
  ApiProjectStatus,
  ApiRecruitmentStatus,
  ProjectVisibility,
  type ProjectDetail,
  type ProjectRecommendation,
} from "@/types/project";
import { ProjectEditForm } from "@/components/projects/ProjectEditForm";
import { CompletedDetailView } from "@/components/projects/CompletedDetailView";
import { RecommendedMemberCard } from "@/components/projects/RecommendedMemberCard";
import { useAuthStore } from "@/store/auth.store";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useWindowDimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function ProjectDetailScreen() {
  const compact = useWindowDimensions().width < 600;
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [recommendations, setRecommendations] = useState<
    ProjectRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [joinRole, setJoinRole] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { account } = useAuthStore();
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; operation: () => Promise<unknown>; deleted?: boolean } | null>(null);
  const [acting, setActing] = useState(false);
  const actingRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setRecommendationsLoading(false);
    setLoading(true);
    setError(null);
    setProject(null);
    setRecommendations([]);
    setJoinRole("");
    setJoinMessage("");
    setConfirmation(null);
    async function load() {
      try {
        if (!id) throw new Error("Không tìm thấy mã dự án.");
        const detail = await projectService.getProjectById(
          id,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setProject(detail);
        setJoinRole(detail.roleRequirements[0]?.roleName ?? "");
        setLoading(false);
        if (detail.isCreator && detail.status === ApiProjectStatus.Active) {
          setRecommendationsLoading(true);
          const recs = await projectService.fetchRecommendations(id, controller.signal);
          if (!controller.signal.aborted) setRecommendations(recs);
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải thông tin dự án.",
          );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRecommendationsLoading(false);
        }
      }
    }
    load();
    return () => controller.abort();
  }, [id, retry, account?.id]);

  const roleOptions = useMemo(() => project?.roleRequirements ?? [], [project]);
  const isCreator = project?.isCreator === true;
  const isMember = project?.isMember === true;
  const isActive = project?.status === ApiProjectStatus.Active;
  const canRecruit = isActive && project?.recruitmentStatus === ApiRecruitmentStatus.Open && project?.visibility === ProjectVisibility.Public;
  const invitations = project?.invitations ?? [];
  const joinRequests = project?.joinRequests ?? [];
  const myInvitation = invitations.find((item) => item.inviteeId === account?.id && item.status === 0);
  const myJoinRequest = joinRequests.find((item) => item.userId === account?.id && item.status === 0);
  const invitedIds = invitations.filter((item) => item.status === 0).map((item) => item.inviteeId);

  const askConfirmation = (title: string, message: string, operation: () => Promise<unknown>) => {
    if (actingRef.current) return;
    setError(null);
    setConfirmation({ title, message, operation });
  };
  const confirmAction = async () => {
    if (!confirmation || actingRef.current) return;
    actingRef.current = true;
    setActing(true);
    setError(null);
    try {
      await confirmation.operation();
      setConfirmation(null);
      setNotice("Thao tác thành công.");
      if (confirmation.deleted) router.replace("/(tabs)/groups" as never);
      else setRetry((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };
  const handleJoinRequest = () => {
    if (!project || isCreator || isMember || !canRecruit || myInvitation || myJoinRequest) return;
    if (!joinRole) { setError("Bạn cần chọn một vai trò để gửi yêu cầu tham gia."); return; }
    askConfirmation("Gửi yêu cầu tham gia", `Bạn muốn tham gia dự án với vai trò ${joinRole}?`, () => projectService.submitJoinRequest({ projectId: project.id, role: joinRole, message: joinMessage.trim() || undefined }));
  };
  const handleWithdrawRequest = () => {
    if (!myJoinRequest) return;
    askConfirmation("Hủy yêu cầu tham gia", "Bạn muốn hủy yêu cầu tham gia dự án này?", () => projectService.cancelJoinRequest(myJoinRequest.id));
  };
  const handleInvite = async (recommendation: ProjectRecommendation, role: string) => {
    if (!project || !isCreator || !isActive || invitedIds.includes(recommendation.userId)) return;
    askConfirmation("Mời thành viên", `Mời ${recommendation.fullName} tham gia với vai trò ${role}?`, () => projectService.sendInvitation({ projectId: project.id, inviteeId: recommendation.userId, role, message: "Mời bạn tham gia dự án." }));
  };

  if (loading) return <Loading />;
  if (!project)
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyText}>{error || "Không tìm thấy dự án."}</Text>
        <Button
          title="Thử lại"
          onPress={() => setRetry((value) => value + 1)}
        />
        <Button
          title="Quay lại"
          variant="outline"
          onPress={() => router.dismissTo("/(tabs)/groups" as never)}
        />
      </View>
    );

  if (project.status === ApiProjectStatus.Completed) return <CompletedDetailView key={`${account?.id}:${project.id}:${tab ?? ''}`} project={project} initialTab={tab} />;

  const isRecruiting = isActive && project.recruitmentStatus === ApiRecruitmentStatus.Open;
  const isPublic = project.visibility === ProjectVisibility.Public;
  // The API count excludes the project creator.
  const memberCount = project.currentMemberCount;
  const members = project.members.some((member) => member.userId === project.creator.id)
    ? project.members
    : [{ userId: project.creator.id, fullName: project.creator.fullName, nickname: project.creator.nickname, avatarUrl: project.creator.avatarUrl, role: "Người tạo dự án", status: 0, joinedAt: project.createdAt }, ...project.members];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* HEADER WITH SYNCED BACK BUTTON */}
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroOrb} />
        <View pointerEvents="none" style={styles.heroOrbSmall} />
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại danh sách dự án"
            hitSlop={12}
            onPress={() => router.dismissTo("/(tabs)/groups" as never)}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.eyebrow}>
              {project.projectField || "Chi tiết dự án"}
            </Text>
            <Text style={styles.title}>{project.title}</Text>
          </View>
        </View>

        {/* STATUS BADGES & CREATOR BAR */}
        <View style={styles.creatorBanner}>
          <View style={styles.creatorProfile}>
            <View style={styles.creatorAvatar}>
              {project.creator.avatarUrl ? (
                <Image
                  source={{ uri: project.creator.avatarUrl }}
                  style={styles.creatorImage}
                />
              ) : (
                <Text style={styles.creatorAvatarText}>
                  {initials(project.creator?.fullName || "UN")}
                </Text>
              )}
            </View>
            <View style={styles.heroCreatorInfo}>
              <Text style={styles.creatorLabel}>Người tạo dự án</Text>
              <Text style={[styles.creatorName, styles.heroCreatorName]}>
                {project.creator?.fullName || "Thành viên UniNet"}
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
                ●{" "}
                {
                  project.status !== ApiProjectStatus.Active ? API_PROJECT_STATUS_LABEL[project.status] : (
                    [
                      "Đang tuyển",
                      "Đã đủ thành viên",
                      "Đã đóng",
                      "Đã hủy",
                      "Hết hạn",
                    ] as const
                  )[project.recruitmentStatus]
                }
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
                {isPublic ? "Công khai" : "Riêng tư"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* METRIC CARDS */}
      <View style={[styles.metricsGrid, compact && { flexDirection: "column" }]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricKicker}>ĐỘI NGŨ DỰ ÁN</Text>
          <Text style={styles.metricValue}>
            {memberCount} / {project.memberTarget}
          </Text>
          <Text style={styles.metricLabel}>Thành viên</Text>
          <View style={styles.memberTrack}>
            <View style={[styles.memberFill, { width: `${project.memberTarget > 0 ? Math.min(Math.max(memberCount / project.memberTarget, 0), 1) * 100 : 0}%` }]} />
          </View>
        </View>

        <View style={[styles.metricCard, styles.deadlineCard]}>
          <Text style={[styles.metricKicker, styles.deadlineKicker]}>THỜI GIAN TUYỂN</Text>
          <Text style={[styles.metricValue, styles.deadlineValue]}>
            {formatDateTime(project.recruitmentDeadline)}
          </Text>
          <Text style={styles.metricLabel}>Hạn chót tuyển</Text>
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
      {project.skills.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Công nghệ sử dụng</Text>
          </View>
          <View style={styles.tagsContainer}>
            {project.skills.map((skill) => (
              <View key={skill.skillId} style={styles.techTag}>
                <Text style={styles.techTagText}>{skill.skillName}</Text>
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
            {project.roleRequirements?.length || 0} vai trò
          </Text>
        </View>

        <View style={styles.rolesList}>
          {project.roleRequirements.map((role, idx) => (
            <View key={role.id || idx} style={styles.roleCard}>
              <View style={styles.roleCardHeader}>
                <View style={styles.roleNameWrap}>
                  <View style={styles.roleBullet} />
                  <Text style={styles.roleName}>{role.roleName}</Text>
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

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thành viên trong nhóm</Text>
          <Text style={styles.sectionCountText}>
            {members.length} thành viên
          </Text>
        </View>
        {members.length === 0 ? (
          <Text style={styles.descriptionText}>
            Chưa có thành viên trong nhóm.
          </Text>
        ) : (
          members.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.creatorAvatar}>
                {member.avatarUrl ? (
                  <Image
                    source={{ uri: member.avatarUrl }}
                    style={styles.creatorImage}
                  />
                ) : (
                  <Text style={styles.creatorAvatarText}>
                    {initials(member.fullName || member.nickname || "UN")}
                  </Text>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.creatorName}>
                  {member.fullName || "Chưa cập nhật tên"}
                </Text>
                <Text style={styles.memberMeta}>
                  Nickname: {member.nickname || "Chưa cập nhật"}
                </Text>
                <Text style={styles.candidateRole}>
                  Vai trò: {member.role || "Chưa cập nhật"}
                </Text>
                <Text style={styles.memberMeta}>
                  Ngày tham gia: {formatDate(member.joinedAt)}
                </Text>
              </View>
              {isCreator && isActive && member.userId !== project.creator.id && (
                <Button title="Xóa thành viên" variant="outline" disabled={acting} onPress={() => askConfirmation("Xóa thành viên", `Bạn muốn xóa ${member.fullName} khỏi dự án?`, () => projectService.kickMember(project.id, member.userId))} />
              )}
            </View>
          ))
        )}
      </View>

      {/* MORE DETAILS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thông tin dự án</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Trạng thái dự án:</Text>
          <Text style={styles.detailValue}>{API_PROJECT_STATUS_LABEL[project.status] ?? "Chưa cập nhật"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Lĩnh vực:</Text>
          <Text style={styles.detailValue}>
            {project.projectField || "Công nghệ phần mềm"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dự kiến hoàn thành:</Text>
          <Text style={styles.detailValue}>
            {project.expectedOutput
              ? formatDateTime(project.expectedOutput)
              : "Chưa thiết lập"}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {!confirmation && <Button title="Thử lại" onPress={() => setRetry((value) => value + 1)} />}
        </View>
      ) : null}

      {/* JOIN REQUEST SECTION (GUEST) */}
      {!isCreator && !isMember && canRecruit && !myInvitation && !myJoinRequest && (
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Tham gia cùng nhóm</Text>
          <Text style={styles.actionCardSub}>
            Chọn vị trí bạn tự tin đóng góp và gửi lời nhắn cho người khởi tạo.
          </Text>

          <Text style={styles.inputLabel}>Chọn vai trò muốn ứng tuyển *</Text>
          <View style={styles.rolePickerWrap}>
            {roleOptions.map((role) => {
              const active = joinRole === role.roleName;
              return (
                <Pressable
                  key={role.id}
                  onPress={() => setJoinRole(role.roleName)}
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
                    {role.roleName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input appearance="project"

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

      {!isCreator &&
        !isMember &&
        isActive &&
        !!myJoinRequest && (
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

      {!isCreator && isMember && isActive && (
        <View style={[styles.statusBox, styles.statusBoxSuccess]}>
          <Text style={styles.statusBoxIcon}>🎉</Text>
          <Text style={styles.statusBoxTitle}>Bạn đã là thành viên</Text>
          <Text style={styles.statusBoxDesc}>
            Bạn đang cùng xây dựng và phát triển dự án này.
          </Text>
        </View>
      )}

      {notice ? <Text accessibilityRole="alert" style={styles.descriptionText}>{notice}</Text> : null}

      {!isCreator && isMember && isActive && <Button title="Rời dự án" variant="outline" disabled={acting} onPress={() => askConfirmation("Rời dự án", "Bạn muốn rời dự án này?", () => projectService.leaveProject(project.id))} />}

      {!isCreator && !isMember && isActive && myInvitation && (
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Lời mời tham gia dự án</Text>
          <Text style={styles.descriptionText}>{myInvitation.inviterFullName} mời bạn tham gia với vai trò {myInvitation.role}.</Text>
          {!!myInvitation.message && <Text style={styles.descriptionText}>{myInvitation.message}</Text>}
          <Button title="Chấp nhận lời mời" disabled={acting} onPress={() => askConfirmation("Chấp nhận lời mời", "Bạn muốn chấp nhận lời mời tham gia dự án?", () => projectService.acceptInvitation(myInvitation.id))} />
          <Button title="Từ chối lời mời" variant="outline" disabled={acting} onPress={() => askConfirmation("Từ chối lời mời", "Bạn muốn từ chối lời mời này?", () => projectService.rejectInvitation(myInvitation.id))} />
        </View>
      )}

      {isCreator && isActive && <>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lời mời đã gửi</Text>
          {!invitations.length && <Text style={styles.descriptionText}>Chưa có lời mời nào.</Text>}
          {invitations.map((invitation) => <View key={invitation.id} style={styles.managementRow}>
            <Text style={styles.creatorName}>{invitation.inviteeFullName}</Text>
            <Text style={styles.descriptionText}>Vai trò: {invitation.role} · {invitation.status === 0 ? "Đang chờ phản hồi" : "Đã xử lý"}</Text>
            {!!invitation.message && <Text style={styles.descriptionText}>{invitation.message}</Text>}
            {invitation.status === 0 && <Button title="Hủy lời mời" variant="outline" disabled={acting} onPress={() => askConfirmation("Hủy lời mời", `Hủy lời mời gửi đến ${invitation.inviteeFullName}?`, () => projectService.cancelInvitation(invitation.id))} />}
          </View>)}
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Yêu cầu tham gia</Text>
          {!joinRequests.length && <Text style={styles.descriptionText}>Chưa có yêu cầu tham gia nào.</Text>}
          {joinRequests.map((request) => <View key={request.id} style={styles.managementRow}>
            <Text style={styles.creatorName}>{request.fullName}</Text>
            <Text style={styles.descriptionText}>Vai trò: {request.role} · {request.status === 0 ? "Chờ duyệt" : "Đã xử lý"}</Text>
            {!!request.message && <Text style={styles.descriptionText}>{request.message}</Text>}
            {request.status === 0 && <View style={styles.managementActions}>
              <Button title="Đồng ý" style={{ flex: 1 }} disabled={acting} onPress={() => askConfirmation("Đồng ý yêu cầu", `Cho phép ${request.fullName} tham gia dự án?`, () => projectService.acceptJoinRequest(request.id))} />
              <Button title="Từ chối" style={{ flex: 1 }} variant="outline" disabled={acting} onPress={() => askConfirmation("Từ chối yêu cầu", `Từ chối yêu cầu của ${request.fullName}?`, () => projectService.rejectJoinRequest(request.id))} />
            </View>}
          </View>)}
        </View>
      </>}

      {isCreator && project.status === ApiProjectStatus.Rejected && <View style={styles.actionCard}>
        <Text style={styles.actionCardTitle}>Dự án bị từ chối</Text>
        <Text style={styles.descriptionText}>Bạn có thể chỉnh sửa thông tin dự án hoặc xóa dự án.</Text>
        <Button title="Chỉnh sửa dự án" disabled={acting} onPress={() => setEditing(true)} />
        <Button title="Xóa dự án" variant="outline" disabled={acting} onPress={() => setConfirmation({ title: "Xóa dự án", message: `Bạn muốn xóa dự án “${project.title}”? Thao tác này không thể hoàn tác.`, operation: () => projectService.deleteProject(project.id), deleted: true })} />
      </View>}
      {editing && <ProjectEditForm project={project} onClose={() => setEditing(false)} onSaved={(updated) => { setProject(updated); setEditing(false); setError(null); setNotice("Đã cập nhật dự án."); }} />}

      {/* RECOMMENDATIONS (CREATOR VIEW) */}
      {isCreator && isActive && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Gợi ý thành viên phù hợp:</Text>
            <Text style={styles.sectionCountText}>
              {recommendations.length} ứng viên
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {recommendationsLoading && <Text style={styles.descriptionText}>Đang tải gợi ý thành viên...</Text>}
            {!recommendationsLoading && recommendations.length === 0 && !error && <Text style={styles.descriptionText}>Chưa có gợi ý thành viên phù hợp.</Text>}
            {recommendations.map((rec) => (
              <RecommendedMemberCard key={rec.userId} member={rec} roles={project.roleRequirements} invited={invitedIds.includes(rec.userId)} onInvite={handleInvite} />
            ))}
          </View>
        </View>
      )}
      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => { if (!acting) setConfirmation(null); }}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard} accessibilityViewIsModal>
            <Text style={styles.actionCardTitle}>{confirmation?.title}</Text>
            <Text style={styles.descriptionText}>{confirmation?.message}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
            <View style={styles.managementActions}>
              <Button title="Quay lại" style={{ flex: 1 }} variant="outline" disabled={acting} onPress={() => setConfirmation(null)} />
              <Button title="Xác nhận" style={{ flex: 1 }} loading={acting} onPress={confirmAction} />
            </View>
          </View>
        </View>
      </Modal>
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

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

const styles = StyleSheet.create({
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  confirmCard: { width: "100%", maxWidth: 440, backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 16 },
  managementRow: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 14 },
  managementActions: { flexDirection: "row", gap: 10 },
  creatorImage: { width: 40, height: 40, borderRadius: 20 },
  memberRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  memberInfo: { flex: 1, gap: 4 },
  memberMeta: { color: colors.textSecondary, fontSize: 12 },
  container: {
    flex: 1,
    backgroundColor: "#F2F5FC",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
  },

  /* HEADER & BACK BUTTON (SYNCED VỚI CREATE FORM) */
  hero: {
    backgroundColor: "#102D62",
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    gap: 16,
  },
  heroOrb: { position: "absolute", width: 250, height: 250, borderRadius: 125, right: -120, top: -100, backgroundColor: "#204780", borderWidth: 30, borderColor: "#1A3C70" },
  heroOrbSmall: { position: "absolute", width: 100, height: 100, borderRadius: 50, right: 50, bottom: -75, backgroundColor: "#315A96" },
  heroCreatorInfo: { flex: 1, minWidth: 0, gap: 4 },
  heroCreatorName: { color: "#FFFFFF" },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#254777",
    borderWidth: 1,
    borderColor: "#496590",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.65,
  },
  backIcon: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#A9DFED",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 37,
  },

  /* CREATOR BANNER */
  creatorBanner: {
    borderTopWidth: 1,
    borderTopColor: "#385381",
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  creatorProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 170,
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
    fontWeight: "600",
    fontSize: 13,
  },
  creatorLabel: {
    color: "#CCDCF5",
    fontSize: 11,
  },
  creatorName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeSuccess: {
    backgroundColor: "#E8F8F0",
  },
  badgeCompleted: {
    backgroundColor: colors.projectCompletedBackground,
    borderWidth: 1,
    borderColor: colors.projectCompletedBorder,
  },
  badgeTextCompleted: { color: colors.projectCompleted },
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
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#D9E5FA",
    borderRadius: 20,
    padding: 16,
    alignItems: "flex-start",
    gap: 4,
    minHeight: 132,
  },
  metricKicker: { color: colors.primaryDark, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  deadlineCard: { backgroundColor: "#EDF3FF" },
  deadlineKicker: { color: "#4D6090" },
  deadlineValue: { fontSize: 18, lineHeight: 27 },
  memberTrack: { height: 5, width: "100%", backgroundColor: "#E3ECFA", borderRadius: 3, overflow: "hidden", marginTop: 10 },
  memberFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  metricIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 26,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1E8F5",
    padding: 20,
    gap: 12,
    shadowColor: "#0B3E9C",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  descriptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 24,
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
    borderRadius: 12,
    minHeight: 36,
    maxWidth: "100%",
    justifyContent: "center",
  },
  techTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  /* ROLES LIST */
  rolesList: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  roleCardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
  },
  roleQuantityBadge: {
    backgroundColor: "#E8F1FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: "auto",
  },
  roleQuantityText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  roleReqBox: {
    backgroundColor: "#EEF5FF",
    padding: 12,
    borderRadius: 12,
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
    paddingVertical: 10,
    flexWrap: "wrap",
    gap: 8,
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
    flexShrink: 1,
  },

  /* ACTION BOX (GUEST FORM) */
  actionCard: {
    backgroundColor: "#EDF4FF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#CDDFFA",
    padding: 20,
    gap: 14,
  },
  actionCardTitle: {
    color: colors.navy,
    fontSize: 20,
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
    paddingVertical: 12,
  },
  roleChoiceChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.primary,
  },
  roleChoiceText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  roleChoiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  fullButton: {
    width: "100%",
    borderRadius: 14,
    minHeight: 54,
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
    fontWeight: "600",
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
    fontWeight: "600",
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
