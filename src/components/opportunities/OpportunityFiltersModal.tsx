import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type AccessibilityRole } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import type { OpportunityEmploymentType, OpportunityWorkType } from '@/services/opportunities.service';

type Props = {
  visible: boolean;
  workType?: OpportunityWorkType;
  employmentType?: OpportunityEmploymentType;
  salaryMin: string;
  salaryMax: string;
  onWorkType: (value: OpportunityWorkType | undefined) => void;
  onEmploymentType: (value: OpportunityEmploymentType | undefined) => void;
  onSalaryMin: (value: string) => void;
  onSalaryMax: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
};

const workModes = [{ value: 0, label: 'Tại văn phòng' }, { value: 1, label: 'Kết hợp' }, { value: 2, label: 'Từ xa' }] as const;
const employmentTypes = [{ value: 0, label: 'Toàn thời gian' }, { value: 1, label: 'Bán thời gian' }] as const;

export function OpportunityFiltersModal({ visible, workType, employmentType, salaryMin, salaryMax, onWorkType, onEmploymentType, onSalaryMin, onSalaryMax, onClear, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 600;
  const columns = width >= 900;
  const option = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="checkbox" accessibilityLabel={label} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [s.option, selected && s.optionSelected, pressed && s.pressed]}>
    <View style={[s.check, selected && s.checkSelected]}>{selected && <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} tintColor={colors.surface} />}</View>
    <Text style={[s.optionText, selected && s.selectedText]}>{label}</Text>
  </Pressable>;

  return <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.overlay, mobile && s.mobileOverlay, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng bộ lọc" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal accessibilityRole={Platform.OS === 'web' ? 'dialog' as AccessibilityRole : undefined} accessibilityLabel="Bộ lọc cơ hội" style={[s.panel, { maxHeight: Math.max(160, height - Math.max(16, insets.top) - Math.max(16, insets.bottom)) }]}>
        <View style={s.header}>
          <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Bộ lọc cơ hội</Text><Text style={s.hint}>Chọn điều kiện phù hợp với bạn.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng cửa sổ bộ lọc" onPress={onClose} style={({ pressed }) => [s.close, pressed && s.pressed]}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textSecondary} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={[s.body, columns && s.columns]}>
          <View style={[s.group, columns && s.column]}>
            <Text style={s.label}>Hình thức làm việc</Text>
            <View style={s.options}>{workModes.map(item => option(item.label, workType === item.value, () => onWorkType(workType === item.value ? undefined : item.value)))}</View>
          </View>
          <View style={[s.group, columns && s.column]}>
            <Text style={s.label}>Thời gian làm việc</Text>
            <View style={s.options}>{employmentTypes.map(item => option(item.label, employmentType === item.value, () => onEmploymentType(employmentType === item.value ? undefined : item.value)))}</View>
          </View>
          <View style={[s.group, columns && s.salaryColumn]}>
            <View style={s.salaryHeading}><Text style={s.label}>Mức lương</Text><Text style={s.hint}>Triệu đồng / tháng</Text></View>
            <View style={s.salaryRow}>
              <View style={s.salaryField}><Text style={s.inputLabel}>Từ</Text><TextInput accessibilityLabel="Lương tối thiểu, triệu đồng mỗi tháng" keyboardType="decimal-pad" value={salaryMin} onChangeText={onSalaryMin} placeholder="Tối thiểu" placeholderTextColor={colors.textMuted} style={s.input} /></View>
              <Text style={s.dash}>–</Text>
              <View style={s.salaryField}><Text style={s.inputLabel}>Đến</Text><TextInput accessibilityLabel="Lương tối đa, triệu đồng mỗi tháng" keyboardType="decimal-pad" value={salaryMax} onChangeText={onSalaryMax} placeholder="Tối đa" placeholderTextColor={colors.textMuted} style={s.input} /></View>
            </View>
          </View>
        </ScrollView>
        <View style={s.footer}>
          <Pressable accessibilityRole="button" onPress={onClear} style={({ pressed }) => [s.clear, pressed && s.pressed]}><Text style={s.clearText}>Xóa bộ lọc</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [s.done, pressed && s.pressed]}><Text style={s.doneText}>Xong</Text></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#13243D66' },
  mobileOverlay: { justifyContent: 'flex-end', paddingHorizontal: 12 },
  panel: { width: '100%', maxWidth: 800, flexShrink: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { flex: 1, gap: 4 }, title: { fontSize: 18, fontWeight: '600', color: colors.navy }, hint: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  close: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  body: { padding: 20, gap: 24 }, columns: { flexDirection: 'row', gap: 20 }, group: { gap: 12, minWidth: 0 }, column: { flex: 1 }, salaryColumn: { flex: 1.25 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: colors.textPrimary }, options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  optionSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  check: { width: 16, height: 16, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { flexShrink: 1, fontSize: 13, lineHeight: 20, color: colors.textPrimary }, selectedText: { color: colors.primary, fontWeight: '600' },
  salaryHeading: { gap: 3 }, salaryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, salaryField: { flex: 1, minWidth: 0, gap: 6 },
  inputLabel: { fontSize: 12, color: colors.textSecondary }, input: { width: '100%', minWidth: 0, minHeight: 44, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary, fontSize: 13 }, dash: { lineHeight: 44, color: colors.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  clear: { minHeight: 44, paddingHorizontal: 8, borderRadius: 9, justifyContent: 'center' }, clearText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  done: { minHeight: 44, minWidth: 100, paddingHorizontal: 24, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, doneText: { fontSize: 14, fontWeight: '600', color: colors.surface }, pressed: { opacity: 0.7 },
});
