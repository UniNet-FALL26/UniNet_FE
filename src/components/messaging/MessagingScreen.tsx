import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { chatPreviewPreference } from '@/messaging/device';
import { messagingService } from '@/services/messaging.service';
import type { ChatConversation, ChatFileInput, ChatMessage, ChatPerson, DirectChat } from '@/types/messaging';
import { useChat } from './ChatProvider';
import { HubAction, HubIcon, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { PersonAvatar } from '@/components/projects/hub/PersonAvatar';
import { ChatComposer } from './ChatComposer';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatMessageActions } from './ChatMessageActions';
import { NewChatModal } from './NewChatModal';
import { ChatDetailsModal } from './ChatDetailsModal';

const filters = [{ id: 'all', label: 'Tất cả' }, { id: 'friends', label: 'Bạn bè' }, { id: 'strangers', label: 'Người lạ' }, { id: 'groups', label: 'Nhóm' }];
function mergeMessages(current: ChatMessage[], next: ChatMessage[]) { const byId = new Map(current.map(message => [message.id, message])); next.forEach(message => byId.set(message.id, message)); return [...byId.values()].sort((a, b) => a.number - b.number); }
const problem = (cause: unknown) => cause instanceof Error ? cause.message : 'Chưa tải được cuộc trò chuyện. Vui lòng thử lại.';

