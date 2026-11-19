import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { assessorProfileTabs, type AssessorProfileTab } from '@/constants/assessor-profile-tabs';
import { colors } from '@/constants/colors';

export function AssessorProfileTabs({ active, onChange }: { active: AssessorProfileTab; onChange: (tab: AssessorProfileTab) => void }) {
  return <ScrollView horizontal accessibilityRole="tablist" accessibilityLabel="Các phần hồ sơ" showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.content}>
    {assessorProfileTabs.map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} aria-selected={active === tab.id} onPress={() => onChange(tab.id)} style={({ pressed }) => [s.tab, active === tab.id && s.active, pressed && s.pressed]}>
      <SymbolView name={tab.icon} size={16} tintColor={active === tab.id ? colors.primary : colors.textSecondary} /><Text style={[s.label, active === tab.id && s.activeLabel]}>{tab.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
const s = StyleSheet.create({
  tabs: { flexGrow: 0, borderTopWidth: 1, borderTopColor: '#EDF2F8' }, content: { paddingHorizontal: 12, gap: 8 },
  tab: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary }, active: { borderBottomColor: colors.primary }, activeLabel: { color: colors.primary }, pressed: { opacity: 0.7 },
});
