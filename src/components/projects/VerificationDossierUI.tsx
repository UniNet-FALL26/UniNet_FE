import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';

export const verificationDate = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';
export function DossierCard({ title, children }: { title: string; children: ReactNode }) {
  return <View style={ds.card}><Text accessibilityRole="header" style={ds.heading}>{title}</Text>{children}</View>;
}
export function DossierLayout({ title, children }: { title: string; children: ReactNode }) {
  return <SafeAreaView style={ds.safe}><View style={ds.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={ds.back}><Text style={ds.backText}>‹</Text></Pressable>
    <Text style={ds.headerTitle}>{title}</Text></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ds.content}>{children}</ScrollView></SafeAreaView>;
}
export const ds = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  back: { minWidth: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 34, color: colors.primary }, headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  content: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 40 },
  hero: { backgroundColor: '#102E54', borderRadius: 24, padding: 26, gap: 14 }, kicker: { color: '#9DCDFF', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' }, title: { fontSize: 28, lineHeight: 38, fontWeight: '800', color: '#FFFFFF' }, heroText: { fontSize: 16, lineHeight: 25, color: '#BDCEE3' },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, padding: 22, gap: 14 }, heading: { color: colors.navy, fontSize: 18, lineHeight: 27, fontWeight: '700' }, body: { color: colors.textPrimary, fontSize: 16, lineHeight: 25 }, small: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 }, notice: { backgroundColor: colors.primaryLight, padding: 16, borderRadius: 12, color: colors.navy, fontSize: 15, lineHeight: 24 }, error: { color: colors.error, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, step: { flexDirection: 'row', alignItems: 'center', gap: 12 }, number: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEF3FA', textAlign: 'center', lineHeight: 36, color: colors.primary, fontWeight: '700' }, stepText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.textPrimary }, divider: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 14, gap: 8 }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: 'top', fontSize: 16, color: colors.textPrimary },
});
