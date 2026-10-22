import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TaskEditorModal } from "@/components/workspace/TaskEditorModal";
import ContributionTab from "@/components/workspace/tabs/ContributionTab";
import MeetingsTab from "@/components/workspace/tabs/MeetingsTab";
import ReportsTab from "@/components/workspace/tabs/ReportsTab";
import RoomsTab from "@/components/workspace/tabs/RoomsTab";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import { workspaceService } from "@/services/workspace.service";
import { useAuthStore } from "@/store/auth.store";
import {
  VerifiedProjectTaskStatus,
  type ProjectTask,
  type WorkspaceProjectMember,
} from "@/types/workspace";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WorkspaceTab = "tasks" | "reports" | "meetings" | "rooms" | "contribution";

const WORKSPACE_TABS: WorkspaceTab[] = [
  "tasks",
  "reports",
  "meetings",
  "rooms",
  "contribution",
];

function resolveWorkspaceTab(value: string | string[] | undefined): WorkspaceTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return WORKSPACE_TABS.includes(candidate as WorkspaceTab)
    ? (candidate as WorkspaceTab)
    : "tasks";
}

type LoadedWorkspace = {
  projectTitle: string;
  isCreator: boolean;
  tasks: ProjectTask[];
  totalTasks: number;
  members: WorkspaceProjectMember[];
};

