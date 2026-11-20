import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { friendshipService } from '@/services/friendship.service';
import { messagingService } from '@/services/messaging.service';
import type { ChatPerson } from '@/types/messaging';
import { HubAction, HubIcon } from '@/components/projects/hub/ProjectHubUI';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';

export function ChatPeoplePicker({ friendsOnly, selected, selectedProfileIds = [], disabled = false, exclude = [], onSelect }: { friendsOnly: boolean; selected: ChatPerson[]; selectedProfileIds?: string[]; disabled?: boolean; exclude?: string[]; onSelect: (person: ChatPerson) => void }) {
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
    <View style={s.search}><HubIcon name="search" size={16} /><TextInput accessibilityLabel={friendsOnly ? 'Tìm bạn bè để thêm vào nhóm' : 'Tìm người để nhắn tin'} value={query} editable={!disabled} onChangeText={value => { setPage(1); setQuery(value); }} placeholder={friendsOnly ? 'Tìm trong danh sách bạn bè…' : 'Nhập tên hoặc nickname…'} placeholderTextColor="#53657D" selectionColor="#1769E0" style={s.input} maxLength={100} /></View>
    {!!selected.length && <View style={s.selected}>{selected.map(person => <Pressable key={person.accountId} disabled={disabled} onPress={() => onSelect(person)} accessibilityRole="button" accessibilityLabel={`Bỏ chọn ${person.fullName}`} style={s.chip}><PersonAvatar person={person} size={20} /><Text style={s.chipText}>{person.fullName}</Text><HubIcon name="close" size={12} /></Pressable>)}</View>}
    {loading && <ActivityIndicator color="#1769E0" size="small" />}
    {!!error && <><Text role="alert" style={s.error}>{error}</Text><HubAction compact title="Thử lại" onPress={() => setAttempt(value => value + 1)} /></>}
    {people.filter(person => !exclude.includes(person.accountId)).map(person => {
      const checked = selected.some(item => item.accountId === person.accountId) || selectedProfileIds.includes(person.profileId);
      return <Pressable key={person.accountId} accessibilityRole={friendsOnly ? 'checkbox' : 'button'} accessibilityLabel={person.fullName} aria-checked={friendsOnly ? checked : undefined} disabled={disabled} onPress={() => onSelect(person)} style={[s.person, checked && s.checked]}>
        <PersonAvatar person={person} size={38} /><Text style={s.name}>{person.fullName}</Text><HubIcon name={checked ? 'check' : friendsOnly ? 'plus' : 'message'} size={17} />
      </Pressable>;
    })}
    {!loading && !error && !people.length && <View style={s.empty}><View style={s.emptyIcon}><HubIcon name={friendsOnly ? 'people' : 'search'} size={24} /></View><Text style={s.hint}>{friendsOnly ? 'Chưa có bạn bè phù hợp để thêm.' : query.trim() ? 'Không tìm thấy người phù hợp.' : 'Tìm người bạn muốn bắt đầu trò chuyện.'}</Text></View>}
    {more && !loading && <HubAction compact title="Tải thêm bạn bè" onPress={() => setPage(value => value + 1)} />}
  </View>;
}
const s = StyleSheet.create({ empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 }, emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF5FF' }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F9FC', borderRadius: 12, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E4EAF5' }, input: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 10, fontSize: 13, color: '#14233B' }, person: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDF1F7', backgroundColor: '#FFFFFF' }, checked: { borderColor: '#B2CCFF', backgroundColor: '#F0F6FF' }, name: { flex: 1, fontSize: 13, fontWeight: '600', color: '#263C5C' }, selected: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 12, backgroundColor: '#EAF1FF', paddingHorizontal: 8, paddingVertical: 5, maxWidth: '100%' }, chipText: { fontSize: 11, maxWidth: 150, color: '#1769E0' }, hint: { fontSize: 12, lineHeight: 19, color: '#8190A5', padding: 10, textAlign: 'center' }, error: { color: '#B8324D', fontSize: 12 } });