export function MessagingScreen() {
  // Nested safe-area providers can report zero even when the shell offsets this screen.
  const keyboardFrame = useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const { account } = useAuthStore(); const chat = useChat(); const { width } = useWindowDimensions(); const compact = width < 800;
  const params = useLocalSearchParams<{ conversationId?: string; profileId?: string; messageId?: string }>();
  const conversationId = typeof params.conversationId === 'string' ? params.conversationId : null, profileId = typeof params.profileId === 'string' ? params.profileId : null;
  const target = conversationId || profileId || '';
  const targetRef = useRef(target); targetRef.current = target;
  const [filter, setFilter] = useState('all'), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [conversations, setConversations] = useState<ChatConversation[]>([]), [hasMore, setHasMore] = useState(false), [listLoading, setListLoading] = useState(true), [listError, setListError] = useState(''), [listAttempt, setListAttempt] = useState(0);
  const [conversation, setConversation] = useState<ChatConversation | null>(null), [direct, setDirect] = useState<DirectChat | null>(null), [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false), [threadError, setThreadError] = useState(''), [threadAttempt, setThreadAttempt] = useState(0), [older, setOlder] = useState(false), [loadingOlder, setLoadingOlder] = useState(false);
  const [busy, setBusy] = useState(false), [reply, setReply] = useState<ChatMessage | null>(null), [editing, setEditing] = useState<ChatMessage | null>(null), [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [newChat, setNewChat] = useState(false), [details, setDetails] = useState(false), [pushSettings, setPushSettings] = useState(false), [typingAccounts, setTypingAccounts] = useState<string[]>([]), [atBottom, setAtBottom] = useState(true);
  const scroll = useRef<ScrollView>(null), stickBottom = useRef(true), contentHeight = useRef(0), scrollY = useRef(0), preserve = useRef<{ height: number; y: number } | null>(null), lastRead = useRef(''), mutationLock = useRef(false);
  const messagePositions = useRef(new Map<string, number>()), typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const selectConversation = useCallback((id: string) => { setNewChat(false); setDetails(false); router.setParams({ conversationId: id, profileId: undefined, messageId: undefined }); }, []);
  const selectPerson = (person: ChatPerson) => { setNewChat(false); router.setParams({ profileId: person.profileId, conversationId: undefined, messageId: undefined }); };
  const back = useCallback(() => { setDetails(false); router.setParams({ conversationId: undefined, profileId: undefined, messageId: undefined }); chat.setViewing(null); }, [chat.setViewing]);
  useEffect(() => { const timer = setTimeout(() => { setPage(1); setSearch(query.trim()); }, 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { setPage(1); setListAttempt(value => value + 1); }, [chat.revision]);
  useEffect(() => {
    const controller = new AbortController(); setListLoading(true); setListError('');
    messagingService.list(filter, search, page, controller.signal).then(result => { if (!controller.signal.aborted) { setConversations(old => page === 1 ? result.items : [...old, ...result.items.filter(item => !old.some(current => current.id === item.id))]); setHasMore(result.hasMore); } })
      .catch(cause => { if (!controller.signal.aborted) setListError(problem(cause)); }).finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [filter, search, page, listAttempt, account?.id]);
  useEffect(() => {
    setConversation(null); setDirect(null); setMessages([]); setReply(null); setEditing(null); setMenuMessage(null); setDetails(false); setThreadError(''); setTypingAccounts([]);
    lastRead.current = ''; stickBottom.current = true; setAtBottom(true); messagePositions.current.clear();
    if (!target) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    const load = async () => {
      if (conversationId) {
        const [current, history] = await Promise.all([messagingService.get(conversationId, controller.signal), messagingService.history(conversationId, null, controller.signal)]);
        let combined = history.items, chunk = history;
        while (params.messageId && !combined.some(message => message.id === params.messageId) && chunk.hasMore && chunk.nextCursor && !controller.signal.aborted) {
          chunk = await messagingService.history(conversationId, chunk.nextCursor, controller.signal); combined = mergeMessages(chunk.items, combined);
        }
        if (!controller.signal.aborted) { setConversation(current); setMessages(combined); setOlder(chunk.hasMore); }
      } else if (profileId) {
        const preview = await messagingService.direct(profileId, controller.signal);
        if (!preview.peer) throw new Error('Không tìm thấy người nhận.');
        if (controller.signal.aborted) return;
        if (preview.conversationId) { selectConversation(preview.conversationId); return; }
        setDirect(preview); setOlder(false);
      }
    };
    void load().catch(cause => { if (!controller.signal.aborted) setThreadError(problem(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [conversationId, profileId, params.messageId, threadAttempt, account?.id, selectConversation]);
  const loadedStart = useRef<number | null>(null); loadedStart.current = messages[0]?.number ?? null;
  const reloadThread = useCallback(async () => {
    if (!conversationId) return;
    const expected = conversationId;
    const firstLoaded = loadedStart.current;
    const [current, latest] = await Promise.all([messagingService.get(expected), messagingService.history(expected)]);
    let combined = latest.items, chunk = latest;
    while (firstLoaded !== null && combined.length && combined[0].number > firstLoaded && chunk.hasMore && chunk.nextCursor && targetRef.current === expected) {
      chunk = await messagingService.history(expected, chunk.nextCursor); combined = mergeMessages(chunk.items, combined);
    }
    if (targetRef.current === expected) { setConversation(current); setMessages(old => mergeMessages(old, combined)); setThreadError(''); }
  }, [conversationId]);
  useEffect(() => { if (conversationId && chat.syncVersion > 0) void reloadThread().catch(cause => { if (targetRef.current === conversationId) setThreadError(problem(cause)); }); }, [chat.syncVersion, conversationId, reloadThread]);
  useFocusEffect(useCallback(() => { chat.setViewing(conversationId); return () => { if (conversationId) chat.typing(conversationId, false); chat.setViewing(null); }; }, [conversationId, chat.setViewing, chat.typing]));
  useEffect(() => chat.subscribe(event => {
    if (event.conversationId !== conversationId) return;
    if (event.kind === 'removed') { back(); return; }
    if (event.message) {
      setMessages(old => mergeMessages(old.map(message => event.kind === 'recalled' && message.replyTo?.id === event.messageId ? { ...message, replyTo: { ...message.replyTo, content: null, recalled: true } } : message), [event.message!]));
      setMenuMessage(old => old?.id === event.messageId && event.message?.recalledAt ? null : old);
    }
    if (conversationId) void messagingService.get(conversationId).then(current => { if (targetRef.current === conversationId) setConversation(current); }).catch(cause => { if (targetRef.current === conversationId) setThreadError(problem(cause)); });
  }), [conversationId, chat.subscribe, back]);
  useEffect(() => chat.subscribeTyping(event => {
    if (event.conversationId !== conversationId || event.accountId === account?.id) return;
    const old = typingTimers.current.get(event.accountId); if (old) clearTimeout(old);
    setTypingAccounts(current => event.isTyping ? [...new Set([...current, event.accountId])] : current.filter(id => id !== event.accountId));
    if (event.isTyping) typingTimers.current.set(event.accountId, setTimeout(() => setTypingAccounts(current => current.filter(id => id !== event.accountId)), 3000));
  }), [conversationId, chat.subscribeTyping, account?.id]);
  useEffect(() => () => { typingTimers.current.forEach(timer => clearTimeout(timer)); }, []);
  const latestMessage = messages.at(-1);
  useEffect(() => {
    if (!conversationId || !latestMessage || !chat.foreground || !atBottom || !chat.deviceId || lastRead.current === latestMessage.id) return;
    lastRead.current = latestMessage.id;
    void messagingService.read(conversationId, latestMessage.id, chat.deviceId).then(chat.refresh).catch(() => { if (lastRead.current === latestMessage.id) lastRead.current = ''; });
  }, [conversationId, latestMessage?.id, chat.foreground, atBottom, chat.deviceId, chat.refresh]);
  async function send(content: string, files: ChatFileInput[], clientMessageId: string) {
    if (mutationLock.current) return; mutationLock.current = true; setBusy(true); const expected = target;
    try {
      const to = conversationId ? { conversationId } : direct ? { profileId: direct.peer.profileId } : null; if (!to) throw new Error('Chọn người nhận trước khi gửi.');
      const result = await messagingService.send(to, { clientMessageId, content, files, replyToMessageId: reply?.id, deviceId: chat.deviceId }); chat.refresh();
      if (targetRef.current !== expected) return; stickBottom.current = true; setAtBottom(true); setReply(null); setMessages(old => mergeMessages(old, [result]));
      if (!conversationId) selectConversation(result.conversationId); else await reloadThread();
    } finally { mutationLock.current = false; setBusy(false); }
  }
  async function edit(content: string) { if (!editing || mutationLock.current) return; mutationLock.current = true; setBusy(true); try { const message = await messagingService.edit(editing.id, content); setMessages(old => mergeMessages(old, [message])); setEditing(null); chat.refresh(); } finally { mutationLock.current = false; setBusy(false); } }
  async function react(message: ChatMessage, reaction: string) { await messagingService.react(message.id, reaction); await reloadThread(); }
  async function olderMessages() {
    if (!conversationId || loadingOlder || !messages.length) return; setLoadingOlder(true); setThreadError(''); const expected = conversationId;
    preserve.current = { height: contentHeight.current, y: scrollY.current };
    try { const result = await messagingService.history(conversationId, messages[0].number); if (targetRef.current === expected) { setMessages(old => mergeMessages(result.items, old)); setOlder(result.hasMore); } } catch (cause) { setThreadError(problem(cause)); } finally { setLoadingOlder(false); }
  }
  const activeName = conversation?.name || direct?.peer.fullName || '', activeAvatar = conversation?.avatarUrl || direct?.peer.avatarUrl || null;
  const numbers = new Map(messages.map(message => [message.id, message.number]));
  const lastOwnId = messages.filter(message => message.sender.accountId === account?.id).at(-1)?.id;
  const peerCount = conversation?.members.filter(member => !member.leftAt).length || 0;
  return <View ref={keyboardFrame} collapsable={false} style={{ flex: 1, minHeight: 0 }} onLayout={() => { if (Platform.OS === 'android') keyboardFrame.current?.measureInWindow((_x, y) => setKeyboardOffset(y)); }}><KeyboardAvoidingView testID="messaging-screen" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : keyboardOffset} style={s.screen}>
    <View style={[s.layout, compact && s.mobileLayout]}>
      {(!compact || !target) && <View style={[s.sidebar, compact && s.mobileSidebar]}>
        <View style={s.sidebarHead}><View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" aria-level={1} style={s.title}>Tin nhắn</Text><Text style={s.subtle}>Kết nối và cùng nhau làm việc</Text></View><IconButton label="Cài đặt thông báo tin nhắn" icon="clock" onPress={() => setPushSettings(true)} /><IconButton label="Tạo cuộc trò chuyện" icon="edit" onPress={() => setNewChat(true)} /></View>
        <View style={s.search}><HubIcon name="search" size={17} color="#8190A6" /><TextInput accessibilityLabel="Tìm cuộc trò chuyện" placeholder="Tìm cuộc trò chuyện…" placeholderTextColor="#8F9CB0" value={query} onChangeText={setQuery} maxLength={100} style={s.searchInput} /></View>
        <View role="tablist" aria-label="Loại cuộc trò chuyện" style={s.filters}>{filters.map(item => <Pressable key={item.id} role="tab" aria-label={item.label} aria-selected={filter === item.id} onPress={() => { setFilter(item.id); setPage(1); }} style={[s.filter, filter === item.id && s.activeFilter]}><Text style={[s.filterText, filter === item.id && s.activeFilterText]}>{item.label}</Text></Pressable>)}</View>
        <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
          {listLoading && !conversations.length && <ActivityIndicator color="#1769E0" style={{ marginTop: 30 }} />}
          {!!listError && <View style={s.state}><Text role="alert" style={s.error}>{listError}</Text><HubAction compact title="Thử tải cuộc trò chuyện" onPress={() => setListAttempt(value => value + 1)} /></View>}
          {!listLoading && !listError && !conversations.length && <View style={s.state}><HubIcon name="message" size={35} color="#B4C6E5" /><Text style={s.emptyTitle}>Bắt đầu một cuộc trò chuyện</Text><Text style={s.emptyText}>Nhắn tin cho bạn bè hoặc tìm người bạn muốn kết nối.</Text><HubAction compact title="Nhắn tin mới" onPress={() => setNewChat(true)} /></View>}
          {conversations.map(item => <Pressable key={item.id} testID={`conversation-${item.id}`} accessibilityRole="button" accessibilityLabel={`Mở trò chuyện ${item.name}`} onPress={() => selectConversation(item.id)} style={({ hovered, pressed }) => [s.conversation, conversationId === item.id && s.selected, (hovered || pressed) && { backgroundColor: '#F0F5FD' }]}>
            <PersonAvatar person={{ fullName: item.name, avatarUrl: item.avatarUrl }} size={43} /><View style={s.conversationCopy}><View style={s.conversationTop}><Text numberOfLines={1} style={[s.conversationName, item.unreadCount > 0 && { color: '#132B4D', fontWeight: '700' }]}>{item.name}</Text><Text style={s.time}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}</Text></View><View style={s.conversationTop}><Text numberOfLines={1} style={[s.preview, item.unreadCount > 0 && { color: '#384E70' }]}>{item.lastMessage?.recalledAt ? 'Tin nhắn đã thu hồi' : item.lastMessage ? `${item.lastMessage.sender.accountId === account?.id ? 'Bạn: ' : item.type === 1 ? item.lastMessage.sender.fullName + ': ' : ''}${item.lastMessage.content || 'Đã gửi file đính kèm'}` : 'Hãy gửi lời chào đầu tiên'}</Text>{item.unreadCount > 0 ? <View style={s.unread}><Text style={s.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View> : item.isPinned ? <HubIcon name="flag" size={13} color="#8B9BB3" /> : null}</View></View>
          </Pressable>)}
          {hasMore && <HubAction compact title="Tải thêm cuộc trò chuyện" busy={listLoading} onPress={() => setPage(value => value + 1)} />}
        </ScrollView>
      </View>}
      {(!compact || !!target) && <View style={s.thread}>
        {!target ? <View style={s.welcome}><View style={s.welcomeIcon}><HubIcon name="message" size={38} /></View><Text style={s.welcomeTitle}>Mọi kết nối bắt đầu từ một lời chào</Text><Text style={s.emptyText}>Chọn cuộc trò chuyện hoặc bắt đầu nhắn tin với một người mới.</Text><HubAction compact title="Bắt đầu nhắn tin" variant="primary" onPress={() => setNewChat(true)} /></View> : loading ? <View style={s.welcome}>{compact && <HubAction compact title="Quay lại tin nhắn" icon="back" onPress={back} />}<ActivityIndicator color="#1769E0" /></View> : !conversation && !direct ? <View style={s.welcome}><Text role="alert" style={s.error}>{threadError || 'Cuộc trò chuyện hiện không khả dụng.'}</Text><HubAction compact title="Thử lại" onPress={() => setThreadAttempt(value => value + 1)} />{compact && <HubAction compact title="Quay lại tin nhắn" onPress={back} />}</View> : <>
          <View style={s.threadHead}>{compact && <IconButton label="Quay lại danh sách tin nhắn" icon="back" onPress={back} />}<PersonAvatar person={{ fullName: activeName, avatarUrl: activeAvatar }} size={37} /><View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text numberOfLines={1} style={s.threadName}>{activeName}</Text><Text style={s.threadSubtitle}>{!chat.connected ? 'Đang kết nối realtime…' : conversation?.type === 1 ? `${peerCount} thành viên` : conversation?.relationship === 'friends' ? 'Bạn bè' : 'Tin nhắn từ người lạ'}</Text></View>{conversation && <IconButton label="Thông tin cuộc trò chuyện" icon="info" onPress={() => setDetails(true)} />}</View>
          {conversation?.project && <View style={s.project}><View style={s.projectLogo}><HubIcon name="folder" size={18} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.projectLabel}>Dự án liên kết</Text><Text numberOfLines={1} style={s.projectName}>{conversation.project.title}</Text></View><HubAction compact title="Xem dự án" icon="external" onPress={() => router.push({ pathname: '/group/[id]', params: { id: conversation.project!.id } })} style={{ minHeight: 29, paddingVertical: 3 }} /></View>}
          {!!threadError && <Text role="alert" style={[s.error, { padding: 10 }]}>{threadError}</Text>}
          <ScrollView ref={scroll} testID="chat-message-history" style={s.history} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
            onScroll={event => { const state = event.nativeEvent; scrollY.current = state.contentOffset.y; const bottom = state.contentSize.height - state.layoutMeasurement.height - state.contentOffset.y < 100; stickBottom.current = bottom; setAtBottom(bottom); }}
            onContentSizeChange={(_, height) => { const restore = preserve.current; if (restore) { preserve.current = null; scroll.current?.scrollTo({ y: restore.y + height - restore.height, animated: false }); } else if (stickBottom.current) scroll.current?.scrollToEnd({ animated: false }); contentHeight.current = height; }}>
            {older && <HubAction compact title="Tải tin nhắn trước" busy={loadingOlder} onPress={() => { void olderMessages(); }} style={{ alignSelf: 'center', marginVertical: 10 }} />}
            {!messages.length && <View style={s.firstMessage}><PersonAvatar person={{ fullName: activeName, avatarUrl: activeAvatar }} size={64} /><Text style={s.emptyTitle}>{activeName}</Text><Text style={s.emptyText}>{direct ? 'Gửi lời chào để bắt đầu. Cuộc trò chuyện sẽ được tạo khi bạn gửi tin nhắn đầu tiên.' : 'Chưa có tin nhắn. Cùng bắt đầu cuộc trò chuyện nhé.'}</Text></View>}
            {messages.map((message, index) => {
              const own = message.sender.accountId === account?.id, previous = messages[index - 1], next = messages[index + 1];
              const dayChanged = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              const first = dayChanged || previous?.sender.accountId !== message.sender.accountId || Date.parse(message.createdAt) - Date.parse(previous?.createdAt || '') > 300000;
              const last = !next || next.sender.accountId !== message.sender.accountId || Date.parse(next.createdAt) - Date.parse(message.createdAt) > 300000;
              const readNames = own && message.id === lastOwnId ? conversation?.members.filter(member => member.person.accountId !== account?.id && !member.leftAt && (numbers.get(member.lastReadMessageId || '') || 0) >= message.number).map(member => member.person.fullName) || [] : [];
              return <View key={message.id} onLayout={event => { messagePositions.current.set(message.id, event.nativeEvent.layout.y); if (params.messageId === message.id) { stickBottom.current = false; scroll.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 60), animated: false }); } }}>{dayChanged && <Text style={s.date}>{new Date(message.createdAt).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>}<ChatMessageBubble message={message} own={own} first={first} last={last} readNames={readNames} onActions={() => setMenuMessage(message)} onReact={value => { void react(message, value).catch(cause => setThreadError(problem(cause))); }} /></View>;
            })}
            {typingAccounts.length > 0 && <Text style={s.typing}>{conversation?.type === 1 ? conversation.members.filter(member => typingAccounts.includes(member.person.accountId)).map(member => member.person.fullName).join(', ') : activeName} đang nhập…</Text>}
          </ScrollView>
          {!atBottom && !!messages.length && <Pressable accessibilityRole="button" accessibilityLabel="Đi đến tin nhắn mới nhất" onPress={() => { stickBottom.current = true; setAtBottom(true); scroll.current?.scrollToEnd({ animated: true }); }} style={s.jump}><Text style={s.jumpText}>Tin nhắn mới nhất ↓</Text></Pressable>}
          <ChatComposer key={target} blocked={conversation?.isBlocked || direct?.isBlocked || false} busy={busy} reply={reply} editing={editing} onCancel={() => { setReply(null); setEditing(null); }} onSend={send} onEdit={edit} onTyping={value => { if (conversationId) chat.typing(conversationId, value); }} />
        </>}
      </View>}
    </View>
    {newChat && <NewChatModal onClose={() => setNewChat(false)} onPerson={selectPerson} onGroup={group => { chat.refresh(); selectConversation(group.id); }} />}
    {details && conversation && <ChatDetailsModal conversation={conversation} onClose={() => setDetails(false)} onChanged={async () => { await reloadThread(); chat.refresh(); }} onLeft={() => { back(); chat.refresh(); }} onOpenConversation={selectConversation} />}
    {menuMessage && <ChatMessageActions message={menuMessage} own={menuMessage.sender.accountId === account?.id} onClose={() => setMenuMessage(null)} onReply={() => { setReply(menuMessage); setEditing(null); setMenuMessage(null); }} onEdit={() => { setEditing(menuMessage); setReply(null); setMenuMessage(null); }} onReact={value => react(menuMessage, value)} onRecall={async () => { await messagingService.recall(menuMessage.id); await reloadThread(); chat.refresh(); }} />}
    {pushSettings && <PushSettings onClose={() => setPushSettings(false)} />}
  </KeyboardAvoidingView></View>;
}

function IconButton({ label, icon, onPress }: { label: string; icon: Parameters<typeof HubIcon>[0]['name']; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.6 }]}><HubIcon name={icon} size={20} /></Pressable>; }
function PushSettings({ onClose }: { onClose: () => void }) {
  const chat = useChat(); const [preview, setPreview] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { account } = useAuthStore();
  useEffect(() => { let disposed = false; if (account) void chatPreviewPreference(account.id).then(value => { if (!disposed) setPreview(value); }); return () => { disposed = true; }; }, [account?.id]);
  return <HubModal compact wide={false} maxWidth={440} title="Thông báo tin nhắn" icon="message" onClose={onClose} footer={<><HubAction compact title="Đóng" disabled={busy} onPress={onClose} /><HubAction compact title={chat.pushEnabled ? 'Lưu cài đặt' : 'Bật thông báo'} variant="primary" busy={busy} onPress={() => { setBusy(true); setError(''); void chat.enablePush(preview).then(onClose).catch(cause => setError(problem(cause))).finally(() => setBusy(false)); }} /></>}>
    <View style={{ gap: 16 }}><Text style={s.emptyText}>Nhận tin nhắn mới ngay cả khi bạn chuyển trang hoặc đóng ứng dụng.</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ flex: 1 }}><Text style={s.emptyTitle}>Hiện nội dung xem trước</Text><Text style={s.subtle}>Hiển thị nội dung tin nhắn trong thông báo.</Text></View><Switch accessibilityLabel="Hiện nội dung tin nhắn trong thông báo" value={preview} onValueChange={setPreview} disabled={busy} /></View>{chat.pushEnabled && <HubAction compact title="Tắt thông báo trên thiết bị này" disabled={busy} onPress={() => { setBusy(true); setError(''); void chat.disablePush().then(onClose).catch(cause => setError(problem(cause))).finally(() => setBusy(false)); }} />}{!!error && <Text role="alert" style={s.error}>{error}</Text>}</View>
  </HubModal>;
}
const s = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: '#F6F9FE', padding: 14 }, layout: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1440, alignSelf: 'center', flexDirection: 'row', borderRadius: 16, borderWidth: 1, borderColor: '#DFE7F3', overflow: 'hidden', backgroundColor: '#FFFFFF' }, mobileLayout: { borderRadius: 12 },
  sidebar: { width: 325, borderRightWidth: 1, borderColor: '#E6ECF5', backgroundColor: '#FFFFFF' }, mobileSidebar: { width: '100%', flex: 1, borderRightWidth: 0 }, sidebarHead: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 17, paddingBottom: 14 }, title: { fontSize: 23, fontWeight: '700', color: '#192E4D', letterSpacing: -0.5 }, subtle: { color: '#8998AE', fontSize: 10, lineHeight: 16 }, iconButton: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F5FE' },
  search: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, backgroundColor: '#F3F6FA', borderRadius: 10 }, searchInput: { flex: 1, minWidth: 0, minHeight: 38, paddingVertical: 9, fontSize: 12, color: '#334A6A' }, filters: { flexDirection: 'row', paddingHorizontal: 14, gap: 3, marginTop: 12, marginBottom: 10 }, filter: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8 }, activeFilter: { backgroundColor: '#EAF2FF' }, filterText: { fontSize: 11, color: '#7D8DA4', fontWeight: '500' }, activeFilterText: { color: '#1769E0', fontWeight: '600' }, list: { paddingHorizontal: 8, paddingBottom: 16, gap: 3 },
  conversation: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderRadius: 11 }, selected: { backgroundColor: '#EAF2FF' }, conversationCopy: { flex: 1, minWidth: 0, gap: 6 }, conversationTop: { flexDirection: 'row', alignItems: 'center', gap: 7 }, conversationName: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18, fontWeight: '600', color: '#344A69' }, preview: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 17, color: '#8B99AD' }, time: { color: '#95A1B3', fontSize: 9 }, unread: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#1769E0', justifyContent: 'center', alignItems: 'center' }, unreadText: { color: '#FFFFFF', fontSize: 9, fontWeight: '600' },
  thread: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: '#FFFFFF' }, threadHead: { minHeight: 68, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderColor: '#E9EEF6' }, threadName: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#213958' }, threadSubtitle: { fontSize: 10, color: '#8B9AB0', lineHeight: 15 }, history: { flex: 1, minHeight: 0, backgroundColor: '#FCFDFF' }, messages: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 }, date: { color: '#97A4B6', fontSize: 10, textAlign: 'center', marginVertical: 16 }, typing: { fontSize: 10, lineHeight: 17, color: '#8E9DB2', paddingTop: 12, paddingLeft: 35 },
  welcome: { flex: 1, minHeight: 200, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 17 }, welcomeIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: '#EDF4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }, welcomeTitle: { maxWidth: 340, color: '#243C5D', fontSize: 21, lineHeight: 29, fontWeight: '600', textAlign: 'center' }, emptyText: { maxWidth: 340, fontSize: 12, lineHeight: 20, color: '#8392A8', textAlign: 'center' }, state: { padding: 20, paddingVertical: 32, alignItems: 'center', gap: 12 }, emptyTitle: { color: '#415779', fontSize: 13, fontWeight: '600', lineHeight: 20 }, firstMessage: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 200, gap: 14, padding: 24 }, error: { color: '#B8324D', fontSize: 12, lineHeight: 19, textAlign: 'center' }, jump: { position: 'absolute', bottom: 80, right: 18, borderWidth: 1, borderColor: '#D9E5F8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, boxShadow: '0 3px 12px rgba(20, 45, 85, 0.1)' }, jumpText: { color: '#1769E0', fontSize: 11 }, project: { paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F1F6FF', borderBottomWidth: 1, borderColor: '#E4EDF9' }, projectLogo: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4EEFF' }, projectLabel: { fontSize: 9, color: '#8A9AB2', marginBottom: 2 }, projectName: { fontSize: 12, fontWeight: '600', color: '#36547C' },
});
