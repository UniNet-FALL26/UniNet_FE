import { createElement, useEffect, useRef, useState } from "react";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { workspaceService } from "@/services/workspace.service";
import {
  VerifiedProjectTaskStatus,
  type ProjectTask,
  type ProjectTaskMutation,
  type WorkspaceProjectMember,
} from "@/types/workspace";

type Props = {
  projectId: string;
  task: ProjectTask | null;
  members: WorkspaceProjectMember[];
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function newTaskDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return date.toISOString();
}

function DateField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = new Date(value);
  const valid = !Number.isNaN(parsed.getTime());
  const date = valid ? parsed : new Date();
  const minimumDate = new Date();
  const label = "Hạn hoàn thành";

  if (Platform.OS === "web") {
    const local = valid
      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 19)
      : "";
    const minimumLocal = new Date(
      minimumDate.getTime() - minimumDate.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 19);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {createElement("input", {
          type: "datetime-local",
          "aria-label": label,
          value: local,
          min: minimumLocal,
          disabled,
          step: 1,
          style: {
            width: "100%",
            boxSizing: "border-box",
            minHeight: 52,
            padding: 12,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            backgroundColor: colors.background,
            color: colors.textPrimary,
            fontSize: 14,
          },
          onChange: (event: { target: { value: string } }) => {
            const next = new Date(event.target.value);
            onChange(Number.isNaN(next.getTime()) ? "" : next.toISOString());
          },
        })}
      </View>
    );
  }

  const choose = () => {
    if (Platform.OS !== "android") {
      setOpen((current) => !current);
      return;
    }
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      minimumDate,
      onChange: (event, selectedDate) => {
        if (event.type !== "set" || !selectedDate) return;
        const next = new Date(date);
        next.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );
        DateTimePickerAndroid.open({
          value: next,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) return;
            next.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0,
            );
            onChange(next.toISOString());
          },
        });
      },
    });
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Button
        title={valid ? date.toLocaleString("vi-VN") : "Chọn ngày và giờ"}
        variant="outline"
        disabled={disabled}
        onPress={choose}
      />
      {open ? (
        <DateTimePicker
          value={date}
          mode="datetime"
          minimumDate={minimumDate}
          disabled={disabled}
          onChange={(_, selected) => {
            if (selected) onChange(selected.toISOString());
          }}
        />
      ) : null}
    </View>
  );
}

function initialForm(task: ProjectTask | null): ProjectTaskMutation {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    deadline: task?.deadline ?? newTaskDeadline(),
    status: task?.status ?? VerifiedProjectTaskStatus.ToDo,
    assignedUserIds: (task?.assignedUsers ?? []).map(
      (assignment) => assignment.userId,
    ),
  };
}

