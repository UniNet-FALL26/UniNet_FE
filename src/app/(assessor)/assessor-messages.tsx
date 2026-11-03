import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AssessorPageHeading } from '@/components/assessor/AssessorPage';
import { colors } from '@/constants/colors';

export default function AssessorMessagesScreen() {
  const [tab, setTab] = useState<'inbox' | 'invitations'>('inbox');
  const narrow = useWindowDimensions().width < 700;
  return <View style={s.page} testID="assessor-messages-page">
    <View style={[s.content, narrow && s.mobileContent]}>
      <AssessorPageHeading title="Nhắn tin" description="Không gian trao đổi của bạn trên UniNet." />
      <View style={[s.inbox, narrow && s.mobileInbox]}>
        <View style={[s.sidebar, narrow && s.mobileSidebar]}>
          {!narrow && <View style={s.sidebarHeading}><Text role="heading" aria-level={2} style={s.sidebarTitle}>Tin nhắn của bạn</Text><SymbolView name={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }} size={20} tintColor={colors.primary} /></View>}
          <View accessibilityRole="tablist" accessibilityLabel="Loại tin nhắn" style={s.tabs}>{([{ key: 'inbox', label: 'Hộp thư' }, { key: 'invitations', label: 'Lời mời trò chuyện' }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} aria-selected={tab === item.key} onPress={() => setTab(item.key)} style={({ hovered, pressed }) => [s.tab, tab === item.key && s.activeTab, (hovered || pressed) && s.hovered]}><Text style={[s.tabText, tab === item.key && s.activeText]}>{item.label}</Text></Pressable>)}</View>
          {!narrow && <View style={s.sidebarEmpty}><SymbolView name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={26} tintColor={colors.textSecondary} /><Text style={s.sidebarEmptyTitle}>{tab === 'inbox' ? 'Hộp thư đang trống' : 'Chưa có lời mời'}</Text><Text style={s.small}>Các cuộc trò chuyện sẽ được hiển thị tại đây.</Text></View>}
        </View>
        <ScrollView style={s.conversation} contentContainerStyle={s.empty}>
          <View style={s.illustration}><View style={s.chatBubble}><SymbolView name={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }} size={46} tintColor={colors.primary} /></View><View style={s.dot} /></View>
          <Text role="heading" aria-level={2} style={s.emptyTitle}>{tab === 'inbox' ? 'Chưa có cuộc trò chuyện' : 'Chưa có lời mời trò chuyện'}</Text>
          <Text style={s.emptyCopy}>{tab === 'inbox' ? 'Ghé cộng đồng để kết nối với sinh viên và chia sẻ kinh nghiệm chuyên môn của bạn.' : 'Khi có lời mời trò chuyện, bạn sẽ thấy thông tin tại đây.'}</Text>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/(assessor)/assessor-community' as Href)} style={({ hovered, pressed }) => [s.communityLink, (hovered || pressed) && s.hovered]}><Text style={s.communityLinkText}>Đến cộng đồng</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={17} tintColor={colors.primary} /></Pressable>
        </ScrollView>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: colors.background }, content: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1280, alignSelf: 'center', padding: 24, gap: 24 }, mobileContent: { padding: 16, gap: 18 },
  inbox: { flex: 1, minHeight: 0, flexDirection: 'row', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' }, mobileInbox: { flexDirection: 'column', borderRadius: 14 }, sidebar: { width: 320, borderRightWidth: 1, borderColor: colors.border, paddingTop: 22 }, mobileSidebar: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1, paddingTop: 4 }, sidebarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 }, sidebarTitle: { fontSize: 16, color: colors.navy, fontWeight: '700' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 4, paddingBottom: 12 }, tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 9 }, tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary }, activeTab: { backgroundColor: colors.primaryLight }, activeText: { color: colors.primary }, hovered: { backgroundColor: colors.primaryLight },
  sidebarEmpty: { padding: 28, paddingTop: 50, gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }, sidebarEmptyTitle: { fontSize: 14, fontWeight: '600', color: colors.navy }, small: { fontSize: 12, lineHeight: 20, textAlign: 'center', color: colors.textSecondary },
  conversation: { flex: 1, minHeight: 0 }, empty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40, gap: 16 }, illustration: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, chatBubble: { width: 92, height: 92, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }, dot: { position: 'absolute', right: 12, top: 12, width: 18, height: 18, backgroundColor: colors.surface, borderRadius: 9, borderWidth: 4, borderColor: colors.primaryLight },
  emptyTitle: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: colors.navy, textAlign: 'center' }, emptyCopy: { fontSize: 14, lineHeight: 23, color: colors.textSecondary, maxWidth: 340, textAlign: 'center' }, communityLink: { minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 6 }, communityLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
