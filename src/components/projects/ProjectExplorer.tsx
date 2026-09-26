import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { Project } from "@/types/project";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const tabs = [
  "Đang tuyển",
  "Dự án của tôi",
  "Yêu cầu tham gia",
  "Lời mời đã gửi",
  "Lời mời nhận được",
  "Đã đóng tuyển",
] as const;

export function ProjectExplorerScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("Đang tuyển");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await projectService.listProjects();

        if (mounted) {
          setProjects(data);
        }
      } catch {
        if (mounted) {
          setError("Không thể tải danh sách dự án. Vui lòng thử lại sau.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    switch (activeTab) {
      case "Dự án của tôi":
        return projects.filter(
          (project) => project.creator.id === "current-user",
        );

      case "Yêu cầu tham gia":
        return projects.filter(
          (project) => project.recruitmentStatus === "ĐANG TUYỂN",
        );

      case "Lời mời đã gửi":
        return projects.filter(
          (project) => project.creator.id === "current-user",
        );

      case "Lời mời nhận được":
        return projects.filter(
          (project) => project.recruitmentStatus === "ĐANG TUYỂN",
        );

      case "Đã đóng tuyển":
        return projects.filter(
          (project) =>
            project.recruitmentStatus === "ĐÃ ĐÓNG" ||
            project.recruitmentStatus === "HẾT HẠN",
        );

      case "Đang tuyển":
      default:
        return projects.filter(
          (project) => project.recruitmentStatus === "ĐANG TUYỂN",
        );
    }
  }, [projects, activeTab]);

  if (loading) {
    return <Loading />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Cộng đồng dự án</Text>
          <Text style={styles.title}>Khám phá các dự án</Text>
          <Text style={styles.subtitle}>
            {filteredProjects.length > 0
              ? `${filteredProjects.length} dự án đang hiển thị`
              : "Tìm đồng đội phù hợp cho ý tưởng của bạn"}
          </Text>
        </View>

        <Button
          title="Tạo dự án"
          variant="primary"
          onPress={() => router.push("/group/create" as never)}
          style={styles.ctaButton}
        />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.activeTabButton,
                pressed && styles.tabPressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.tabText, isActive && styles.activeTabText]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Error */}
      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageIcon}>!</Text>
          <Text style={styles.messageText}>{error}</Text>
        </View>
      ) : null}

      {/* Project list */}
      <View style={styles.content}>
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyBadge}>
              <View style={styles.emptyBadgeDot} />
            </View>

            <Text style={styles.emptyTitle}>Chưa có dự án nào phù hợp</Text>

            <Text style={styles.emptyText}>
              Hãy quay lại sau hoặc tạo dự án mới để bắt đầu.
            </Text>

            <Button
              title="Tạo dự án mới"
              variant="primary"
              onPress={() => router.push("/group/create" as never)}
              style={styles.emptyCta}
            />
          </View>
        ) : (
          filteredProjects.map((project) => {
            const isOpen = project.recruitmentStatus === "ĐANG TUYỂN";
            const progress =
              project.memberTarget > 0
                ? Math.min(project.currentMemberCount / project.memberTarget, 1)
                : 0;

            return (
              <Pressable
                key={project.id}
                onPress={() =>
                  router.push({
                    pathname: "/group/[id]" as never,
                    params: {
                      id: project.id,
                    },
                  } as never)
                }
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Status accent */}
                <View
                  style={[
                    styles.accentBar,
                    isOpen ? styles.accentOpen : styles.accentClosed,
                  ]}
                />

                <View style={styles.cardBody}>
                  {/* Card header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.creatorAvatar}>
                      <Text style={styles.creatorAvatarText}>
                        {getInitials(project.creator.displayName)}
                      </Text>
                    </View>

                    <View style={styles.projectInfo}>
                      <Text style={styles.projectTitle} numberOfLines={2}>
                        {project.title}
                      </Text>

                      <Text style={styles.metaText}>
                        {project.creator.displayName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isOpen ? styles.statusOpen : styles.statusClosed,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isOpen
                            ? styles.statusDotOpen
                            : styles.statusDotClosed,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {project.recruitmentStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Member progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(progress * 100)}%` },
                          !isOpen && styles.progressFillClosed,
                        ]}
                      />
                    </View>

                    <View style={styles.progressLabels}>
                      <Text style={styles.progressText}>
                        {project.currentMemberCount}/{project.memberTarget}{" "}
                        thành viên
                      </Text>

                      <Text style={styles.progressText}>
                        Hạn: {formatDate(project.recruitmentDeadline)}
                      </Text>
                    </View>
                  </View>

                  {/* Roles */}
                  {project.roles.length > 0 && (
                    <View style={styles.roleRow}>
                      {project.roles.slice(0, 3).map((role) => (
                        <View key={role.id} style={styles.rolePill}>
                          <Text numberOfLines={1} style={styles.roleText}>
                            {role.role}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Technologies */}
                  {project.technologies.length > 0 && (
                    <View style={styles.techRow}>
                      {project.technologies.slice(0, 3).map((tech) => (
                        <View key={tech} style={styles.techPill}>
                          <Text numberOfLines={1} style={styles.techText}>
                            {tech}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Footer */}
                  <View style={styles.footerRow}>
                    <Text style={styles.detailHint}>Xem chi tiết</Text>

                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrow}>›</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0) {
    return "?";
  }

  const last = parts[parts.length - 1];

  return last.charAt(0).toUpperCase();
}

const styles = StyleSheet.create({
  /* =========================
     SCREEN
  ========================= */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screenContent: {
    flexGrow: 1,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  title: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },

  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  ctaButton: {
    minWidth: 116,
  },

  /* =========================
     TABS
  ========================= */

  tabsContainer: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 10,
    alignItems: "center",
  },

  tabButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: colors.border,
  },

  activeTabButton: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  tabPressed: {
    opacity: 0.75,
  },

  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    includeFontPadding: false,
  },

  activeTabText: {
    color: colors.primary,
  },

  /* =========================
     CONTENT
  ========================= */

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
  },

  /* =========================
     PROJECT CARD
  ========================= */

  card: {
    flexDirection: "row",

    backgroundColor: colors.surface,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: colors.border,

    overflow: "hidden",

    shadowColor: "#0B3E9C",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  cardPressed: {
    opacity: 0.92,
  },

  accentBar: {
    width: 4,
  },

  accentOpen: {
    backgroundColor: colors.primary,
  },

  accentClosed: {
    backgroundColor: colors.border,
  },

  cardBody: {
    flex: 1,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.primaryLight,
  },

  creatorAvatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },

  projectInfo: {
    flex: 1,
    minWidth: 0,
  },

  projectTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 2,
  },

  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  /* =========================
     STATUS
  ========================= */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,

    borderRadius: 999,

    paddingHorizontal: 9,
    paddingVertical: 5,

    alignSelf: "flex-start",
  },

  statusOpen: {
    backgroundColor: "#EAF9F4",
    borderWidth: 1,
    borderColor: "#B9E7D6",
  },

  statusClosed: {
    backgroundColor: "#FCECEF",
    borderWidth: 1,
    borderColor: "#F0C2C8",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusDotOpen: {
    backgroundColor: "#1FAE7A",
  },

  statusDotClosed: {
    backgroundColor: "#D8465F",
  },

  statusText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },

  /* =========================
     MEMBER PROGRESS
  ========================= */

  progressSection: {
    marginTop: 14,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEF1F7",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  progressFillClosed: {
    backgroundColor: colors.border,
  },

  progressLabels: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },

  /* =========================
     ROLES
  ========================= */

  roleRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  rolePill: {
    maxWidth: "100%",

    borderRadius: 999,

    backgroundColor: colors.primary,

    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  roleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  /* =========================
     TECHNOLOGIES
  ========================= */

  techRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  techPill: {
    maxWidth: "100%",

    borderRadius: 999,

    backgroundColor: "transparent",

    borderWidth: 1,
    borderColor: colors.border,

    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  techText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },

  /* =========================
     CARD FOOTER
  ========================= */

  footerRow: {
    marginTop: 16,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderTopWidth: 1,
    borderTopColor: colors.border,

    paddingTop: 12,
  },

  detailHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.primaryLight,
  },

  arrow: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 15,
    marginLeft: 1,
  },

  /* =========================
     EMPTY STATE
  ========================= */

  emptyCard: {
    backgroundColor: colors.surface,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",

    padding: 28,

    alignItems: "center",
  },

  emptyBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.primaryLight,

    marginBottom: 14,
  },

  emptyBadgeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },

  emptyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },

  emptyCta: {
    marginTop: 18,
    minWidth: 160,
  },

  /* =========================
     ERROR MESSAGE
  ========================= */

  messageCard: {
    marginHorizontal: 18,
    marginBottom: 14,

    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,

    backgroundColor: "#FFF2F3",

    borderColor: "#F5C9CF",
    borderWidth: 1,
    borderRadius: 12,

    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  messageIcon: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "800",
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    lineHeight: 18,
    backgroundColor: "#FBD7DB",
    overflow: "hidden",
  },

  messageText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
});
