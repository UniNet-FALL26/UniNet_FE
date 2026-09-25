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
        if (mounted) setProjects(data);
      } catch {
        if (mounted)
          setError("Không thể tải danh sách dự án. Vui lòng thử lại sau.");
      } finally {
        if (mounted) setLoading(false);
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
      default:
        return projects.filter(
          (project) => project.recruitmentStatus === "ĐANG TUYỂN",
        );
    }
  }, [projects, activeTab]);

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Khám phá các dự án</Text>
        <Button
          title="Tạo dự án"
          variant="primary"
          onPress={() => router.push("/group/create" as never)}
          style={styles.ctaButton}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có dự án nào phù hợp</Text>
            <Text style={styles.emptyText}>
              Hãy quay lại sau hoặc tạo dự án mới để bắt đầu.
            </Text>
          </View>
        ) : (
          filteredProjects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() =>
                router.push({
                  pathname: "/group/[id]" as never,
                  params: { id: project.id },
                } as never)
              }
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <Text style={styles.metaText}>
                    Người tạo: {project.creator.displayName}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    project.recruitmentStatus === "ĐANG TUYỂN"
                      ? styles.statusOpen
                      : styles.statusClosed,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {project.recruitmentStatus}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>
                Hạn tuyển: {formatDate(project.recruitmentDeadline)}
              </Text>
              <Text style={styles.metaText}>
                Thành viên: {project.currentMemberCount}/{project.memberTarget}
              </Text>

              <View style={styles.roleRow}>
                {project.roles.slice(0, 3).map((role) => (
                  <View key={role.id} style={styles.rolePill}>
                    <Text style={styles.roleText}>{role.role}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.techRow}>
                {project.technologies.slice(0, 3).map((tech) => (
                  <View key={tech} style={styles.techPill}>
                    <Text style={styles.techText}>{tech}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.detailHint}>Xem chi tiết</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    flex: 1,
  },
  ctaButton: { minWidth: 120 },
  tabsContainer: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  tabButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTabButton: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  activeTabText: { color: colors.primary },
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: "#0B3E9C",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  projectTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  metaText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
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
  statusText: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
  roleRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolePill: {
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  techRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  techPill: {
    borderRadius: 999,
    backgroundColor: "#F3F6FB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  techText: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  detailHint: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  arrow: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  messageCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: "#FFF2F3",
    borderColor: "#F5C9CF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageText: { color: colors.error, fontSize: 13, fontWeight: "600" },
});
