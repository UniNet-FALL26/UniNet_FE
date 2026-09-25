import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { CreateProjectRequest } from "@/types/project";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const technologyOptions = [
  "React Native",
  "TypeScript",
  "Node.js",
  "Firebase",
  "AI",
  "Python",
  "UI/UX",
  "PostgreSQL",
];

const emptyRole = () => ({ role: "", quantity: 1, requirements: "" });

export function ProjectCreateScreen() {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [memberTarget, setMemberTarget] = useState("");
  const [roles, setRoles] = useState([{ ...emptyRole() }]);
  const [recruitmentDeadline, setRecruitmentDeadline] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [commitmentLevel, setCommitmentLevel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalRoleQuantity = useMemo(
    () => roles.reduce((sum, role) => sum + Number(role.quantity || 0), 0),
    [roles],
  );

  const toggleTechnology = (tech: string) => {
    setTechnologies((current) =>
      current.includes(tech)
        ? current.filter((item) => item !== tech)
        : [...current, tech],
    );
  };

  const updateRole = (
    index: number,
    field: "role" | "quantity" | "requirements",
    value: string | number,
  ) => {
    setRoles((current) =>
      current.map((role, roleIndex) =>
        roleIndex === index ? { ...role, [field]: value } : role,
      ),
    );
  };

  const addRole = () => setRoles((current) => [...current, emptyRole()]);

  const removeRole = (index: number) => {
    if (roles.length === 1) return;
    setRoles((current) =>
      current.filter((_, roleIndex) => roleIndex !== index),
    );
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Tên dự án là bắt buộc.";
    if (!objective.trim()) nextErrors.objective = "Mục tiêu là bắt buộc.";
    if (!description.trim())
      nextErrors.description = "Mô tả dự án là bắt buộc.";
    const parsedTarget = Number(memberTarget);
    if (!memberTarget || Number.isNaN(parsedTarget) || parsedTarget < 2)
      nextErrors.memberTarget =
        "Số thành viên mục tiêu phải lớn hơn 1 và bao gồm người tạo.";
    if (roles.length === 0) nextErrors.roles = "Cần ít nhất một vai trò.";
    const hasInvalidRole = roles.some(
      (role) => !role.role.trim() || Number(role.quantity) <= 0,
    );
    if (hasInvalidRole)
      nextErrors.roles = "Mỗi vai trò phải có tên và số lượng lớn hơn 0.";
    if (roles.length > 0 && totalRoleQuantity !== parsedTarget - 1)
      nextErrors.roles = "Tổng số lượng vai trò phải bằng memberTarget - 1.";
    if (!recruitmentDeadline)
      nextErrors.recruitmentDeadline = "Hạn tuyển thành viên là bắt buộc.";
    const deadline = new Date(recruitmentDeadline);
    if (recruitmentDeadline && Number.isNaN(deadline.getTime()))
      nextErrors.recruitmentDeadline = "Hạn tuyển phải là ngày hợp lệ.";
    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload: CreateProjectRequest = {
      title: title.trim(),
      objective: objective.trim(),
      description: description.trim(),
      technologies,
      memberTarget: Number(memberTarget),
      roles: roles.map((role) => ({
        role: role.role.trim(),
        quantity: Number(role.quantity),
        requirements: role.requirements.trim(),
      })),
      recruitmentDeadline,
      estimatedDuration: estimatedDuration.trim() || undefined,
      expectedOutput: expectedOutput.trim() || undefined,
      commitmentLevel: commitmentLevel.trim() || undefined,
      status: "CÔNG KHAI",
      recruitmentStatus: "ĐANG TUYỂN",
    };

    try {
      const createdProject = await projectService.createProject(payload);
      router.push({
        pathname: "/group/recommendations" as never,
        params: { projectId: createdProject.id },
      } as never);
    } catch {
      setSubmitError(
        "Không thể tạo dự án. Vui lòng kiểm tra dữ liệu và thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tạo dự án</Text>
        <Text style={styles.description}>
          Nhập thông tin cơ bản cùng các vai trò cần tuyển để bắt đầu dự án.
        </Text>

        <Input
          label="Tên dự án"
          value={title}
          onChangeText={setTitle}
          error={errors.title}
        />
        <Input
          label="Mục tiêu"
          value={objective}
          onChangeText={setObjective}
          error={errors.objective}
        />
        <Input
          label="Mô tả dự án"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={styles.textArea}
          error={errors.description}
        />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Công nghệ sử dụng</Text>
          <View style={styles.tagsWrap}>
            {technologyOptions.map((tech) => (
              <Button
                key={tech}
                title={tech}
                variant={technologies.includes(tech) ? "primary" : "outline"}
                onPress={() => toggleTechnology(tech)}
                style={styles.tagButton}
              />
            ))}
          </View>
        </View>

        <Input
          label="Số thành viên mục tiêu"
          value={memberTarget}
          onChangeText={setMemberTarget}
          keyboardType="numeric"
          error={errors.memberTarget}
        />

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Các vai trò cần tuyển</Text>
            <Button
              title="Thêm vai trò"
              variant="outline"
              onPress={addRole}
              style={styles.smallAction}
            />
          </View>
          {roles.map((role, index) => (
            <View key={`${index}-role`} style={styles.roleCard}>
              <View style={styles.roleRow}>
                <Input
                  label="Vai trò"
                  value={role.role}
                  onChangeText={(value) => updateRole(index, "role", value)}
                  error={
                    errors.roles && !role.role.trim()
                      ? "Vai trò bắt buộc."
                      : undefined
                  }
                  style={styles.flexInput}
                />
                <Input
                  label="Số lượng"
                  value={String(role.quantity)}
                  onChangeText={(value) =>
                    updateRole(index, "quantity", Number(value || 0))
                  }
                  keyboardType="numeric"
                  error={
                    errors.roles && Number(role.quantity) <= 0
                      ? "Số lượng > 0"
                      : undefined
                  }
                  style={styles.smallInput}
                />
              </View>
              <Input
                label="Yêu cầu của vai trò"
                value={role.requirements}
                onChangeText={(value) =>
                  updateRole(index, "requirements", value)
                }
                error={
                  errors.roles && !role.requirements.trim()
                    ? "Yêu cầu bắt buộc."
                    : undefined
                }
              />
              {roles.length > 1 ? (
                <Button
                  title="Xóa"
                  variant="outline"
                  onPress={() => removeRole(index)}
                  style={styles.removeButton}
                />
              ) : null}
            </View>
          ))}
          {!!errors.roles ? (
            <Text style={styles.errorText}>{errors.roles}</Text>
          ) : null}
        </View>

        <Input
          label="Hạn tuyển thành viên"
          value={recruitmentDeadline}
          onChangeText={setRecruitmentDeadline}
          placeholder="YYYY-MM-DD"
          error={errors.recruitmentDeadline}
        />
        <Input
          label="Thời gian dự kiến thực hiện"
          value={estimatedDuration}
          onChangeText={setEstimatedDuration}
        />
        <Input
          label="Sản phẩm đầu ra dự kiến"
          value={expectedOutput}
          onChangeText={setExpectedOutput}
        />
        <Input
          label="Mức độ cam kết"
          value={commitmentLevel}
          onChangeText={setCommitmentLevel}
        />

        {submitError ? (
          <Text style={styles.submitError}>{submitError}</Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Hủy bỏ"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title="Tiếp theo"
            variant="primary"
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 740,
    width: "100%",
    alignSelf: "center",
  },
  title: { color: colors.navy, fontSize: 28, fontWeight: "800" },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  sectionBlock: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagButton: { minHeight: 40, paddingHorizontal: 12 },
  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  roleRow: { flexDirection: "row", gap: 12 },
  flexInput: { flex: 1 },
  smallInput: { width: 110 },
  smallAction: { minHeight: 42, paddingHorizontal: 10 },
  removeButton: { alignSelf: "flex-end" },
  errorText: { color: colors.error, fontSize: 12, fontWeight: "600" },
  submitError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelButton: { flex: 1 },
  submitButton: { flex: 1 },
});
