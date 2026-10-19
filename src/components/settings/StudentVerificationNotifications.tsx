import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { apiRequest } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

type VerificationNotification = { id: string; userVerificationId?: string | null; message: string; createdAt: string };
export function StudentVerificationNotifications({ accountId }: { accountId: string }) {
  const [notifications, setNotifications] = useState<VerificationNotification[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiRequest<VerificationNotification[]>(`/verification-notifications?page=${page}&pageSize=20`, { signal: controller.signal }).then(rows => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(rows)) throw new Error('Chưa tải được thông báo.');
      const own = rows.filter(row => row.userVerificationId && typeof row.message === 'string');
      setNotifications(current => page === 1 ? own : [...(current || []).filter(row => !own.some(next => next.id === row.id)), ...own]); setHasMore(rows.length === 20);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được thông báo.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accountId, attempt, page]));
  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><View style={s.copy}><Text role="heading" aria-level={1} style={s.title}>Thông báo</Text><Text style={s.body}>Cập nhật về yêu cầu xác minh sinh viên của bạn.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Làm mới thông báo" disabled={loading} onPress={() => { setPage(1); setAttempt(value => value + 1); }} style={s.refresh}><SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={21} tintColor={colors.primary} /></Pressable></View>
    {loading && <ActivityIndicator accessibilityLabel="Đang tải thông báo" color={colors.primary} />}
    {!!error && <View style={s.state}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Thử tải thông báo lại" variant="outline" onPress={() => setAttempt(value => value + 1)} /></View>}
    {notifications?.length === 0 && !loading && !error && <View style={s.state}><Text style={s.body}>Chưa có thông báo xác minh mới.</Text></View>}
    {notifications?.map(notification => <Pressable key={notification.id} accessibilityRole="button" accessibilityLabel={notification.message} accessibilityHint="Mở thông tin tài khoản để xem trạng thái xác minh" onPress={() => router.push({ pathname: '/settings', params: { account: '1' } })} style={({ pressed }) => [s.notification, pressed && s.pressed]}><View style={s.icon}><SymbolView name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} size={23} tintColor={colors.primary} /></View><View style={s.copy}><Text style={s.message}>{notification.message}</Text><Text style={s.date}>{Number.isNaN(Date.parse(notification.createdAt)) ? '' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(notification.createdAt))}</Text></View></Pressable>)}
    {hasMore && <Button title="Xem thêm thông báo" variant="outline" disabled={loading} onPress={() => setPage(current => current + 1)} />}
  </ScrollView>;
}
const s = StyleSheet.create({ page: { padding: 20, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }, header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 }, title: { color: colors.navy, fontSize: 25, lineHeight: 34, fontWeight: '800' }, body: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 }, copy: { flex: 1, minWidth: 0, gap: 6 }, refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, notification: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }, message: { color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '600' }, date: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 }, state: { paddingVertical: 24, gap: 12 }, error: { color: colors.error, fontSize: 13, lineHeight: 21 }, pressed: { backgroundColor: colors.primaryLight } });