function taskStatus(status: number) {
  if (status === VerifiedProjectTaskStatus.ToDo) {
    return { label: "Cần làm", tone: "default" as const };
  }
  if (status === VerifiedProjectTaskStatus.Overdue) {
    return { label: "Quá hạn", tone: "danger" as const };
  }
  return { label: `Trạng thái ${status}`, tone: "muted" as const };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TaskCard({
  task,
  wide,
  onManage,
}: {
  task: ProjectTask;
  wide: boolean;
  onManage?: () => void;
}) {
  const status = taskStatus(task.status);
  const assignees = task.assignedUsers ?? [];

  return (
    <View style={[styles.taskCard, wide && styles.taskCardWide]}>
      <View style={styles.taskTopRow}>
        <View style={styles.taskHeading}>
          <Text style={styles.taskTitle}>
            {task.title?.trim() || "Công việc chưa có tiêu đề"}
          </Text>
          <Text numberOfLines={wide ? 2 : 3} style={styles.taskDescription}>
            {task.description?.trim() || "Chưa có mô tả."}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            status.tone === "danger"
              ? styles.statusDanger
              : status.tone === "muted"
                ? styles.statusMuted
                : styles.statusDefault,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status.tone === "danger" && styles.statusDangerText,
            ]}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <SymbolView
          name={{ ios: "calendar", android: "event", web: "event" }}
          size={18}
          tintColor={colors.textSecondary}
        />
        <View style={styles.metaCopy}>
          <Text style={styles.metaLabel}>Hạn hoàn thành</Text>
          <Text style={styles.metaValue}>{formatDateTime(task.deadline)}</Text>
        </View>
      </View>

      <View style={styles.assignmentBlock}>
        <Text style={styles.metaLabel}>Người được giao</Text>
        {assignees.length === 0 ? (
          <Text style={styles.unassigned}>Chưa phân công</Text>
        ) : (
          <View style={styles.assigneeList}>
            {assignees.map((assignee) => (
              <View key={assignee.assignmentId} style={styles.assigneeChip}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(assignee.fullName || assignee.nickname || "U")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.assigneeName}>
                  {assignee.fullName || assignee.nickname || "Thành viên"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {onManage ? (
        task.status === VerifiedProjectTaskStatus.Overdue ? (
          <View style={styles.lockedTaskNotice}>
            <SymbolView
              name={{
                ios: "lock.fill",
                android: "lock",
                web: "lock",
              }}
              size={17}
              tintColor={colors.error}
            />
            <Text style={styles.lockedTaskText}>
              Không thể thay đổi task sau khi đã quá hạn.
            </Text>
          </View>
        ) : (
          <Button
            title="Quản lý task"
            variant="outline"
            onPress={onManage}
            leadingIcon={
              <SymbolView
                name={{ ios: "pencil", android: "edit", web: "edit" }}
                size={17}
                tintColor={colors.primary}
              />
            }
          />
        )
      ) : null}
    </View>
  );
}

export function WorkspaceProjectScreen() {
  const { projectId, tab } = useLocalSearchParams<{ projectId: string; tab?: string | string[] }>();
  const { account, accessToken } = useAuthStore();
  const { width } = useWindowDimensions();
  const [loaded, setLoaded] = useState<LoadedWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => resolveWorkspaceTab(tab));
  const [editorTask, setEditorTask] = useState<
    ProjectTask | null | undefined
  >(undefined);

  // Cho phép Project Explorer mở thẳng tab Workspace được chọn qua query param ?tab=reports.
  useEffect(() => {
    setActiveTab(resolveWorkspaceTab(tab));
  }, [tab, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setLoaded(null);

    if (!projectId) {
      setError("Không tìm thấy mã dự án.");
      setIsLoading(false);
      return () => controller.abort();
    }

    Promise.all([
      projectService.getProjectById(projectId, controller.signal),
      workspaceService.listTasks(projectId, controller.signal),
    ])
      .then(([project, taskList]) => {
        if (controller.signal.aborted) return;
        setLoaded({
          projectTitle: project.title,
          isCreator: project.isCreator,
          tasks: taskList.tasks ?? [],
          totalTasks: taskList.totalTasks,
          members: [
            {
              userId: project.creator.id,
              fullName: project.creator.fullName,
              nickname: project.creator.nickname,
              avatarUrl: project.creator.avatarUrl,
              role: "Trưởng dự án",
            },
            ...project.members
              .filter((member) => member.userId !== project.creator.id)
              .map((member) => ({
              userId: member.userId,
              fullName: member.fullName,
              nickname: member.nickname,
              avatarUrl: member.avatarUrl,
              role: member.role,
              })),
          ],
        });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải không gian làm việc.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [projectId, account?.id, account?.profile?.id, attempt]);

  const tasks = loaded?.tasks ?? [];
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    if (!query) return tasks;
    return tasks.filter((task) =>
      (task.title ?? "").toLocaleLowerCase("vi").includes(query),
    );
  }, [searchQuery, tasks]);

  const assignedToMe = useMemo(
    () =>
      tasks.filter((task) =>
        (task.assignedUsers ?? []).some(
          (assignee) => assignee.userId === account?.profile?.id,
        ),
      ).length,
    [account?.profile?.id, tasks],
  );
  const overdue = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === VerifiedProjectTaskStatus.Overdue,
      ).length,
    [tasks],
  );
  const wide = width >= 760;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/workspace")
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={22}
            tintColor={colors.navy}
          />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>KHÔNG GIAN LÀM VIỆC</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {loaded?.projectTitle || "Công việc dự án"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator
            accessibilityLabel="Đang tải công việc"
            color={colors.primary}
            size="large"
          />
          <Text style={styles.stateText}>Đang tải công việc dự án...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <View style={styles.errorIcon}>
            <SymbolView
              name={{
                ios: "exclamationmark.triangle",
                android: "error_outline",
                web: "error_outline",
              }}
              size={28}
              tintColor={colors.error}
            />
          </View>
          <Text accessibilityRole="alert" style={styles.stateTitle}>
            Chưa tải được Workspace
          </Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button
            title="Thử lại"
            onPress={() => setAttempt((value) => value + 1)}
            style={styles.stateButton}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabsScroller}
          >
            {([
              { key: "tasks", label: "Quản lý task", icon: { ios: "checklist", android: "checklist", web: "checklist" } },
              { key: "reports", label: "Báo cáo & minh chứng", icon: { ios: "doc.text", android: "description", web: "description" } },
              { key: "meetings", label: "Cuộc họp", icon: { ios: "calendar", android: "event", web: "event" } },
              { key: "rooms", label: "Phòng trao đổi", icon: { ios: "bubble.left.and.bubble.right", android: "forum", web: "forum" } },
              { key: "contribution", label: "Contribution", icon: { ios: "chart.bar", android: "bar_chart", web: "bar_chart" } },
            ] as const).map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTab(tab.key)}
                  style={({ pressed }) => [
                    styles.tabButton,
                    selected && styles.tabButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={tab.icon}
                    size={17}
                    tintColor={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeTab === "tasks" ? (
            <>
          <View style={styles.intro}>
            <View style={styles.introCopy}>
              <Text style={styles.title}>Tổng quan công việc</Text>
              <Text style={styles.subtitle}>
                Theo dõi task và thành viên được phân công bằng dữ liệu từ dự
                án hiện tại.
              </Text>
            </View>
            {loaded?.isCreator ? (
              <View style={styles.leaderActions}>
                <View style={styles.leaderBadge}>
                  <SymbolView
                    name={{
                      ios: "person.badge.key.fill",
                      android: "admin_panel_settings",
                      web: "admin_panel_settings",
                    }}
                    size={17}
                    tintColor={colors.primary}
                  />
                  <Text style={styles.leaderText}>Trưởng dự án</Text>
                </View>
                <Button
                  title="Tạo task"
                  onPress={() => setEditorTask(null)}
                  leadingIcon={
                    <SymbolView
                      name={{
                        ios: "plus",
                        android: "add",
                        web: "add",
                      }}
                      size={18}
                      tintColor={colors.surface}
                    />
                  }
                  style={styles.createTaskButton}
                />
              </View>
            ) : null}
          </View>

          <View style={[styles.stats, wide && styles.statsWide]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tất cả task</Text>
              <Text style={styles.statValue}>{loaded?.totalTasks ?? 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Được giao cho bạn</Text>
              <Text style={styles.statValue}>{assignedToMe}</Text>
            </View>
            <View style={[styles.statCard, overdue > 0 && styles.overdueCard]}>
              <Text style={styles.statLabel}>Quá hạn</Text>
              <Text
                style={[
                  styles.statValue,
                  overdue > 0 && styles.overdueValue,
                ]}
              >
                {overdue}
              </Text>
            </View>
          </View>

          <Input
            label="Tìm kiếm task"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nhập tên task..."
            returnKeyType="search"
          />

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Danh sách task</Text>
            <Text style={styles.resultCount}>
              {filteredTasks.length}/{tasks.length}
            </Text>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{
                    ios: "checklist",
                    android: "checklist",
                    web: "checklist",
                  }}
                  size={28}
                  tintColor={colors.primary}
                />
              </View>
              <Text style={styles.stateTitle}>Chưa có task</Text>
              <Text style={styles.stateText}>
                Project này chưa có công việc nào trên hệ thống.
              </Text>
            </View>
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.stateTitle}>Không tìm thấy task</Text>
              <Text style={styles.stateText}>
                Không có tiêu đề task nào khớp với từ khóa hiện tại.
              </Text>
            </View>
          ) : (
            <View style={[styles.taskList, wide && styles.taskGrid]}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  wide={wide}
                  onManage={
                    loaded?.isCreator
                      ? () => setEditorTask(task)
                      : undefined
                  }
                />
              ))}
            </View>
          )}
            </>
          ) : activeTab === "reports" ? (
            <ReportsTab
              projectId={projectId ?? ""}
              tasks={tasks}
              userId={account?.profile?.id ?? account?.id ?? ""}
              accessToken={accessToken ?? ""}
              isProjectCreator={loaded?.isCreator ?? false}
            />
          ) : activeTab === "meetings" ? (
            <MeetingsTab />
          ) : activeTab === "rooms" ? (
            <RoomsTab />
          ) : (
            <ContributionTab />
          )}
        </ScrollView>
      )}
      {loaded?.isCreator && projectId ? (
        <TaskEditorModal
          projectId={projectId}
          task={editorTask ?? null}
          members={loaded.members}
          visible={editorTask !== undefined}
          onClose={() => setEditorTask(undefined)}
          onSaved={() => {
            setEditorTask(undefined);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  pressed: { opacity: 0.62 },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  headerTitle: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  content: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 42,
    gap: 20,
  },
  tabsScroller: { flexGrow: 0, marginBottom: 2 },
  tabsContent: { gap: 8, paddingBottom: 2 },
  tabButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: colors.primaryDark },
  tabPlaceholder: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 42,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabPlaceholderIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
  },
  tabPlaceholderTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  tabPlaceholderText: {
    maxWidth: 560,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  comingSoonNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    maxWidth: 560,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  comingSoonText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  intro: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  introCopy: { flex: 1, gap: 7 },
  title: { color: colors.navy, fontSize: 27, lineHeight: 34, fontWeight: "800" },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 620,
  },
  leaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
  },
  leaderText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  leaderActions: {
    alignItems: "flex-end",
    gap: 9,
  },
  createTaskButton: { minHeight: 44 },
  stats: { gap: 10 },
  statsWide: { flexDirection: "row" },
  statCard: {
    flex: 1,
    minHeight: 105,
    justifyContent: "space-between",
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  overdueCard: { borderColor: colors.error },
  statLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  statValue: { color: colors.navy, fontSize: 31, fontWeight: "800" },
  overdueValue: { color: colors.error },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  resultCount: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  taskList: { gap: 12 },
  taskGrid: { flexDirection: "row", flexWrap: "wrap" },
  taskCard: {
    padding: 17,
    gap: 17,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  taskCardWide: { width: "49%" },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskHeading: { flex: 1, gap: 7 },
  taskTitle: {
    color: colors.navy,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
  },
  taskDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  statusBadge: {
    minHeight: 29,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  statusDefault: { backgroundColor: colors.primaryLight },
  statusDanger: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  statusMuted: { backgroundColor: colors.background },
  statusText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  statusDangerText: { color: colors.error },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaCopy: { flex: 1, gap: 2 },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  assignmentBlock: { gap: 9 },
  assigneeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: "100%",
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  avatarText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  assigneeName: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  unassigned: { color: colors.warning, fontSize: 13, fontWeight: "700" },
  laterPhase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  laterPhaseText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  lockedTaskNotice: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  lockedTaskText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    gap: 12,
  },
  stateTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 480,
  },
  stateButton: { minWidth: 150 },
  errorIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  emptyCard: {
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 24,
    paddingVertical: 35,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
  },
});
