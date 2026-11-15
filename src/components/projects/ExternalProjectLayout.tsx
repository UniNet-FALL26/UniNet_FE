import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { SymbolView } from 'expo-symbols';

export function ExternalProjectLayout({ step, children, onBack, scrollRef, compact = false }: { step: 1 | 2; children: ReactNode; onBack?: () => void; scrollRef?: React.RefObject<ScrollView | null>; compact?: boolean }) {
  const { account, isLoading } = useAuthStore();
  return <SafeAreaView style={externalStyles.safe}><KeyboardAvoidingView style={externalStyles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <DetailNavigation title="Thêm dự án có sẵn" onBack={onBack} />
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[externalStyles.content, compact && { maxWidth: 800 }]}>
      <View style={externalStyles.steps} accessibilityLabel={`Bước ${step} trên 2: ${step === 1 ? 'Tải tài liệu' : 'Xem lại hồ sơ'}`}>
        <View style={externalStyles.step}><View style={[externalStyles.stepNumber, externalStyles.stepActive]}>{step === 2 ? <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} tintColor={colors.primary} /> : <Text style={externalStyles.stepActiveText}>1</Text>}</View><Text style={[externalStyles.stepText, step === 1 && externalStyles.stepActiveText]}>Tải tài liệu</Text></View>
        <View style={externalStyles.stepLine} />
        <View style={externalStyles.step}><View style={[externalStyles.stepNumber, step === 2 && externalStyles.stepActive]}><Text style={step === 2 ? externalStyles.stepActiveText : externalStyles.stepText}>2</Text></View><Text style={[externalStyles.stepText, step === 2 && externalStyles.stepActiveText]}>Xem lại hồ sơ</Text></View>
      </View>
      {isLoading ? <Text>Đang kiểm tra phiên đăng nhập…</Text> : account?.role === ACCOUNT_ROLE.STUDENT ? children : <Text style={externalStyles.error}>Vui lòng đăng nhập bằng tài khoản sinh viên để thêm dự án có sẵn.</Text>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export const externalStyles = StyleSheet.create({
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  stepText: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, flexShrink: 1 },
  stepActiveText: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.primary },
  stepLine: { height: 1, backgroundColor: colors.border, flex: 1, maxWidth: 64, minWidth: 12 },
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 30, color: colors.navy },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 20, paddingBottom: 50, gap: 20 },
  heading: { fontSize: 19, fontWeight: '800', color: colors.navy, flexShrink: 1 }, progress: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 }, small: { color: colors.textSecondary, fontSize: 12, lineHeight: 20 },
  error: { color: colors.error, fontSize: 13, lineHeight: 21 }, notice: { padding: 16, backgroundColor: '#EDF4FF', borderRadius: 12, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }, grow: { flex: 1, minWidth: 160 },
  file: { padding: 14, backgroundColor: colors.background, borderRadius: 12, gap: 8 }, link: { color: colors.primary, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  option: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }, selected: { backgroundColor: '#E6F0FF', borderColor: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }, modalCard: { width: '100%', maxWidth: 720, alignSelf: 'center', maxHeight: '85%', backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 16 },
});
