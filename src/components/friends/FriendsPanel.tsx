import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { friendshipService } from '@/services/friendship.service';
import type { FriendList, FriendPage } from '@/types/friendship';
import { FriendActions } from './FriendActions';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { HubAction, HubIcon, hubColors as c, ui } from '@/components/projects/hub/ProjectHubUI';
import { ACCOUNT_ROLE } from '@/constants/roles';

const tabs: { id: FriendList; label: string }[] = [{ id: 'friends', label: 'Bạn bè' }, { id: 'received', label: 'Lời mời kết bạn' }];
export function FriendsPanel() {
  const compact = useWindowDimensions().width < 600;
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
  return <ScrollView testID="friends-panel" style={{ flex: 1, minHeight: 0 }} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={[s.header, compact && s.headerCompact]}>
      {!compact && <View testID="friends-banner" style={s.intro}>
        <Image pointerEvents="none" aria-hidden source={require('../../../assets/images/friends-banner-illustration.png')} style={s.art} contentFit="contain" contentPosition="right bottom" />
        <View style={s.introCopy}><Text accessibilityRole="header" style={s.title}>Kết nối với bạn bè trên UniNet</Text><Text style={s.hint}>Tìm kiếm, kết bạn và mở rộng mạng lưới học tập, dự án và cơ hội nghề nghiệp.</Text></View>
      </View>}
      <View role="tablist" accessibilityLabel="Danh sách bạn bè" style={[s.tabs, compact && s.tabsCompact]}>{tabs.map(tab => <Pressable key={tab.id} role="tab" accessibilityLabel={tab.label} aria-selected={kind === tab.id} onPress={() => { if (kind !== tab.id) { setKind(tab.id); setPage(1); setData(null); } }} style={[s.tab, kind === tab.id && s.selected]}><Text style={[s.tabText, kind === tab.id && s.selectedText]}>{tab.label}</Text></Pressable>)}</View>
    </View>
    <View style={s.list}>
      <View style={s.listHead}><Text accessibilityRole="header" aria-level={2} style={s.heading}>{kind === 'friends' ? 'Bạn bè' : 'Lời mời kết bạn'}{!loading && !error && data ? ` (${data.total})` : ''}</Text>
        <View testID="friends-search" style={s.search}><HubIcon name="search" size={16} /><TextInput accessibilityLabel="Tìm bạn theo tên hoặc nickname" placeholder="Tìm kiếm…" placeholderTextColor={c.textSecondary} value={q} maxLength={100} onChangeText={value => { setQ(value); setPage(1); setData(null); }} style={s.input} /></View>
      </View>
      {error ? <View style={s.empty}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><HubAction compact title="Thử lại" onPress={() => setAttempt(v => v + 1)} /></View> : loading ? <View style={s.empty}><ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bạn bè" /></View> : <>
        {!data?.items.length ? <View style={s.empty}><HubIcon name="people" size={34} /><Text style={s.hint}>{q ? 'Không tìm thấy người dùng phù hợp.' : kind === 'friends' ? 'Bạn chưa có bạn bè. Kết nối với mọi người từ trang hồ sơ của họ.' : 'Bạn chưa có lời mời kết bạn mới.'}</Text></View> : data.items.map(person => <View key={person.accountId} testID={`friend-person-${person.accountId}`} style={s.person}>
          <Pressable accessibilityRole="link" accessibilityLabel={`Xem hồ sơ ${person.fullName}`} onPress={() => router.push({ pathname: '/profile/view/[id]', params: { id: person.profileId } } as never)} style={s.identity}><PersonAvatar person={person} size={48} /><View style={s.personInfo}><Text style={s.name}>{person.fullName}</Text><View style={s.mutual}><HubIcon name="people" size={15} color={c.textSecondary} /><Text style={s.mutualText}>{person.mutualFriendsCount ?? 0} bạn chung</Text></View></View></Pressable>
          <FriendActions list person={person} onChanged={() => { setData(null); setAttempt(v => v + 1); }} />
        </View>)}
        {!!data && data.total > 20 && <View style={s.pagination}><HubAction compact title="Trang trước" disabled={page === 1} onPress={() => setPage(v => v - 1)} /><Text style={s.hint}>{page} / {Math.ceil(data.total / 20)}</Text><HubAction compact title="Trang sau" disabled={page * 20 >= data.total} onPress={() => setPage(v => v + 1)} /></View>}
      </>}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 32, backgroundColor: c.canvas },
  header: { borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: c.line },
  headerCompact: { borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent' },
  intro: { minHeight: 210, padding: 20, paddingBottom: 64, justifyContent: 'center', backgroundColor: '#E8F2FF', overflow: 'hidden' },
  introCopy: { width: '53%', maxWidth: 420, gap: 8 },
  art: { position: 'absolute', bottom: -30, right: 0, width: '100%', height: '135%' },
  title: { color: c.ink, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  hint: { color: c.textSecondary, fontSize: 13, lineHeight: 20 },
  tabs: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12 },
  tabsCompact: { position: 'relative', paddingHorizontal: 0 },
  tab: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  selected: { borderBottomColor: c.primary },
  tabText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  selectedText: { color: c.primary },
  list: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: c.line },
  listHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 },
  heading: { color: c.ink, fontSize: 16, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: c.line, borderRadius: 8, backgroundColor: c.canvas, flexGrow: 1, flexBasis: 140, maxWidth: 200 },
  input: { flex: 1, minWidth: 0, minHeight: 36, color: c.ink, fontSize: 12 },
  person: { padding: 12, borderWidth: 1, borderColor: '#E6EDF8', borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  identity: { flex: 1, minWidth: 152, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personInfo: { flex: 1, minWidth: 0, gap: 5 },
  name: { color: c.ink, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  mutual: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mutualText: { color: c.textSecondary, fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', padding: 24, gap: 14 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 },
});
