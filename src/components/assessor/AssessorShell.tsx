import { useDismissDetail } from '@/components/navigation/NavigationDismissContext';
import { DetailNavigationFrame } from '@/components/navigation/DetailNavigation';
import type { ReactNode } from 'react';
import { desktopHeaderStyles } from '@/components/ui/desktop-header.styles';
import { Slot, router, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { assessorTabs, assessorTabActive } from '@/constants/assessor-navigation';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';
import { useAuthStore } from '@/store/auth.store';

export function AssessorShell({ children }: { children?: ReactNode } = {}) {
  const dismissDetail = useDismissDetail();
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets();
  const { account } = useAuthStore(); const pathname = usePathname();
  const { unreadCount, synchronize } = useNotificationUpdates();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const avatarUrl = account?.profile?.avatarUrl;
  const desktop = Platform.OS === 'web' && width >= 1024;
  const renderTab = (tab: typeof assessorTabs[number]) => {
      const active = assessorTabActive(tab.key, pathname); const notifications = tab.key === 'notifications';
      const profile = tab.key === 'profile', action = notifications || profile;
      return <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} aria-selected={active}
        onPress={() => { dismissDetail?.(); if (notifications) synchronize(); router.navigate(tab.href as Href); }}
        style={({ pressed, hovered }) => [desktop ? action ? s.actionButton : s.headerTab : s.tab, desktop && !action && width < 1200 && s.compactLink, desktop && profile && s.profileAction, desktop && active && s.selected, desktop && hovered && s.hovered, pressed && s.pressed]}>
        <View style={s.icon}>{desktop && profile && avatarUrl && avatarUrl !== failedAvatar ? <Image source={{ uri: avatarUrl }} onError={() => setFailedAvatar(avatarUrl)} style={s.headerAvatar} accessibilityLabel="Ảnh đại diện của bạn" /> : <SymbolView name={{ ios: tab.ios, android: tab.android, web: tab.web }} size={desktop ? action ? 24 : width < 1200 ? 17 : 19 : 23} tintColor={active ? colors.primary : colors.textSecondary} />}
          {notifications && unreadCount > 0 && <View testID="assessor-unread-badge" style={s.badge}><Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
        </View>
        {(!desktop || !action) && <Text numberOfLines={1} style={[desktop ? s.headerLabel : s.label, desktop && width < 1200 && s.compactLabel, active && s.active]}>{!desktop && 'shortLabel' in tab ? tab.shortLabel : tab.label}</Text>}
        {desktop && profile && <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor={colors.textSecondary} />}
        {!desktop && <View style={[s.indicator, active && s.activeIndicator]} />}
      </Pressable>;
  };
  const navigation = <View testID={desktop ? 'assessor-header-navigation' : 'assessor-footer-navigation'} accessibilityRole="tablist" accessibilityLabel="Điều hướng thẩm định viên" style={desktop ? s.nav : [s.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {desktop ? <><View testID="assessor-header-main" style={s.mainNav}>{assessorTabs.slice(0, 3).map(renderTab)}</View><View testID="assessor-header-actions" style={s.headerActions}>{assessorTabs.slice(3).map(renderTab)}</View></> : assessorTabs.map(renderTab)}
  </View>;
  return <SafeAreaView edges={['top']} style={s.root}>
    {desktop && <View testID="assessor-header" style={s.header}><View style={[s.headerInner, width < 1200 && s.compactHeader]}>
      <Pressable accessibilityRole="link" accessibilityLabel="UniNet - Trang chủ" onPress={() => { dismissDetail?.(); router.navigate('/(assessor)/assessor-community' as Href); }} style={s.brand}>
        <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={s.logo} /><Text style={s.brandName}>UniNet</Text>
      </Pressable>{navigation}
    </View></View>}
    <View testID="assessor-content" style={s.content}><DetailNavigationFrame>{children ?? <Slot key={account?.id} />}</DetailNavigationFrame></View>
    {!desktop && navigation}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { flex: 1, minHeight: 0 },
  header: desktopHeaderStyles.frame,
  headerInner: { minHeight: 68, maxWidth: 1600, width: '100%', alignSelf: 'center', paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 24 }, compactHeader: { paddingHorizontal: 16, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 0 }, logo: { width: 30, height: 34 }, brandName: { fontSize: 23, fontWeight: '800', color: colors.navy, letterSpacing: -0.8 },
  nav: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' }, mainNav: { flex: 1, paddingLeft: 24, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingVertical: 10 }, headerTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, minHeight: 44, borderRadius: 11 }, compactLink: { paddingHorizontal: 6, gap: 4 }, compactLabel: { fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E7EDF6' }, actionButton: { minWidth: 50, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, profileAction: { flexDirection: 'row', gap: 9, paddingHorizontal: 10, marginLeft: 4 }, headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: '#DEEEFF' },
  headerLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary }, selected: { backgroundColor: colors.primaryLight }, hovered: { backgroundColor: '#F0F6FD' },
  footer: { flexDirection: 'row', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, flexShrink: 0 },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingTop: 4 }, icon: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, lineHeight: 14, fontWeight: '600', color: colors.textSecondary }, active: { color: colors.primary }, indicator: { width: 18, height: 3, borderRadius: 2, marginTop: 2 }, activeIndicator: { backgroundColor: colors.primary },
  badge: { position: 'absolute', top: -5, right: -12, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface }, badgeText: { color: colors.surface, fontSize: 9, fontWeight: '800' }, pressed: { opacity: 0.7 },
});