export function TaskEditorModal({
  projectId,
  task,
  members,
  visible,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<ProjectTaskMutation>(() =>
    initialForm(task),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mutationRef = useRef(false);
  const editing = task !== null;

  useEffect(() => {
    if (!visible) return;
    setForm(initialForm(task));
    setError(null);
    setConfirmDelete(false);
  }, [task, visible]);

  const update = <K extends keyof ProjectTaskMutation>(
    key: K,
    value: ProjectTaskMutation[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleMember = (userId: string) => {
    update(
      "assignedUserIds",
      form.assignedUserIds.includes(userId)
        ? form.assignedUserIds.filter((id) => id !== userId)
        : [...form.assignedUserIds, userId],
    );
  };

  const save = async () => {
    if (mutationRef.current) return;
    if (task?.status === VerifiedProjectTaskStatus.Overdue) {
      setError("Không thể thay đổi task sau khi đã quá hạn.");
      return;
    }
    const deadline = new Date(form.deadline);
    if (!form.title.trim()) {
      setError("Vui lòng nhập tên task.");
      return;
    }
    if (Number.isNaN(deadline.getTime())) {
      setError("Vui lòng chọn hạn hoàn thành hợp lệ.");
      return;
    }
    if (deadline.getTime() <= Date.now()) {
      setError("Hạn hoàn thành phải sau thời điểm hiện tại.");
      return;
    }

    mutationRef.current = true;
    setSaving(true);
    setError(null);
    const payload: ProjectTaskMutation = {
      title: form.title.trim(),
      description: form.description.trim(),
      deadline: deadline.toISOString(),
      status: form.status,
      assignedUserIds: form.assignedUserIds,
    };
    try {
      if (task) {
        await workspaceService.updateTask(projectId, task.id, payload);
      } else {
        await workspaceService.createTask(projectId, payload);
      }
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : editing
            ? "Không thể cập nhật task."
            : "Không thể tạo task.",
      );
    } finally {
      mutationRef.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!task || mutationRef.current) return;
    if (task.status === VerifiedProjectTaskStatus.Overdue) {
      setError("Không thể thay đổi task sau khi đã quá hạn.");
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    mutationRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await workspaceService.deleteTask(projectId, task.id);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa task.",
      );
    } finally {
      mutationRef.current = false;
      setSaving(false);
    }
  };

  const deadline = new Date(form.deadline);
  const deadlineInPast =
    !Number.isNaN(deadline.getTime()) && deadline.getTime() <= Date.now();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {editing ? "QUẢN LÝ TASK" : "TASK MỚI"}
              </Text>
              <Text style={styles.title}>
                {editing ? "Cập nhật công việc" : "Tạo công việc"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={20}
                tintColor={colors.navy}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.fields}
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Tên task *"
              value={form.title}
              onChangeText={(value) => update("title", value)}
              editable={!saving}
              placeholder="Ví dụ: Hoàn thiện giao diện đăng nhập"
            />
            <Input
              label="Mô tả"
              value={form.description}
              onChangeText={(value) => update("description", value)}
              editable={!saving}
              multiline
              placeholder="Mô tả kết quả cần hoàn thành"
              style={styles.descriptionInput}
            />
            <DateField
              value={form.deadline}
              disabled={saving}
              onChange={(value) => update("deadline", value)}
            />
            {deadlineInPast ? (
              <Text accessibilityRole="alert" style={styles.deadlineWarning}>
                Hạn hoàn thành phải sau thời điểm hiện tại.
              </Text>
            ) : null}

            <View style={styles.assignmentSection}>
              <View style={styles.assignmentHeading}>
                <Text style={styles.fieldLabel}>Phân công thành viên</Text>
                <Text style={styles.selectionCount}>
                  {form.assignedUserIds.length} đã chọn
                </Text>
              </View>
              {members.length === 0 ? (
                <View style={styles.noMembers}>
                  <Text style={styles.noMembersText}>
                    Dự án chưa có thành viên khác để phân công.
                  </Text>
                </View>
              ) : (
                <View style={styles.memberList}>
                  {members.map((member) => {
                    const selected = form.assignedUserIds.includes(
                      member.userId,
                    );
                    return (
                      <Pressable
                        key={member.userId}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        disabled={saving}
                        onPress={() => toggleMember(member.userId)}
                        style={({ pressed }) => [
                          styles.memberOption,
                          selected && styles.memberOptionSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxSelected,
                          ]}
                        >
                          {selected ? (
                            <SymbolView
                              name={{
                                ios: "checkmark",
                                android: "check",
                                web: "check",
                              }}
                              size={15}
                              tintColor={colors.surface}
                            />
                          ) : null}
                        </View>
                        <View style={styles.memberCopy}>
                          <Text style={styles.memberName}>
                            {member.fullName ||
                              member.nickname ||
                              "Thành viên"}
                          </Text>
                          <Text style={styles.memberRole}>
                            {member.role || "Thành viên dự án"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {confirmDelete ? (
              <View style={styles.deleteWarning}>
                <Text style={styles.deleteWarningTitle}>
                  Xóa task này?
                </Text>
                <Text style={styles.deleteWarningText}>
                  Thao tác này không thể hoàn tác. Bấm “Xác nhận xóa” lần nữa
                  để tiếp tục.
                </Text>
              </View>
            ) : null}
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {editing ? (
              <Button
                title={confirmDelete ? "Xác nhận xóa" : "Xóa task"}
                variant="outline"
                disabled={saving}
                onPress={() => void remove()}
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Hủy"
                variant="outline"
                disabled={saving}
                onPress={onClose}
                style={styles.actionButton}
              />
            )}
            <Button
              title={editing ? "Lưu thay đổi" : "Tạo task"}
              loading={saving}
              disabled={deadlineInPast}
              onPress={() => void save()}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: colors.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "92%",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  title: { color: colors.navy, fontSize: 21, fontWeight: "800" },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.62 },
  fields: { gap: 16, paddingBottom: 4 },
  field: { gap: 7 },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  descriptionInput: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  assignmentSection: { gap: 10 },
  assignmentHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectionCount: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  memberList: { gap: 8 },
  memberOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  memberOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  memberRole: { color: colors.textSecondary, fontSize: 12 },
  noMembers: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  noMembersText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteWarning: {
    gap: 4,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  deleteWarningTitle: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "800",
  },
  deleteWarningText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
  },
  deadlineWarning: {
    marginTop: -9,
    color: colors.error,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1 },
});
