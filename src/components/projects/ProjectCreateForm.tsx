import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { ProjectInformationFields } from "./ProjectInformationFields";
import { ProjectDateTimeModal } from "./ProjectDateTimeModal";
import { useAuthStore } from "@/store/auth.store";
import { ACCOUNT_ROLE } from "@/constants/roles";
import { Modal } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { skillService, type SkillCatalogItem } from "@/services/skill.service";
import { projectFields } from "@/constants/project-fields";
import { ProjectVisibility, type CreateProjectRequest } from "@/types/project";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const emptyRole = () => ({
  id: "",
  role: "",
  quantity: 1,
  requirements: "",
});

type DatePickerTarget = "recruitmentDeadline" | "expectedOutput" | null;

export function ProjectCreateScreen() {
  const { account } = useAuthStore();
  const [importConfirmation, setImportConfirmation] = useState(false);
  const compact = useWindowDimensions().width < 600;
  const [title, setTitle] = useState("");
  const [specializationId, setSpecializationId] = useState("");
  const [projectField, setProjectField] = useState("");
  const [customProjectField, setCustomProjectField] = useState("");
  const [description, setDescription] = useState("");

  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [technologies, setTechnologies] = useState<string[]>([]);

  const [memberTarget, setMemberTarget] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [roles, setRoles] = useState([emptyRole()]);

  const [recruitmentDeadline, setRecruitmentDeadline] = useState<Date | null>(
    null,
  );
  const [expectedOutputDate, setExpectedOutputDate] = useState<Date | null>(
    null,
  );

  const [isPrivate, setIsPrivate] = useState(false);

  const [datePickerTarget, setDatePickerTarget] =
    useState<DatePickerTarget>(null);
  const [datePickerStep, setDatePickerStep] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);
    setCatalogLoading(true);
    skillService
      .getSkills(controller.signal)
      .then((catalog) => {
        if (controller.signal.aborted) return;
        setSkillCatalog(catalog);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setCatalogError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải danh mục kỹ năng.",
          );
      }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [catalogRetry]);

  const totalRoleQuantity = useMemo(
    () => roles.reduce((sum, role) => sum + Number(role.quantity || 0), 0),
    [roles],
  );

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
    if (roles.length === 1) return;
    setRoles((current) =>
      current.filter((_, roleIndex) => roleIndex !== index),
    );
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const openDateTimePicker = (target: Exclude<DatePickerTarget, null>) => {
    const currentDate = target === "expectedOutput" ? expectedOutputDate : recruitmentDeadline;
    const saveDate = target === "expectedOutput" ? setExpectedOutputDate : setRecruitmentDeadline;
    const initialDate = currentDate
      ? new Date(currentDate)
      : new Date();

    if (!currentDate) {
      initialDate.setHours(23, 59, 0, 0);
    }

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: "date",
        display: "calendar",
        minimumDate: new Date(),
        onValueChange: (_event, selectedDate) => {
          if (!selectedDate) return;

          const selectedDay = new Date(initialDate);
          selectedDay.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          );

          DateTimePickerAndroid.open({
            value: selectedDay,
            mode: "time",
            display: "clock",
            is24Hour: true,
            onValueChange: (_timeEvent, selectedTime) => {
              if (!selectedTime) return;

              const finalDate = new Date(selectedDay);
              finalDate.setHours(
                selectedTime.getHours(),
                selectedTime.getMinutes(),
                0,
                0,
              );
              saveDate(finalDate);
            },
          });
        },
      });
      return;
    }

    setTempDate(initialDate);
    setDatePickerTarget(target);
    setDatePickerStep("date");
  };

  const openDeadlinePicker = () => openDateTimePicker("recruitmentDeadline");
  const openExpectedOutputDatePicker = () => openDateTimePicker("expectedOutput");

  const closeDatePicker = () => {
    setDatePickerTarget(null);
    setDatePickerStep("date");
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!specializationId) nextErrors.specializationId = "Vui lòng chọn chuyên ngành dự án.";

    if (!title.trim()) {
      nextErrors.title = "Tên dự án là bắt buộc.";
    }

    if (!projectField) {
      nextErrors.projectField = "Vui lòng chọn lĩnh vực dự án.";
    } else if (projectField === "Khác" && !customProjectField.trim()) {
      nextErrors.customProjectField = "Vui lòng nhập tên lĩnh vực cụ thể.";
    }

    if (!description.trim()) {
      nextErrors.description = "Mô tả dự án là bắt buộc.";
    }

    const parsedTarget = Number(memberTarget);
    if (!memberTarget || !Number.isInteger(parsedTarget) || parsedTarget < 2) {
      nextErrors.memberTarget =
        "Số thành viên mục tiêu phải lớn hơn 1 và bao gồm người tạo.";
    }

    const parsedMinimum = Number(minimumQuantity);
    if (!minimumQuantity || !Number.isInteger(parsedMinimum) || parsedMinimum < 2) {
      nextErrors.minimumQuantity =
        "Số thành viên tối thiểu phải là số nguyên từ 2 và bao gồm người tạo.";
    } else if (parsedMinimum > parsedTarget) {
      nextErrors.minimumQuantity =
        "Số thành viên tối thiểu không được vượt quá số thành viên mục tiêu.";
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
    } else if (recruitmentDeadline.getTime() <= Date.now()) {
      nextErrors.recruitmentDeadline = "Hạn chót phải nằm trong tương lai.";
    }

    if (!expectedOutputDate) {
      nextErrors.expectedOutput = "Ngày dự kiến hoàn thành là bắt buộc.";
    } else if (
      recruitmentDeadline &&
      expectedOutputDate.getTime() <= recruitmentDeadline.getTime()
    ) {
      nextErrors.expectedOutput =
        "Ngày hoàn thành phải sau hạn tuyển thành viên.";
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const finalProjectField =
      projectField === "Khác" ? customProjectField.trim() : projectField;

    const payload: CreateProjectRequest = {
      specializationId,
      title: title.trim(),
      projectField: finalProjectField,
      description: description.trim(),
      skillIds: skillCatalog
        .filter((skill) => technologies.includes(skill.name))
        .map((skill) => skill.id),
      memberTarget: Number(memberTarget),
      minimumQuantity: Number(minimumQuantity),
      roleRequirements: roles.map((role) => ({
        role: role.role.trim(),
        quantity: Number(role.quantity),
        requirements: role.requirements.trim(),
      })),
      recruitmentDeadline: recruitmentDeadline!.toISOString(),
      expectedOutput: expectedOutputDate!.toISOString(),
      visibility: isPrivate
        ? ProjectVisibility.Private
        : ProjectVisibility.Public,
    };

    try {
      router.push({
        pathname: "/group/recommendations" as never,
        params: {
          draft: JSON.stringify(payload),
        },
      } as never);
    } catch {
      setSubmitError("Không thể chuyển sang bước xác nhận. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDateTimePicker = () => {
    if (!datePickerTarget || Platform.OS === "android") return null;

    const isOutputDate = datePickerTarget === "expectedOutput";
    if (Platform.OS === "web") {
      return <ProjectDateTimeModal title={isOutputDate ? "Ngày dự kiến bàn giao sản phẩm" : "Hạn chót nộp đơn tham gia"} initialValue={tempDate} onClose={closeDatePicker} onConfirm={selectedDate => {
        if (isOutputDate) setExpectedOutputDate(selectedDate); else setRecruitmentDeadline(selectedDate);
        setErrors(previous => ({ ...previous, [isOutputDate ? 'expectedOutput' : 'recruitmentDeadline']: '' }));
        closeDatePicker();
      }} />;
    }
    const mode = datePickerStep;

    return (
      <DateTimePicker
        key={`${datePickerTarget}-${mode}`}
        value={tempDate}
        mode={mode}
        display="compact"
        minimumDate={new Date()}
        onChange={(event, selectedDate) => {
          if (event.type === "dismissed" || !selectedDate) {
            closeDatePicker();
            return;
          }

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

          const finalDate = new Date(tempDate);
          finalDate.setHours(
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            0,
            0,
          );
          if (isOutputDate) setExpectedOutputDate(finalDate);
          else setRecruitmentDeadline(finalDate);
          closeDatePicker();
        }}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <DetailNavigation title="Tạo dự án" backLabel="Quay lại danh sách dự án" onBack={() => router.dismissTo('/(tabs)/groups' as never)} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* THÔNG TIN DỰ ÁN */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Thông tin dự án</Text>
              <Text style={styles.sectionDescription}>
                Tên, mô tả và kỹ năng cần có.
              </Text>
            </View>
          </View>

          <View style={styles.card}><ProjectInformationFields compact
            specializationId={specializationId} onSpecialization={value => { setSpecializationId(value); setErrors(previous => ({ ...previous, specializationId: '' })); }}
            title={title} projectField={projectField === 'Khác' ? customProjectField : projectField} description={description}
            skillIds={skillCatalog.filter(skill => technologies.includes(skill.name)).map(skill => skill.id)}
            onTitle={setTitle} onField={value => { if (projectFields.includes(value)) { setProjectField(value); setCustomProjectField(''); } else { setProjectField('Khác'); setCustomProjectField(value); } }} onDescription={setDescription}
            onSkills={ids => setTechnologies(skillCatalog.filter(skill => ids.includes(skill.id)).map(skill => skill.name))}
            catalog={skillCatalog} loading={catalogLoading} catalogError={catalogError} reloadCatalog={() => setCatalogRetry(value => value + 1)}
            errors={{ ...errors, projectField: errors.projectField || errors.customProjectField }} disabled={submitting}
          /></View>
        </View>

        {/* QUY MÔ */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Thành viên</Text>
              <Text style={styles.sectionDescription}>
                Số người và vai trò cần tuyển.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.fieldRow, compact && styles.stackedRow]}>
            <View style={styles.fieldColumn}>
            <Input appearance="project" compact
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

            </View>
            <View style={styles.fieldColumn}>
            <Input appearance="project" compact
              label="Số thành viên tối thiểu *"
              value={minimumQuantity}
              onChangeText={setMinimumQuantity}
              keyboardType="numeric"
              placeholder="Ví dụ: 2"
              error={errors.minimumQuantity}
            />
            <Text style={styles.helperText}>
              Bao gồm người tạo và không vượt quá số thành viên mục tiêu.
            </Text>
            </View>
            </View>

            <View style={styles.roleSectionHeader}>
              <View>
                <Text style={styles.inputLabel}>Các vai trò cần tuyển *</Text>
                <Text style={styles.helperText}>
                  Cần tuyển: {Math.max(Number(memberTarget || 0) - 1, 0)} thành
                  viên
                </Text>
              </View>

              <Pressable accessibilityRole="button" hitSlop={6} onPress={addRole} style={styles.addRoleButton}>
                <Text style={styles.addRoleText}>+ Thêm vai trò</Text>
              </Pressable>
            </View>

            {roles.map((role, index) => (
              <View key={`${index}-role`} style={styles.roleCard}>
                <View style={styles.roleCardHeader}>
                  <View style={styles.roleIndex}>
                    <Text style={styles.roleIndexText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.roleCardTitle}>{role.role.trim() || `Vai trò ${index + 1}`}</Text>

                  {roles.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa vai trò ${index + 1}`}
                      hitSlop={6}
                      onPress={() => removeRole(index)}
                      style={styles.deleteRoleButton}
                    >
                      <Text style={styles.deleteRoleText}>Xóa</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={[styles.roleRow, compact && { flexDirection: "column" }]}>
                  <View style={styles.roleNameWrapper}>
                    <Input appearance="project" compact

                      label="Tên vai trò *"
                      value={role.role}
                      onChangeText={(value) => updateRole(index, "role", value)}
                      placeholder="Ví dụ: Frontend Developer"
                    />
                  </View>

                  <View style={[styles.quantityWrapper, compact && { width: "100%" }]}>
                    <Input appearance="project" compact

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

                <Input appearance="project" compact

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

          </View>
        </View>

        {/* THỜI GIAN */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Thời hạn</Text>
              <Text style={styles.sectionDescription}>
                Hạn tuyển thành viên và ngày bàn giao dự kiến.
              </Text>
            </View>
          </View>

          <View style={[styles.card, styles.fieldRow, compact && styles.stackedRow]}>
            {/* DEADLINE */}
            <View style={[styles.fieldContainer, styles.fieldColumn]}>
              <Text style={styles.inputLabel}>Hạn chót nộp đơn tham gia *</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn hạn chót nộp đơn tham gia"
                onPress={openDeadlinePicker}
                style={[
                  styles.dateButton,
                  errors.recruitmentDeadline && styles.dateButtonError,
                ]}
              >
                <View style={styles.dateIcon}>
                  <SymbolView name={{ ios: "calendar", android: "calendar_today", web: "calendar_today" }} size={19} tintColor={colors.primary} />
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

            {/* EXPECTED OUTPUT DATE AND TIME */}
            <View style={[styles.fieldContainer, styles.fieldColumn]}>
              <Text style={styles.inputLabel}>
                Ngày dự kiến bàn giao sản phẩm *
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn ngày dự kiến bàn giao sản phẩm"
                onPress={openExpectedOutputDatePicker}
                style={[styles.dateButton, errors.expectedOutput && styles.dateButtonError]}
              >
                <View style={styles.dateIcon}>
                  <SymbolView name={{ ios: "flag", android: "outlined_flag", web: "outlined_flag" }} size={19} tintColor={colors.primary} />
                </View>

                <View style={styles.dateButtonContent}>
                  <Text
                    style={[
                      styles.dateValue,
                      !expectedOutputDate && styles.datePlaceholder,
                    ]}
                  >
                    {expectedOutputDate
                      ? formatDateTime(expectedOutputDate)
                      : "Chọn ngày và giờ hoàn thành"}
                  </Text>
                  <Text style={styles.dateHelper}>Ngày / tháng / năm • Giờ : phút</Text>
                </View>

                <Text style={styles.dateArrow}>›</Text>
              </Pressable>
              {errors.expectedOutput ? <Text style={styles.errorText}>{errors.expectedOutput}</Text> : null}
            </View>
          </View>
        </View>

        {/* PRIVATE PROJECT */}
        <View style={styles.privateCard}>
          <View style={styles.privateIcon}>
            <SymbolView name={isPrivate ? { ios: "lock", android: "lock_outline", web: "lock_outline" } : { ios: "globe", android: "public", web: "public" }} size={21} tintColor={colors.primary} />
          </View>

          <View style={styles.privateContent}>
            <Text style={styles.privateTitle}>
              {isPrivate ? "Dự án riêng tư" : "Dự án công khai"}
            </Text>
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
            onPress={() => router.dismissTo("/(tabs)/groups" as never)}
            style={styles.cancelButton}
            textStyle={styles.actionText}
          />

          <Button
            title="Tiếp theo"
            variant="primary"
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submitButton}
            textStyle={styles.actionText}
          />
        </View>

        <Text style={styles.footerHint}>
          Tiếp theo: tạo dự án và nhận đề xuất thành viên phù hợp.
        </Text>
        {account?.role === ACCOUNT_ROLE.STUDENT && <View style={[styles.importCard, compact && styles.importCardCompact]}>
          <View style={styles.importIntro}>
            <View style={styles.importIcon}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={21} tintColor={colors.primary} /></View>
            <View style={styles.importCopy}><Text style={styles.importTitle}>Bạn có dự án đã hoàn thành?</Text><Text style={styles.sectionDescription}>Thêm dự án ngoài UniNet để gửi thẩm định.</Text></View>
          </View>
          <Button title="Thêm dự án có sẵn" variant="outline" style={styles.importButton} textStyle={styles.actionText} disabled={submitting} onPress={() => {
          const dirty = !!(specializationId || title || projectField || customProjectField || description || technologies.length || memberTarget || minimumQuantity || recruitmentDeadline || expectedOutputDate || isPrivate || roles.some(role => role.role || role.requirements || role.quantity !== 1));
          if (dirty) setImportConfirmation(true); else router.push('/group/import' as never);
        }} /></View>}
      </ScrollView>

      <Modal visible={importConfirmation} transparent animationType="fade" onRequestClose={() => setImportConfirmation(false)}><View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000066', padding: 24 }}><View style={[styles.card, { width: '100%', maxWidth: 520, alignSelf: 'center' }]}><Text style={styles.sectionTitle}>Chuyển sang thêm dự án có sẵn?</Text><Text style={styles.sectionDescription}>Thông tin tạo dự án chưa được gửi. Bạn có thể quay lại để tiếp tục nhập.</Text><Button title="Ở lại form hiện tại" variant="outline" onPress={() => setImportConfirmation(false)} /><Button title="Chuyển luồng" onPress={() => { setImportConfirmation(false); router.push('/group/import' as never); }} /></View></View></Modal>
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
    gap: 24,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 0,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
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

  title: {
    color: colors.navy,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
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

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "600",
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
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },

  /* INPUT */
  fieldContainer: {
    gap: 7,
  },

  customFieldInputWrapper: {
    marginTop: 8,
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
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
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
  customTechInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 4,
  },

  customTechInputContainer: {
    flex: 1,
    minWidth: 0,
  },

  addTechButton: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",

  },

  addTechButtonPressed: {
    opacity: 0.7,
  },

  addTechButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  techChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    maxWidth: "100%",
  },

  techChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },

  techChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  techChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* ROLES */
  roleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  addRoleButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
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

  /* DATE */
  dateButton: {
    minHeight: 56,
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
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
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
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  cancelButton: {
    minHeight: 40,
    minWidth: 88,
    paddingHorizontal: 16,
  },

  submitButton: {
    minHeight: 40,
    minWidth: 112,
    paddingHorizontal: 20,
  },

  actionText: { fontSize: 14 },
  importCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  importCardCompact: { flexDirection: "column", alignItems: "stretch" },
  importIntro: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  importIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  importCopy: { flex: 1, minWidth: 0, gap: 2 },
  importTitle: { color: colors.navy, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  importButton: { minHeight: 40, alignSelf: "flex-start", paddingHorizontal: 14 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  stackedRow: { flexDirection: "column", alignItems: "stretch" },
  fieldColumn: { flex: 1, minWidth: 0, gap: 6 },

  footerHint: {
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
