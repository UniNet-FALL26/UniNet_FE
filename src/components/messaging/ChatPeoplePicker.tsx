import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { friendshipService } from '@/services/friendship.service';
import { messagingService } from '@/services/messaging.service';
import type { ChatPerson } from '@/types/messaging';
import { HubAction, HubIcon } from '@/components/projects/hub/ProjectHubUI';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';

export function ChatPeoplePicker({ friendsOnly, selected, exclude = [], onSelect }: { friendsOnly: boolean; selected: ChatPerson[]; exclude?: string[]; onSelect: (person: ChatPerson) => void }) {
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [people, setPeople] = useState<ChatPerson[]>([]), [loading, setLoading] = useState(false), [more, setMore] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); const timer = setTimeout(() => {
      setLoading(true); setError('');
      const request = friendsOnly ? friendshipService.list('friends', query, page, controller.signal).then(result => ({ items: result.items as ChatPerson[], more: result.total > page * result.pageSize }))
        : messagingService.people(query, controller.signal).then(items => ({ items, more: false }));
      request.then(result => { if (!controller.signal.aborted) { setPeople(old => page === 1 ? result.items : [...old, ...result.items.filter(person => !old.some(item => item.accountId === person.accountId))]); setMore(result.more); } })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tìm được người dùng.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, friendsOnly, attempt]);
  return <View style={{ gap: 10 }}>
    <View style={s.search}><HubIcon name="search" size={16} /><TextInput accessibilityLabel={friendsOnly ? 'Tìm bạn bè để thêm vào nhóm' : 'Tìm người để nhắn tin'} value={query} onChangeText={value => { setPage(1); setQuery(value); }} placeholder={friendsOnly ? 'Tìm trong danh sách bạn bè…' : 'Nhập tên hoặc nickname…'} style={s.input} maxLength={100} /></View>
    {!!selected.length && <View style={s.selected}>{selected.map(person => <Pressable key={person.accountId} onPress={() => onSelect(person)} accessibilityRole="button" accessibilityLabel={`Bỏ chọn ${person.fullName}`} style={s.chip}><Text style={s.chipText}>{person.fullName}</Text><HubIcon name="close" size={12} /></Pressable>)}</View>}
    {loading && <ActivityIndicator color="#1769E0" size="small" />}
    {!!error && <><Text role="alert" style={s.error}>{error}</Text><HubAction compact title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></>}
    {people.filter(person => !exclude.includes(person.accountId)).map(person => {
      const checked = selected.some(item => item.accountId === person.accountId);
      return <Pressable key={person.accountId} accessibilityRole={friendsOnly ? 'checkbox' : 'button'} accessibilityLabel={person.fullName} aria-checked={friendsOnly ? checked : undefined} onPress={() => onSelect(person)} style={[s.person, checked && s.checked]}>
        <PersonAvatar person={person} size={34} /><Text style={s.name}>{person.fullName}</Text><HubIcon name={checked ? 'check' : friendsOnly ? 'plus' : 'message'} size={17} />
      </Pressable>;
    })}
    {!loading && !error && !people.length && <Text style={s.hint}>{friendsOnly ? 'Chưa có bạn bè phù hợp để thêm.' : query.trim() ? 'Không tìm thấy người phù hợp.' : 'Tìm người bạn muốn bắt đầu trò chuyện.'}</Text>}
    {more && !loading && <HubAction compact title="Tải thêm bạn bè" onPress={() => setPage(value => value + 1)} />}
  </View>;
}
const s = StyleSheet.create({ search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F7FC', borderRadius: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E4EAF5' }, input: { flex: 1, minWidth: 0, minHeight: 38, paddingVertical: 8, fontSize: 12, color: '#243B5C' }, person: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E7EDF7', backgroundColor: '#FFFFFF' }, checked: { borderColor: '#9CBAF4', backgroundColor: '#F0F5FF' }, name: { flex: 1, fontSize: 12, fontWeight: '600', color: '#263C5C' }, selected: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 12, backgroundColor: '#EAF1FF', paddingHorizontal: 8, paddingVertical: 5 }, chipText: { fontSize: 10, color: '#1769E0' }, hint: { fontSize: 12, lineHeight: 19, color: '#8190A5', padding: 10, textAlign: 'center' }, error: { color: '#B8324D', fontSize: 12 } });
