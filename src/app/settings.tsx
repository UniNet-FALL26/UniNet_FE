import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { hasStudentPortfolioContent } from '@/utils/student-profile';
import type { PortfolioResponse } from '@/types/portfolio';

export default function SettingsScreen() {
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const student = account?.role === ACCOUNT_ROLE.STUDENT;
  const [loaded, setLoaded] = useState<{ accountId: string; data: PortfolioResponse } | null>(null);
  const data = isAuthenticated && loaded && loaded.accountId === account?.id ? loaded.data : null;
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false); const [retryValue, setRetryValue] = useState<boolean | null>(null);
  const writeController = useRef<AbortController | null>(null);
  usePreventRemove(saving, () => {});
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    setLoaded(null); setError(''); setMessage(''); setSaving(false); setRetryValue(null);
    if (!student || !isAuthenticated || !account?.id) return;
    const controller = new AbortController(); const accountId = account.id;
    portfolioService.getMine(controller.signal).then(result => {
      if (!result.isOwner) throw new Error('Bạn không có quyền cập nhật cài đặt hồ sơ này.');
      if (!controller.signal.aborted) setLoaded({ accountId, data: result });
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được cài đặt hồ sơ.'); });
    return () => { controller.abort(); writeController.current?.abort(); writeController.current = null; };
  }, [account?.id, student, isAuthenticated, attempt]);
  const changeDisplay = async (value: boolean) => {
    if (!data || !account?.id || writeController.current) return;
    const controller = new AbortController(); const accountId = account.id; writeController.current = controller;
    setSaving(true); setMessage(''); setRetryValue(null);
    try {
      const result = await portfolioService.saveDisplay(value, controller.signal);
      if (!result.isOwner) throw new Error('Bạn không có quyền cập nhật cài đặt hồ sơ này.');
      if (!controller.signal.aborted) { setLoaded({ accountId, data: result }); setMessage('Đã cập nhật cách hiển thị hồ sơ.'); }
    } catch (cause) {
      if (!controller.signal.aborted) { setRetryValue(value); setMessage(cause instanceof Error ? cause.message : 'Chưa cập nhật được cài đặt. Vui lòng thử lại.'); }
    } finally {
      if (writeController.current === controller) { writeController.current = null; setSaving(false); }
    }
  };
  if (account && !student) return <ComingSoon title="Cài đặt" />;
  return <SafeAreaView style={s.safe}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại hồ sơ cá nhân" disabled={saving} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} style={s.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.textPrimary} /></Pressable><Text role="heading" aria-level={1} style={s.title}>Cài đặt</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      {isLoading ? <ActivityIndicator accessibilityLabel="Đang tải phiên đăng nhập" color={colors.primary} /> : !isAuthenticated ? <View style={s.state}><Text style={s.body}>Đăng nhập để thay đổi cài đặt hồ sơ.</Text><Button title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></View> : error ? <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></View> : !data ? <ActivityIndicator accessibilityLabel="Đang tải cài đặt hồ sơ" color={colors.primary} /> : <View style={s.card}>
        <Text role="heading" aria-level={2} style={s.sectionTitle}>Cài đặt hồ sơ</Text>
        <View style={s.switchRow}><View style={s.copy}><Text style={s.label}>Hiển thị hồ sơ portfolio</Text><Text style={s.body}>Bật để dùng mẫu hồ sơ đã lưu. Tắt để dùng hồ sơ mặc định. Nội dung và quyền riêng tư của bạn được giữ nguyên.</Text></View><Switch accessibilityLabel="Hiển thị hồ sơ portfolio" disabled={saving} value={data.portfolio.appearance.profile.showPortfolio ?? hasStudentPortfolioContent(data)} onValueChange={value => { void changeDisplay(value); }} trackColor={{ false: colors.border, true: colors.primary }} /></View>
        {saving && <View style={s.status}><ActivityIndicator color={colors.primary} /><Text style={s.body}>Đang lưu cài đặt…</Text></View>}
        {!!message && <Text accessibilityLiveRegion="polite" accessibilityRole={retryValue !== null ? 'alert' : undefined} style={retryValue !== null ? s.error : s.success}>{message}</Text>}
        {retryValue !== null && <Button title="Thử lưu lại" variant="outline" onPress={() => { void changeDisplay(retryValue); }} disabled={saving} />}
        <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ" disabled={saving} onPress={() => router.push({ pathname: '/profile/editor', params: { template: data.portfolio.appearance.profile.template, theme: data.portfolio.appearance.profile.theme } })} style={s.edit}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={18} tintColor={colors.primary} /><Text style={s.editLabel}>Chỉnh sửa hồ sơ</Text></Pressable>
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18, gap: 16 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 18, gap: 18 }, sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16 }, copy: { flex: 1, minWidth: 0, gap: 8 }, label: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' }, body: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, status: { flexDirection: 'row', alignItems: 'center', gap: 8 }, state: { gap: 16 }, error: { color: colors.error, fontSize: 13, lineHeight: 21 }, success: { color: colors.success, fontSize: 13, lineHeight: 21 }, edit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, editLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
