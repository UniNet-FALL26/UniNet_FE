import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type AccessibilityRole } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';

type Props = {
  title: string;
  visible: boolean;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function ProjectSelectModal({ title, visible, value, options, onSelect, onClose }: Props) {
  return <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Đóng ${title.toLowerCase()}`} onPress={onClose} />
      <View style={s.dialog} accessibilityViewIsModal role="dialog" accessibilityRole={Platform.OS === 'web' ? 'dialog' as AccessibilityRole : undefined} accessibilityLabel={title}>
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng cửa sổ chọn" onPress={onClose} style={s.close}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.options}>
          {options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: option.value === value }} onPress={() => { onSelect(option.value); onClose(); }} style={({ pressed }) => [s.option, option.value === value && s.selected, pressed && s.pressed]}>
            <Text style={s.label}>{option.label}</Text>
            {option.value === value && <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={18} tintColor={colors.primary} />}
          </Pressable>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#00000066' },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '80%', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  options: { padding: 12, gap: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  label: { flex: 1, fontSize: 14, color: colors.textPrimary },
  selected: { backgroundColor: colors.primaryLight },
  pressed: { backgroundColor: colors.background },
});
