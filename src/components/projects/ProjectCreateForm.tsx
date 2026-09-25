import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { CreateProjectRequest } from "@/types/project";
import { DateTimePicker, Host } from "@expo/ui/jetpack-compose";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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

const projectFields = [
  "Web Development",
  "Mobile Development",
  "Backend Development",
  "AI / Machine Learning",
  "Data Science",
  "UI/UX & Design",
  "Game Development",
  "Cybersecurity",
  "IoT / Embedded",
  "Khác",
];

const emptyRole = () => ({
  id: "",
  role: "",
  quantity: 1,
  requirements: "",
});

type DatePickerTarget = "recruitmentDeadline" | null;

export function ProjectCreateScreen() {
  const [title, setTitle] = useState("");
  const [projectField, setProjectField] = useState("");
  const [description, setDescription] = useState("");

  const [technologies, setTechnologies] = useState<string[]>([]);

  const [memberTarget, setMemberTarget] = useState("");

  const [roles, setRoles] = useState([emptyRole()]);

  const [recruitmentDeadline, setRecruitmentDeadline] = useState<Date | null>(
    null,
  );

  const [estimatedDuration, setEstimatedDuration] = useState("");

  const [expectedOutput, setExpectedOutput] = useState("");
  const [commitmentLevel, setCommitmentLevel] = useState("");

  const [isPrivate, setIsPrivate] = useState(false);

  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  const [datePickerTarget, setDatePickerTarget] =
    useState<DatePickerTarget>(null);

  const [datePickerStep, setDatePickerStep] = useState<"date" | "time">("date");

  const [tempDate, setTempDate] = useState<Date>(new Date());

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
        roleIndex === index
          ? {
              ...role,
              [field]: value,
            }
          : role,
      ),
    );
  };

  const addRole = () => {
    setRoles((current) => [...current, emptyRole()]);
  };

  const removeRole = (index: number) => {
    if (roles.length === 1) {
      return;
    }

    setRoles((current) =>
      current.filter((_, roleIndex) => roleIndex !== index),
    );
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) {
      return "";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  /**
   * Gửi datetime theo local time.
   *
   * Ví dụ:
   * 2026-10-15T23:59:00
   */
  const formatDateTimeForApi = (date: Date | null) => {
    if (!date) {
      return undefined;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  const openDatePicker = () => {
    const initialDate = recruitmentDeadline
      ? new Date(recruitmentDeadline)
      : new Date();

    if (!recruitmentDeadline) {
      initialDate.setHours(23, 59, 0, 0);
    }

    setTempDate(initialDate);
    setDatePickerTarget("recruitmentDeadline");
    setDatePickerStep("date");
  };

  const closeDatePicker = () => {
    setDatePickerTarget(null);
    setDatePickerStep("date");
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) {
      nextErrors.title = "Tên dự án là bắt buộc.";
    }

    if (!projectField) {
      nextErrors.projectField = "Vui lòng chọn lĩnh vực dự án.";
    }

    if (!description.trim()) {
      nextErrors.description = "Mô tả dự án là bắt buộc.";
    }

    const parsedTarget = Number(memberTarget);

    if (!memberTarget || Number.isNaN(parsedTarget) || parsedTarget < 2) {
      nextErrors.memberTarget =
        "Số thành viên mục tiêu phải lớn hơn 1 và bao gồm người tạo.";
    }

    if (roles.length === 0) {
      nextErrors.roles = "Cần ít nhất một vai trò.";
    }

    const hasInvalidRole = roles.some(
      (role) =>
        !role.role.trim() ||
        Number(role.quantity) <= 0 ||
        !role.requirements.trim(),
    );

    if (hasInvalidRole) {
      nextErrors.roles = "Mỗi vai trò phải có tên, số lượng và yêu cầu.";
    }

    if (roles.length > 0 && totalRoleQuantity !== parsedTarget - 1) {
      nextErrors.roles =
        "Tổng số lượng vai trò phải bằng số thành viên cần tuyển.";
    }

    if (!recruitmentDeadline) {
      nextErrors.recruitmentDeadline = "Hạn chót nộp đơn tham gia là bắt buộc.";
    }

    if (recruitmentDeadline && recruitmentDeadline.getTime() <= Date.now()) {
      nextErrors.recruitmentDeadline = "Hạn chót phải nằm trong tương lai.";
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload: CreateProjectRequest = {
      title: title.trim(),

      projectField: projectField,

      description: description.trim(),

      technologies,

      memberTarget: Number(memberTarget),

      roles: roles.map((role) => ({
        id: role.id,
        role: role.role.trim(),
        quantity: Number(role.quantity),
        requirements: role.requirements.trim(),
      })),

      recruitmentDeadline: formatDateTimeForApi(recruitmentDeadline)!,

      estimatedDuration: estimatedDuration.trim() || undefined,

      expectedOutput: expectedOutput.trim() || undefined,

      commitmentLevel: commitmentLevel.trim() || undefined,

      status: isPrivate ? "RIÊNG TƯ" : "CÔNG KHAI",

      recruitmentStatus: "ĐANG TUYỂN",
    };

    try {
      const createdProject = await projectService.createProject(payload);

      router.push({
        pathname: "/group/recommendations" as never,
        params: {
          projectId: createdProject.id,
        },
      } as never);
    } catch {
      setSubmitError(
        "Không thể tạo dự án. Vui lòng kiểm tra dữ liệu và thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderDateTimePicker = () => {
    if (!datePickerTarget) {
      return null;
    }

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={closeDatePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  {datePickerStep === "date" ? "CHỌN NGÀY" : "CHỌN GIỜ"}
                </Text>

                <Text style={styles.modalTitle}>Hạn chót nộp đơn</Text>
              </View>

              <Pressable
                onPress={closeDatePicker}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.pickerWrapper}>
              <Host style={styles.pickerHost}>
                <DateTimePicker
                  onDateSelected={(selectedDate) => {
                    if (datePickerStep === "date") {
                      const nextDate = new Date(tempDate);

                      nextDate.setFullYear(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                      );

                      setTempDate(nextDate);
                      setDatePickerStep("time");

                      return;
                    }

                    const nextDate = new Date(tempDate);

                    nextDate.setHours(
                      selectedDate.getHours(),
                      selectedDate.getMinutes(),
                      0,
                      0,
                    );

                    setTempDate(nextDate);
                  }}
                  displayedComponents={
                    datePickerStep === "date" ? "date" : "hourAndMinute"
                  }
                  initialDate={tempDate.toISOString()}
                  is24Hour
                  variant="picker"
                />
              </Host>
            </View>

            <View style={styles.datePreview}>
              <Text style={styles.datePreviewLabel}>
                {datePickerStep === "date"
                  ? "Ngày đã chọn"
                  : "Ngày và giờ đã chọn"}
              </Text>

              <Text style={styles.datePreviewValue}>
                {formatDateTime(tempDate)}
              </Text>
            </View>

            {datePickerStep === "time" ? (
              <Button
                title="Xác nhận"
                variant="primary"
                onPress={() => {
                  if (datePickerTarget === "recruitmentDeadline") {
                    setRecruitmentDeadline(new Date(tempDate));
                  }

                  closeDatePicker();
                }}
                style={styles.modalConfirmButton}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>KHỞI TẠO DỰ ÁN</Text>

            <Text style={styles.title}>Tạo dự án</Text>

            <Text style={styles.description}>
              Tạo một dự án và tìm những thành viên phù hợp để cùng phát triển.
            </Text>
          </View>
        </View>

        {/* THÔNG TIN DỰ ÁN */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>01</Text>
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Thông tin dự án</Text>

              <Text style={styles.sectionDescription}>
                Giới thiệu những thông tin cơ bản về dự án.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Input
              label="Tên dự án *"
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Nền tảng học tập cộng đồng"
              error={errors.title}
            />

            {/* LĨNH VỰC */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Lĩnh vực dự án *</Text>

              <Pressable
                onPress={() => setShowFieldDropdown((current) => !current)}
                style={({ pressed }) => [
                  styles.dropdownButton,
                  pressed && styles.dropdownPressed,
                  errors.projectField && styles.dropdownError,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !projectField && styles.dropdownPlaceholder,
                  ]}
                >
                  {projectField || "Chọn lĩnh vực dự án"}
                </Text>

                <Text style={styles.dropdownArrow}>
                  {showFieldDropdown ? "⌃" : "⌄"}
                </Text>
              </Pressable>

              {showFieldDropdown ? (
                <View style={styles.dropdownMenu}>
                  {projectFields.map((field) => {
                    const selected = projectField === field;

                    return (
                      <Pressable
                        key={field}
                        onPress={() => {
                          setProjectField(field);
                          setShowFieldDropdown(false);
                        }}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          selected && styles.dropdownItemSelected,
                          pressed && styles.dropdownItemPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selected && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {field}
                        </Text>

                        {selected ? (
                          <Text style={styles.dropdownCheck}>✓</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {errors.projectField ? (
                <Text style={styles.errorText}>{errors.projectField}</Text>
              ) : null}
            </View>

            <Input
              label="Mô tả dự án *"
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả mục đích, phạm vi và những gì dự án muốn xây dựng..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.textArea}
              error={errors.description}
            />

            {/* TECHNOLOGIES */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Công nghệ sử dụng</Text>

              <Text style={styles.helperText}>
                Chọn những công nghệ dự án dự kiến sử dụng.
              </Text>

              <View style={styles.tagsWrap}>
                {technologyOptions.map((tech) => {
                  const selected = technologies.includes(tech);

                  return (
                    <Pressable
                      key={tech}
                      onPress={() => toggleTechnology(tech)}
                      style={[
                        styles.techChip,
                        selected && styles.techChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.techChipText,
                          selected && styles.techChipTextSelected,
                        ]}
                      >
                        {tech}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* QUY MÔ */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>02</Text>
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Quy mô nhóm</Text>

              <Text style={styles.sectionDescription}>
                Xác định số thành viên và các vị trí cần tuyển.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Input
              label="Số thành viên mục tiêu *"
              value={memberTarget}
              onChangeText={setMemberTarget}
              keyboardType="numeric"
              placeholder="Ví dụ: 5"
              error={errors.memberTarget}
            />

            <Text style={styles.helperText}>
              Số này bao gồm cả người tạo dự án.
            </Text>

            <View style={styles.roleSectionHeader}>
              <View>
                <Text style={styles.inputLabel}>Các vai trò cần tuyển *</Text>

                <Text style={styles.helperText}>
                  Cần tuyển: {Math.max(Number(memberTarget || 0) - 1, 0)} thành
                  viên
                </Text>
              </View>

              <Pressable onPress={addRole} style={styles.addRoleButton}>
                <Text style={styles.addRoleText}>+ Thêm vai trò</Text>
              </Pressable>
            </View>

            {roles.map((role, index) => (
              <View key={`${index}-role`} style={styles.roleCard}>
                <View style={styles.roleCardHeader}>
                  <View style={styles.roleIndex}>
                    <Text style={styles.roleIndexText}>{index + 1}</Text>
                  </View>

                  <Text style={styles.roleCardTitle}>Vai trò {index + 1}</Text>

                  {roles.length > 1 ? (
                    <Pressable
                      onPress={() => removeRole(index)}
                      style={styles.deleteRoleButton}
                    >
                      <Text style={styles.deleteRoleText}>Xóa</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.roleRow}>
                  <View style={styles.roleNameWrapper}>
                    <Input
                      label="Tên vai trò *"
                      value={role.role}
                      onChangeText={(value) => updateRole(index, "role", value)}
                      placeholder="Ví dụ: Frontend Developer"
                    />
                  </View>

                  <View style={styles.quantityWrapper}>
                    <Input
                      label="Số lượng *"
                      value={String(role.quantity)}
                      onChangeText={(value) =>
                        updateRole(index, "quantity", Number(value || 0))
                      }
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>
                </View>

                <Input
                  label="Yêu cầu của vai trò *"
                  value={role.requirements}
                  onChangeText={(value) =>
                    updateRole(index, "requirements", value)
                  }
                  placeholder="Ví dụ: React Native, TypeScript..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.requirementInput}
                />
              </View>
            ))}

            {!!errors.roles ? (
              <Text style={styles.errorText}>{errors.roles}</Text>
            ) : null}

            <View style={styles.roleSummary}>
              <Text style={styles.roleSummaryLabel}>
                Tổng số lượng cần tuyển
              </Text>

              <Text style={styles.roleSummaryValue}>
                {totalRoleQuantity}
                {" / "}
                {Math.max(Number(memberTarget || 0) - 1, 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* THỜI GIAN */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>03</Text>
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Thời gian</Text>

              <Text style={styles.sectionDescription}>
                Thiết lập thời hạn tuyển thành viên và thời gian dự kiến của dự
                án.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {/* DEADLINE */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Hạn chót nộp đơn tham gia *</Text>

              <Pressable
                onPress={openDatePicker}
                style={[
                  styles.dateButton,
                  errors.recruitmentDeadline && styles.dateButtonError,
                ]}
              >
                <View style={styles.dateIcon}>
                  <Text style={styles.dateIconText}>📅</Text>
                </View>

                <View style={styles.dateButtonContent}>
                  <Text
                    style={[
                      styles.dateValue,
                      !recruitmentDeadline && styles.datePlaceholder,
                    ]}
                  >
                    {recruitmentDeadline
                      ? formatDateTime(recruitmentDeadline)
                      : "Chọn ngày và giờ"}
                  </Text>

                  <Text style={styles.dateHelper}>
                    Ngày / tháng / năm • Giờ : phút
                  </Text>
                </View>

                <Text style={styles.dateArrow}>›</Text>
              </Pressable>

              {errors.recruitmentDeadline ? (
                <Text style={styles.errorText}>
                  {errors.recruitmentDeadline}
                </Text>
              ) : null}
            </View>

            {/* ESTIMATED DURATION */}
            <Input
              label="Thời gian dự kiến thực hiện"
              value={estimatedDuration}
              onChangeText={setEstimatedDuration}
              placeholder="Ví dụ: 3 tháng"
            />

            {/* EXPECTED OUTPUT */}
            <Input
              label="Sản phẩm đầu ra dự kiến"
              value={expectedOutput}
              onChangeText={setExpectedOutput}
              placeholder="Ví dụ: Mobile App + Web Dashboard"
            />

            {/* COMMITMENT */}
            <Input
              label="Mức độ cam kết"
              value={commitmentLevel}
              onChangeText={setCommitmentLevel}
              placeholder="Ví dụ: 6 giờ / tuần"
            />
          </View>
        </View>

        {/* PRIVATE PROJECT */}
        <View style={styles.privateCard}>
          <View style={styles.privateIcon}>
            <Text style={styles.privateIconText}>🔒</Text>
          </View>

          <View style={styles.privateContent}>
            <Text style={styles.privateTitle}>Dự án riêng tư</Text>

            <Text style={styles.privateDescription}>
              {isPrivate
                ? "Dự án chỉ dành cho những người được mời."
                : "Dự án có thể được sinh viên khác khám phá."}
            </Text>
          </View>

          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
          />
        </View>

        {/* SUBMIT ERROR */}
        {submitError ? (
          <View style={styles.submitErrorCard}>
            <Text style={styles.submitError}>{submitError}</Text>
          </View>
        ) : null}

        {/* ACTIONS */}
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

        <Text style={styles.footerHint}>
          Sau khi tạo, dự án sẽ được tạo và chuyển sang bước đề xuất thành viên.
        </Text>
      </ScrollView>

      {renderDateTimePicker()}
    </KeyboardAvoidingView>
  );
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
    gap: 18,
    maxWidth: 780,
    width: "100%",
    alignSelf: "center",
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },

  headerText: {
    flex: 1,
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

  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  title: {
    color: colors.navy,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },

  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  /* SECTION */

  section: {
    gap: 12,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
  },

  sectionDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },

  /* INPUT */

  fieldContainer: {
    gap: 7,
  },

  inputLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  textArea: {
    minHeight: 130,
    textAlignVertical: "top",
  },

  /* DROPDOWN */

  dropdownButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownPressed: {
    opacity: 0.75,
  },

  dropdownError: {
    borderColor: colors.error,
  },

  dropdownText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },

  dropdownPlaceholder: {
    color: colors.textSecondary,
  },

  dropdownArrow: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
  },

  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },

  dropdownItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dropdownItemSelected: {
    backgroundColor: "#EEF5FF",
  },

  dropdownItemPressed: {
    opacity: 0.7,
  },

  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },

  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },

  dropdownCheck: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },

  /* TECHNOLOGY */

  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  techChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  techChipSelected: {
    backgroundColor: "#E8F1FF",
    borderColor: colors.primary,
  },

  techChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  techChipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },

  /* ROLES */

  roleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  addRoleButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },

  addRoleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 13,
    gap: 12,
  },

  roleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  roleIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  roleIndexText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  roleCardTitle: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
  },

  deleteRoleButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  deleteRoleText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "700",
  },

  roleRow: {
    flexDirection: "row",
    gap: 12,
  },

  roleNameWrapper: {
    flex: 1,
  },

  quantityWrapper: {
    width: 105,
  },

  requirementInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  roleSummary: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#F4F7FB",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  roleSummaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  roleSummaryValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
  },

  /* DATE */

  dateButton: {
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  dateButtonError: {
    borderColor: colors.error,
  },

  dateIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  dateIconText: {
    fontSize: 17,
  },

  dateButtonContent: {
    flex: 1,
  },

  dateValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  datePlaceholder: {
    color: colors.textSecondary,
    fontWeight: "500",
  },

  dateHelper: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  dateArrow: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "500",
  },

  /* PRIVATE */

  privateCard: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  privateIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },

  privateIconText: {
    fontSize: 18,
  },

  privateContent: {
    flex: 1,
  },

  privateTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
  },

  privateDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  /* ERROR */

  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },

  submitErrorCard: {
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD1D1",
    padding: 12,
  },

  submitError: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  /* ACTION */

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },

  cancelButton: {
    flex: 1,
  },

  submitButton: {
    flex: 1,
  },

  footerHint: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 20,
  },

  /* DATE MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  datePickerModal: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  modalEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  modalTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3,
  },

  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: colors.textSecondary,
    fontSize: 24,
    lineHeight: 26,
  },

  pickerWrapper: {
    width: "100%",
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  pickerHost: {
    width: "100%",
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  datePreview: {
    borderRadius: 13,
    backgroundColor: "#F4F7FB",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  datePreviewLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  datePreviewValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },

  modalConfirmButton: {
    width: "100%",
  },
});
