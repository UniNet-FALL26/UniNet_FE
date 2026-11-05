import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';

export function ExternalProjectLayout({ step, children, onBack, scrollRef }: { step: 1 | 2; children: ReactNode; onBack?: () => void; scrollRef?: React.RefObject<ScrollView | null> }) {
  const { account, isLoading } = useAuthStore();
  return <SafeAreaView style={externalStyles.safe}><KeyboardAvoidingView style={externalStyles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <DetailNavigation title="Thêm dự án có sẵn" onBack={onBack} />
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={externalStyles.content}>
      <Text style={externalStyles.progress}>{step === 2 ? '✓' : '1.'} Tải tài liệu  →  2. Xem lại hồ sơ</Text>
      {isLoading ? <Text>Đang kiểm tra phiên đăng nhập…</Text> : account?.role === ACCOUNT_ROLE.STUDENT ? children : <Text style={externalStyles.error}>Vui lòng đăng nhập bằng tài khoản sinh viên để thêm dự án có sẵn.</Text>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export const externalStyles = StyleSheet.create({
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
