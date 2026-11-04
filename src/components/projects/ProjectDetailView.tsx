import { ProjectOverview } from '@/components/projects/ProjectOverview';
import { ToastHost } from '@/components/ui/ToastHost';
import { ActionFeedback } from '@/components/ui/ActionFeedback';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import {
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
  Image,
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProjectDetailScreen() {
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
  const [managementTab, setManagementTab] = useState<"members" | "requests">("members");
  const [selectedMember, setSelectedMember] = useState<ProjectDetail["members"][number] | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

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
    setManagementTab("members");
    setSelectedMember(null);
    setOptionsVisible(false);
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
  const teamMembers = useMemo(() => {
    if (!project) return [];
    const leaderId = project.leader?.userId ?? project.creator.id;
    const members = [...project.members];
    if (!members.some((member) => member.userId === project.creator.id)) {
      members.push({
        userId: project.creator.id,
        fullName: project.creator.fullName,
        nickname: project.creator.nickname,
        avatarUrl: project.creator.avatarUrl,
        role: "Người tạo dự án",
        status: 0,
        joinedAt: project.createdAt,
      });
    }
    const leader = members.find((member) => member.userId === leaderId) ?? {
      userId: leaderId,
      fullName: project.leader?.fullName || project.creator.fullName,
      nickname: project.leader?.nickname ?? project.creator.nickname,
      avatarUrl: project.leader?.avatarUrl ?? project.creator.avatarUrl,
      role: project.leader?.role || "Trưởng nhóm",
      status: project.leader?.status ?? 0,
      joinedAt: project.leader?.joinedAt ?? project.createdAt,
    };
    return [leader, ...members.filter((member) => member.userId !== leaderId)];
  }, [project]);

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
  const handleJoinRequest = (role = joinRole) => {
    if (!project || isCreator || isMember || !canRecruit || myInvitation || myJoinRequest) return;
    if (!role) { setError("Bạn cần chọn một vai trò để gửi yêu cầu tham gia."); return; }
    setJoinRole(role);
    askConfirmation("Gửi yêu cầu tham gia", `Bạn muốn tham gia dự án với vai trò ${role}?`, () => projectService.submitJoinRequest({ projectId: project.id, role, message: joinMessage.trim() || undefined }));
  };
  const shareProject = async () => {
    try {
      await Share.share({ message: `${project?.title ?? ""}\n${project?.description ?? ""}`.trim() });
      setOptionsVisible(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể chia sẻ dự án.");
    }
  };
  const openMemberActions = (member: ProjectDetail["members"][number]) => setSelectedMember(member);
  const removeSelectedMember = () => {
    if (!project || !selectedMember) return;
    const member = selectedMember;
    setSelectedMember(null);
    askConfirmation("Xóa thành viên", `Bạn muốn xóa ${member.fullName} khỏi dự án?`, () => projectService.kickMember(project.id, member.userId));
  };
  const handleWithdrawRequest = () => {
    if (!myJoinRequest) return;
    askConfirmation("Hủy yêu cầu tham gia", "Bạn muốn hủy yêu cầu tham gia dự án này?", () => projectService.cancelJoinRequest(myJoinRequest.id));
  };
  const handleInvite = async (recommendation: ProjectRecommendation, role: string) => {
    if (!project || !isCreator || !isActive || invitedIds.includes(recommendation.userId)) return;
    askConfirmation("Mời thành viên", `Mời ${recommendation.fullName} tham gia với vai trò ${role}?`, () => projectService.sendInvitation({ projectId: project.id, inviteeId: recommendation.userId, role, message: "Mời bạn tham gia dự án." }));
  };

  if (loading) return <SafeAreaView style={styles.safeArea}><Loading /></SafeAreaView>;
  if (!project)
    return (
      <SafeAreaView style={styles.safeArea}><View style={styles.stateContainer}>
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
      </View></SafeAreaView>
    );

  if (project.status === ApiProjectStatus.Completed) return <CompletedDetailView key={`${account?.id}:${project.id}:${tab ?? ''}`} project={project} initialTab={tab} />;


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <View style={styles.overviewHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại danh sách dự án" android_ripple={{ color: "#E2E8F0", borderless: true }} onPress={() => router.dismissTo('/(tabs)/groups' as never)} style={styles.overviewBack}><Text style={styles.overviewBackText}>‹</Text></Pressable>
        <View style={styles.headerTitleWrap}><Text style={styles.overviewEyebrow}>CHI TIẾT DỰ ÁN</Text><Text role="heading" aria-level={1} numberOfLines={2} style={styles.overviewTitle}>{project.title}</Text><Text style={[styles.statusHeaderBadge, project.status === ApiProjectStatus.Active ? styles.activeHeaderBadge : styles.inactiveHeaderBadge]}>{project.status === ApiProjectStatus.Active ? "Đang hoạt động" : project.status === ApiProjectStatus.Rejected ? "Bị từ chối" : "Chờ duyệt"}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ dự án" android_ripple={{ color: "#E2E8F0", borderless: true }} onPress={() => void shareProject()} style={styles.headerIcon}><Text style={styles.headerIconText}>↗</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn dự án" android_ripple={{ color: "#E2E8F0", borderless: true }} onPress={() => setOptionsVisible(true)} style={styles.headerIcon}><Text style={styles.headerIconText}>⋮</Text></Pressable>
      </View>
      <ProjectOverview
        project={project}
        showMembers={false}
        onApplyRole={!isCreator && !isMember && canRecruit && !myInvitation && !myJoinRequest ? handleJoinRequest : undefined}
      />

      <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Thành viên & quản lý nhóm</Text>
            <Text style={styles.sectionCountText}>{teamMembers.length} thành viên</Text>
          </View>
          {isCreator && isActive && <View style={styles.segmentedControl}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: managementTab === "members" }} android_ripple={{ color: "#E2E8F0" }} onPress={() => setManagementTab("members")} style={[styles.segment, managementTab === "members" && styles.segmentActive]}>
              <Text style={[styles.segmentText, managementTab === "members" && styles.segmentTextActive]}>Thành viên</Text>
            </Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: managementTab === "requests" }} android_ripple={{ color: "#E2E8F0" }} onPress={() => setManagementTab("requests")} style={[styles.segment, managementTab === "requests" && styles.segmentActive]}>
              <Text style={[styles.segmentText, managementTab === "requests" && styles.segmentTextActive]}>Yêu cầu duyệt{joinRequests.filter((request) => request.status === 0).length ? ` · ${joinRequests.filter((request) => request.status === 0).length}` : ""}</Text>
            </Pressable>
          </View>}
          {!isCreator || !isActive || managementTab === "members" ? (
            <View>
              {teamMembers.map((member, index) => {
                const isLeader = index === 0;
                const initials = (member.fullName || member.nickname || "UN").trim().split(/\s+/).slice(-2).map((word) => word[0]).join("").toUpperCase();
                return (
                  <View key={member.userId} style={[styles.memberRow, index > 0 && styles.memberRowBorder]}>
                    {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} accessibilityLabel={`Ảnh đại diện ${member.fullName}`} /> : <View style={styles.memberAvatarFallback}><Text style={styles.memberAvatarText}>{initials}</Text></View>}
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameLine}>
                        <Text numberOfLines={1} style={styles.creatorName}>{member.fullName || member.nickname}</Text>
                        {isLeader && <Text style={styles.leaderBadge}>Leader / Trưởng nhóm</Text>}
                      </View>
                      <Text style={styles.memberMeta}>{member.role || (isLeader ? "Trưởng nhóm" : "Thành viên")}</Text>
                      <Text style={styles.memberMeta}>Tham gia: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Tùy chọn thành viên ${member.fullName}`} android_ripple={{ color: "#E2E8F0", borderless: true }} onPress={() => openMemberActions(member)} style={styles.memberMenuButton}>
                      <Text style={styles.memberMenuText}>⋮</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View>
              <Text style={styles.subsectionTitle}>Yêu cầu tham gia</Text>
              {!joinRequests.length && <Text style={styles.descriptionText}>Chưa có yêu cầu tham gia nào.</Text>}
              {joinRequests.map((request) => {
                const status = request.status === 0 ? { label: "Chờ duyệt", style: styles.pendingBadge } : request.status === 1 ? { label: "Đã duyệt", style: styles.approvedBadge } : request.status === 2 ? { label: "Đã từ chối", style: styles.rejectedBadge } : { label: "Đã xử lý", style: styles.rejectedBadge };
                return <View key={request.id} style={styles.managementRow}>
                  <View style={styles.requestHeading}>
                    <Text style={styles.creatorName}>{request.fullName}</Text>
                    <Text style={[styles.requestStatusBadge, status.style]}>{status.label}</Text>
                  </View>
                  <Text style={styles.descriptionText}>Vai trò: {request.role}</Text>
                  {!!request.message && <Text style={styles.descriptionText}>{request.message}</Text>}
                  {request.status === 0 && <View style={styles.managementActions}>
                    <Button title="Chấp nhận" style={{ flex: 1 }} disabled={acting} onPress={() => askConfirmation("Đồng ý yêu cầu", `Cho phép ${request.fullName} tham gia dự án?`, () => projectService.acceptJoinRequest(request.id))} />
                    <Button title="Từ chối" style={{ flex: 1 }} variant="outline" disabled={acting} onPress={() => askConfirmation("Từ chối yêu cầu", `Từ chối yêu cầu của ${request.fullName}?`, () => projectService.rejectJoinRequest(request.id))} />
                  </View>}
                </View>;
              })}
              <Text style={[styles.subsectionTitle, styles.invitationSubheading]}>Lời mời đã gửi</Text>
              {!invitations.length && <Text style={styles.descriptionText}>Chưa có lời mời nào.</Text>}
              {invitations.map((invitation) => <View key={invitation.id} style={styles.managementRow}>
                <View style={styles.requestHeading}>
                  <Text style={styles.creatorName}>{invitation.inviteeFullName}</Text>
                  <Text style={[styles.requestStatusBadge, invitation.status === 0 ? styles.pendingBadge : invitation.status === 1 ? styles.approvedBadge : styles.rejectedBadge]}>{invitation.status === 0 ? "Chờ phản hồi" : invitation.status === 1 ? "Đã chấp nhận" : "Đã xử lý"}</Text>
                </View>
                <Text style={styles.descriptionText}>Vai trò: {invitation.role}</Text>
                {!!invitation.message && <Text style={styles.descriptionText}>{invitation.message}</Text>}
                {invitation.status === 0 && <Button title="Hủy lời mời" variant="outline" disabled={acting} onPress={() => askConfirmation("Hủy lời mời", `Hủy lời mời gửi đến ${invitation.inviteeFullName}?`, () => projectService.cancelInvitation(invitation.id))} />}
              </View>)}
            </View>
          )}
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
                  android_ripple={{ color: "#E2E8F0" }}
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

      {notice ? <ActionFeedback type="success" message={notice} /> : null}

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
        <View style={styles.confirmOverlay}>{!!confirmation && <ToastHost modal />}
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
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng tùy chọn" android_ripple={{ color: "#E2E8F0" }} style={styles.menuBackdrop} onPress={() => setOptionsVisible(false)} />
          <View style={styles.menuCard}>
            <Text style={styles.actionCardTitle}>Tùy chọn dự án</Text>
            <Pressable accessibilityRole="button" android_ripple={{ color: "#E2E8F0" }} onPress={() => void shareProject()} style={styles.menuItem}><Text style={styles.menuItemText}>Chia sẻ dự án</Text></Pressable>
            <Pressable accessibilityRole="button" android_ripple={{ color: "#E2E8F0" }} onPress={() => { setOptionsVisible(false); setRetry((value) => value + 1); }} style={styles.menuItem}><Text style={styles.menuItemText}>Làm mới thông tin</Text></Pressable>
            <Button title="Đóng" variant="outline" onPress={() => setOptionsVisible(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={!!selectedMember} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng tùy chọn thành viên" android_ripple={{ color: "#E2E8F0" }} style={styles.menuBackdrop} onPress={() => setSelectedMember(null)} />
          <View style={styles.menuCard}>
            <Text style={styles.actionCardTitle}>{selectedMember?.fullName}</Text>
            <Text style={styles.descriptionText}>{selectedMember?.role}</Text>
            {isCreator && selectedMember?.userId !== (project.leader?.userId ?? project.creator.id) && <Pressable accessibilityRole="button" android_ripple={{ color: "#E2E8F0" }} disabled={acting} onPress={removeSelectedMember} style={styles.menuItem}><Text style={styles.removeMenuText}>Xóa thành viên khỏi dự án</Text></Pressable>}
            <Button title="Đóng" variant="outline" onPress={() => setSelectedMember(null)} />
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  overviewBack: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3EAF5', overflow: "hidden" },
  overviewBackText: { fontSize: 30, color: colors.primary },
  overviewEyebrow: { fontSize: 10, letterSpacing: 1, color: colors.primary, fontWeight: '700' },
  headerTitleWrap: { flex: 1, gap: 4, minWidth: 0 },
  overviewTitle: { fontSize: 19, lineHeight: 25, fontWeight: '800', color: colors.navy },
  statusHeaderBadge: { alignSelf: "flex-start", borderRadius: 10, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "700", includeFontPadding: false, textAlignVertical: "center" },
  activeHeaderBadge: { color: "#1D4ED8", backgroundColor: "#DBEAFE" },
  inactiveHeaderBadge: { color: "#475569", backgroundColor: "#E2E8F0" },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, overflow: "hidden" },
  headerIconText: { color: colors.navy, fontSize: 22, fontWeight: "700" },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  confirmCard: { width: "100%", maxWidth: 440, backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 16 },
  menuOverlay: { flex: 1, justifyContent: "flex-end", padding: 16 },
  menuBackdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(15, 23, 42, 0.4)" },
  menuCard: { backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 10, elevation: 3 },
  menuItem: { minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, overflow: "hidden" },
  menuItemText: { color: colors.navy, fontWeight: "700" },
  removeMenuText: { color: colors.error, fontWeight: "700" },
  managementRow: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 14 },
  managementActions: { flexDirection: "row", gap: 10 },
  requestHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  requestStatusBadge: { borderRadius: 12, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: "700", includeFontPadding: false, textAlignVertical: "center" },
  pendingBadge: { color: "#92400E", backgroundColor: "#FEF3C7" },
  approvedBadge: { color: "#166534", backgroundColor: "#DCFCE7" },
  rejectedBadge: { color: "#475569", backgroundColor: "#E2E8F0" },
  segmentedControl: { flexDirection: "row", padding: 4, backgroundColor: "#F1F5F9", borderRadius: 14 },
  segment: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  segmentActive: { backgroundColor: colors.surface, elevation: 2 },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", includeFontPadding: false, textAlignVertical: "center" },
  segmentTextActive: { color: colors.primary, fontWeight: "800" },
  subsectionTitle: { color: colors.navy, fontSize: 15, fontWeight: "800", marginTop: 8 },
  invitationSubheading: { marginTop: 22 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  memberAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#E2E8F0" },
  memberAvatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: colors.primary, fontWeight: "800", includeFontPadding: false, textAlignVertical: "center" },
  memberDetails: { flex: 1, gap: 3, minWidth: 0 },
  memberNameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  memberMeta: { color: colors.textSecondary, fontSize: 12, includeFontPadding: false, textAlignVertical: "center" },
  leaderBadge: { color: "#1D4ED8", backgroundColor: "#DBEAFE", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800", includeFontPadding: false, textAlignVertical: "center", overflow: "hidden" },
  memberMenuButton: { width: 36, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  memberMenuText: { fontSize: 22, fontWeight: "700", color: colors.textSecondary },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
  },
  creatorName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
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
    elevation: 2,
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
  }
});
