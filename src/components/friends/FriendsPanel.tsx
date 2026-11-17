import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { friendshipService } from '@/services/friendship.service';
import type { FriendList, FriendPage } from '@/types/friendship';
import { FriendActions } from './FriendActions';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { HubAction, HubIcon, hubColors as c, ui } from '@/components/projects/hub/ProjectHubUI';
import { ACCOUNT_ROLE } from '@/constants/roles';

const tabs: { id: FriendList; label: string }[] = [{ id: 'friends', label: 'Bạn bè' }, { id: 'received', label: 'Lời mời đã nhận' }, { id: 'sent', label: 'Lời mời đã gửi' }, { id: 'people', label: 'Tìm bạn' }];
export function FriendsPanel() {
  const { account } = useAuthStore(), { revision } = useNotificationUpdates();
  const [kind, setKind] = useState<FriendList>('friends'), [q, setQ] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<FriendPage | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  useFocusEffect(useCallback(() => { setAttempt(value => value + 1); }, []));
  useEffect(() => {
    const controller = new AbortController(), request = ++generation.current;
    setLoading(true); setError('');
    if (account?.role !== ACCOUNT_ROLE.STUDENT) { setData(null); setLoading(false); return () => controller.abort(); }
    const timer = setTimeout(() => friendshipService.list(kind, q.trim(), page, controller.signal).then(result => { if (!controller.signal.aborted && request === generation.current) { const last = Math.max(1, Math.ceil(result.total / 20)); if (page > last) setPage(last); else setData(result); } }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách bạn bè.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), q ? 250 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [account?.id, account?.role, kind, q, page, attempt, revision]);
  if (account?.role !== ACCOUNT_ROLE.STUDENT) return null;
  return <ScrollView testID="friends-panel" style={{ flex: 1, minHeight: 0 }} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><View style={s.intro}><View style={s.emblem}><HubIcon name="people" size={24} /></View><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.title}>Kết nối cùng UniNet</Text><Text style={s.hint}>Tìm người đồng hành, chia sẻ ý tưởng và xây dựng những dự án cùng nhau.</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{tabs.map(tab => <Pressable key={tab.id} role="tab" accessibilityLabel={tab.label} aria-selected={kind === tab.id} onPress={() => { setKind(tab.id); setPage(1); setData(null); }} style={[s.tab, kind === tab.id && s.selected]}><Text style={{ color: kind === tab.id ? c.primary : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{tab.label}</Text></Pressable>)}</ScrollView>
    <View style={s.search}><HubIcon name="search" size={18} /><TextInput accessibilityLabel="Tìm bạn theo tên hoặc nickname" placeholder="Tìm theo tên hoặc nickname…" value={q} maxLength={100} onChangeText={value => { setQ(value); setPage(1); }} style={s.input} /></View>
    {error ? <View style={s.empty}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Thử lại" onPress={() => setAttempt(v => v + 1)} /></View> : loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bạn bè" /> : <>
      <Text style={s.count}>{data?.total ?? 0} {kind === 'friends' ? 'bạn bè' : 'người dùng'}</Text>
      {!data?.items.length ? <View style={s.empty}><HubIcon name="people" size={34} /><Text style={s.hint}>{q ? 'Không tìm thấy người dùng phù hợp.' : kind === 'friends' ? 'Chưa có bạn bè. Hãy tìm và kết nối với người bạn muốn đồng hành.' : 'Chưa có lời mời trong danh sách này.'}</Text>{kind === 'friends' && <HubAction compact title="Tìm bạn mới" onPress={() => { setKind('people'); setPage(1); }} />}</View> : data.items.map(person => <View key={person.accountId} testID={`friend-person-${person.accountId}`} style={s.person}>
        <Pressable accessibilityRole="link" accessibilityLabel={`Xem hồ sơ ${person.fullName}`} onPress={() => router.push({ pathname: '/profile/view/[id]', params: { id: person.profileId } } as never)} style={s.identity}><PersonAvatar person={person} size={44} /><View style={{ flex: 1, minWidth: 0 }}><Text style={s.name}>{person.fullName}</Text><Text style={s.hint}>@{person.nickname}</Text></View></Pressable>
        <FriendActions person={person} onChanged={value => { setData(current => current && ({ ...current, items: current.items.map(item => item.accountId === value.accountId ? value : item) })); setAttempt(v => v + 1); }} />
      </View>)}
      {!!data && data.total > 20 && <View style={s.pagination}><HubAction compact title="Trang trước" disabled={page === 1} onPress={() => setPage(v => v - 1)} /><Text style={s.hint}>{page} / {Math.ceil(data.total / 20)}</Text><HubAction compact title="Trang sau" disabled={page * 20 >= data.total} onPress={() => setPage(v => v + 1)} /></View>}
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({ page: { padding: 18, gap: 16, paddingBottom: 32 }, intro: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }, emblem: { width: 52, height: 52, borderRadius: 16, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' }, title: { color: c.ink, fontSize: 22, fontWeight: '700', marginBottom: 6 }, hint: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, tabs: { gap: 8 }, tab: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.line }, selected: { backgroundColor: c.blueWash, borderColor: '#BCD0FF' }, search: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 11, backgroundColor: '#FFFFFF' }, input: { flex: 1, minWidth: 0, paddingVertical: 12, color: c.ink, fontSize: 13 }, count: { color: c.textSecondary, fontSize: 12 }, person: { padding: 16, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, identity: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: c.ink, fontWeight: '600', fontSize: 14 }, empty: { alignItems: 'center', padding: 24, gap: 14, borderRadius: 14, backgroundColor: '#FFFFFF' }, pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 } });
