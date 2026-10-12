import { createElement, useRef, useState } from "react";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { ProjectDetail, UpdateProjectRequest } from "@/types/project";

type Props = { project: ProjectDetail; onClose: () => void; onSaved: (project: ProjectDetail) => void };
function DateField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const parsed = new Date(value);
  const valid = !Number.isNaN(parsed.getTime());
  const date = valid ? parsed : new Date();
  if (Platform.OS === "web") {
    const local = valid ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19) : "";
    return <View style={{ gap: 6 }}><Text style={styles.hint}>{label}</Text>{createElement("input", { type: "datetime-local", "aria-label": label, value: local, disabled, step: 1, style: { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #DCE4F0", borderRadius: 8, fontSize: 14 }, onChange: (event: { target: { value: string } }) => { const next = new Date(event.target.value); onChange(Number.isNaN(next.getTime()) ? "" : next.toISOString()); } })}</View>;
  }
  const choose = () => {
    if (Platform.OS !== "android") { setOpen(!open); return; }
    DateTimePickerAndroid.open({ value: date, mode: "date", onChange: (event, selected) => {
      if (event.type !== "set" || !selected) return;
      const next = new Date(date); next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      DateTimePickerAndroid.open({ value: next, mode: "time", is24Hour: true, onChange: (timeEvent, time) => { if (timeEvent.type === "set" && time) { next.setHours(time.getHours(), time.getMinutes()); onChange(next.toISOString()); } } });
    } });
  };
  return <View style={{ gap: 6 }}><Text style={styles.hint}>{label}</Text><Button title={valid ? date.toLocaleString("vi-VN") : "Chọn ngày và giờ"} variant="outline" disabled={disabled} onPress={choose} />{open && <DateTimePicker value={date} mode="datetime" disabled={disabled} onChange={(_, selected) => { if (selected) onChange(selected.toISOString()); }} />}</View>;
}
export function ProjectEditForm({ project, onClose, onSaved }: Props) {
  const [values, setValues] = useState<UpdateProjectRequest>({ title: project.title, projectField: project.projectField, description: project.description, recruitmentDeadline: project.recruitmentDeadline, expectedOutput: project.expectedOutput ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const update = (field: keyof UpdateProjectRequest, value: string) => { setValues((current) => ({ ...current, [field]: value })); setError(null); };
  const save = async () => {
    if (savingRef.current) return;
    if (!values.title.trim() || !values.projectField.trim() || !values.description.trim()) { setError("Vui lòng nhập đầy đủ tên, lĩnh vực và mô tả dự án."); return; }
    const deadline = new Date(values.recruitmentDeadline);
    const output = new Date(values.expectedOutput);
    if (!values.recruitmentDeadline.trim() || !values.expectedOutput.trim() || Number.isNaN(deadline.getTime()) || Number.isNaN(output.getTime())) { setError("Vui lòng nhập ngày giờ hợp lệ cho hạn tuyển và ngày hoàn thành."); return; }
    if (output <= deadline) { setError("Ngày hoàn thành phải sau hạn tuyển thành viên."); return; }
    savingRef.current = true;
    setSaving(true); setError(null);
    try {
      const updated = await projectService.updateProject(project.id, { title: values.title.trim(), projectField: values.projectField.trim(), description: values.description.trim(), recruitmentDeadline: deadline.toISOString(), expectedOutput: output.toISOString() });
      onSaved(updated);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật dự án. Vui lòng thử lại."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.dialog} accessibilityViewIsModal>
        <Text style={styles.title}>Chỉnh sửa dự án</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
          <Input label="Tên dự án" value={values.title} onChangeText={(value) => update("title", value)} editable={!saving} />
          <Input label="Lĩnh vực dự án" value={values.projectField} onChangeText={(value) => update("projectField", value)} editable={!saving} />
          <Input label="Mô tả dự án" value={values.description} onChangeText={(value) => update("description", value)} multiline editable={!saving} />
          <DateField label="Hạn tuyển thành viên" value={values.recruitmentDeadline} disabled={saving} onChange={(value) => update("recruitmentDeadline", value)} />
          <DateField label="Ngày dự kiến hoàn thành" value={values.expectedOutput} disabled={saving} onChange={(value) => update("expectedOutput", value)} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actions}><Button title="Hủy" variant="outline" disabled={saving} onPress={onClose} style={{ flex: 1 }} /><Button title="Lưu thay đổi" loading={saving} onPress={save} style={{ flex: 1 }} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 18 },
  dialog: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 16 },
  title: { color: colors.navy, fontSize: 20, fontWeight: "700" },
  fields: { gap: 14 }, actions: { flexDirection: "row", gap: 10 },
  hint: { color: colors.textSecondary, fontSize: 12 }, error: { color: colors.error },
});
