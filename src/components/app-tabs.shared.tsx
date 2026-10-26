import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Animated, BackHandler, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type TabItem = { label: string; href: Href; paths: string[]; icon: SymbolName; activeIcon: SymbolName; unread?: number };
type Shortcut = { label: string; href: Href; icon: SymbolName; tint: string; background: string };

const tabs: TabItem[] = [
  { label: 'Cộng đồng', href: '/(tabs)', paths: ['/', '/community'], icon: { ios: 'person.2', android: 'groups', web: 'groups' }, activeIcon: { ios: 'person.2.fill', android: 'groups', web: 'groups' } },
  { label: 'Nhắn tin', href: '/(tabs)/messages', paths: ['/messages'], icon: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }, activeIcon: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' } },
  { label: 'Thông báo', href: '/(tabs)/notifications', paths: ['/notifications'], icon: { ios: 'bell', android: 'notifications_none', web: 'notifications_none' }, activeIcon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' } },
  { label: 'Cá nhân', href: '/(tabs)/profile', paths: ['/profile'], icon: { ios: 'person', android: 'person_outline', web: 'person_outline' }, activeIcon: { ios: 'person.fill', android: 'person', web: 'person' } },
];

const shortcuts: Shortcut[] = [
  { label: 'Không gian\nlàm việc', href: '/(tabs)/workspace', icon: { ios: 'briefcase.fill', android: 'work', web: 'work' }, tint: '#1476DA', background: '#E8F3FF' },
  { label: 'Cơ hội', href: '/(tabs)/opportunities', icon: { ios: 'briefcase', android: 'business_center', web: 'business_center' }, tint: '#E34B66', background: '#FFF0F3' },
  { label: 'Dự án', href: '/(tabs)/projects', icon: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' }, tint: '#8054D9', background: '#F2EBFF' },
];

export function badgeLabel(count: number | undefined) {
  if (!count || count < 1) return null;
  return count > 99 ? '99+' : String(count);
}

function FooterTab({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  const badge = badgeLabel(item.unread);
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
    <View style={styles.tabIcon}>
      <SymbolView name={active ? item.activeIcon : item.icon} size={23} tintColor={active ? colors.primary : colors.textSecondary} />
      {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
    </View>
    <Text numberOfLines={1} style={[styles.tabLabel, active && styles.activeLabel]}>{item.label}</Text>
    <View style={[styles.indicator, active && styles.activeIndicator]} />
  </Pressable>;
}

export default function AppTabs() {
  const { account } = useAuthStore();
  const { unreadCount } = useNotificationUpdates();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const [avatar, setAvatar] = useState<{ accountId: string; url: string | null } | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const avatarUrl = avatar?.accountId === account?.id && avatar?.url !== failedAvatar ? avatar?.url : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const bottomInset = Math.max(insets.bottom, 8);
  const columns = width < 350 ? 2 : 4;

  useEffect(() => {
    if (!desktop || !account?.id) return;
    const accountId = account.id;
    const controller = new AbortController();
    portfolioService.getMine(controller.signal).then(data => {
      if (!controller.signal.aborted && data.isOwner) {
        setAvatar({ accountId, url: data.profile.avatarUrl || null });
        setFailedAvatar(null);
      }
    }).catch(() => {});
    return () => controller.abort();
  }, [account?.id, desktop, pathname]);

  useEffect(() => { setMenuOpen(false); }, [pathname, desktop]);
  useEffect(() => {
    if (!menuOpen) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const back = BackHandler.addEventListener('hardwareBackPress', () => { setMenuOpen(false); return true; });
    return () => back.remove();
  }, [menuOpen, progress]);

  const desktopShortcuts: TabItem[] = shortcuts.map(item => ({ ...item, label: item.label.replace('\n', ' '), paths: [String(item.href).replace('/(tabs)', '')], activeIcon: item.icon }));
  const desktopItems: TabItem[] = [
    tabs[0],
    desktopShortcuts[0],
    { label: 'Dự án', href: '/(tabs)/projects', paths: ['/projects'], icon: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }, activeIcon: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' } },
    desktopShortcuts[1],
    tabs[1],
  ];
  return <View style={styles.root}>
    {desktop && <View testID="desktop-app-header" style={[styles.desktopHeader, { paddingTop: insets.top }]}>
      <View style={[styles.headerInner, width < 1200 && styles.compactHeader]}>
        <Pressable accessibilityRole="link" accessibilityLabel="UniNet - Trang chủ" onPress={() => router.navigate('/(tabs)')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
          <Image source={require('@/assets/images/uninet-mark.png')} resizeMode="contain" style={styles.brandMark} />
          <Text style={styles.brandName}>UniNet</Text>
        </Pressable>
        <View accessibilityRole="tablist" accessibilityLabel="Điều hướng chính" style={styles.desktopNav}>
          {desktopItems.map(item => {
            const active = item.paths.some(path => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)));
            return <Pressable key={String(item.href)} accessibilityRole="tab" accessibilityLabel={item.label} aria-selected={active} accessibilityState={{ selected: active }} onPress={() => router.navigate(item.href)} style={({ pressed, hovered }) => [styles.desktopLink, width < 1200 && styles.compactLink, active && styles.desktopLinkActive, hovered && styles.desktopLinkHovered, pressed && styles.pressed]}>
              <SymbolView name={active ? item.activeIcon : item.icon} size={width < 1200 ? 17 : 19} tintColor={active ? colors.primary : colors.textSecondary} />
              <Text numberOfLines={1} style={[styles.desktopLabel, width < 1200 && styles.compactLabel, active && styles.activeLabel]}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
        <View accessibilityRole="tablist" accessibilityLabel="Tài khoản và thông báo" style={styles.headerActions}>
          <NotificationBell />
          {[tabs[3]].map(item => {
            const active = item.paths.some(path => pathname === path || pathname.startsWith(`${path}/`));
            const profile = item === tabs[3];
            return <Pressable key={String(item.href)} accessibilityRole="tab" accessibilityLabel={item.label} aria-selected={active} accessibilityState={{ selected: active }} onPress={() => router.navigate(item.href)} style={({ hovered, pressed }) => [styles.actionButton, profile && styles.profileAction, active && styles.desktopLinkActive, hovered && styles.desktopLinkHovered, pressed && styles.pressed]}>
              {profile && avatarUrl ? <Image testID="header-profile-avatar" accessibilityLabel="Ảnh đại diện của bạn" source={{ uri: avatarUrl }} onError={() => setFailedAvatar(avatarUrl)} style={styles.headerAvatar} /> : <SymbolView name={active ? item.activeIcon : item.icon} size={24} tintColor={active ? colors.primary : colors.textSecondary} />}
              {profile && <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor={colors.textSecondary} />}
            </Pressable>;
          })}
        </View>
      </View>
    </View>}
    <View style={styles.page}><Slot /></View>
    {!desktop && menuOpen && <View style={[styles.menuLayer, { bottom: 70 + bottomInset }]}>
      <Pressable style={styles.scrim} onPress={() => setMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Đóng menu" />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height * 0.68, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Khám phá UniNet</Text>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.shortcutGrid}>
          {shortcuts.map(item => <Pressable key={item.label} onPress={() => { setMenuOpen(false); router.push(item.href); }} accessibilityRole="button" accessibilityLabel={item.label.replace('\n', ' ')} style={({ pressed }) => [styles.shortcut, { width: `${100 / columns}%` }, pressed && styles.pressed]}>
            <View style={[styles.shortcutIcon, { backgroundColor: item.background }]}><SymbolView name={item.icon} size={26} tintColor={item.tint} /></View>
            <Text style={styles.shortcutLabel}>{item.label}</Text>
          </Pressable>)}
        </ScrollView>
      </Animated.View>
    </View>}
    {!desktop && <View testID="mobile-app-footer" style={[styles.footer, { paddingBottom: bottomInset }]} accessibilityRole="tablist">
      <FooterTab item={tabs[0]} active={tabs[0].paths.includes(pathname)} onPress={() => { setMenuOpen(false); router.navigate(tabs[0].href); }} />
      <FooterTab item={tabs[1]} active={tabs[1].paths.includes(pathname)} onPress={() => { setMenuOpen(false); router.navigate(tabs[1].href); }} />
      <Pressable onPress={() => setMenuOpen(open => !open)} hitSlop={{ top: 20, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel={menuOpen ? 'Đóng menu' : 'Mở menu'} accessibilityState={{ expanded: menuOpen }} style={styles.menuSlot}>
        <View style={styles.menuButton}><SymbolView name={menuOpen ? { ios: 'xmark', android: 'close', web: 'close' } : { ios: 'line.3.horizontal', android: 'menu', web: 'menu' }} size={25} tintColor="#FFFFFF" /></View>
      </Pressable>
      <FooterTab item={{ ...tabs[2], unread: unreadCount }} active={tabs[2].paths.includes(pathname)} onPress={() => { setMenuOpen(false); router.navigate(tabs[2].href); }} />
      <FooterTab item={tabs[3]} active={tabs[3].paths.includes(pathname)} onPress={() => { setMenuOpen(false); router.navigate(tabs[3].href); }} />
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  desktopHeader: { marginHorizontal: 16, marginTop: 14, marginBottom: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0EDFD', borderRadius: 18, zIndex: 2, boxShadow: '0 5px 22px rgba(39, 110, 190, 0.07)', experimental_backgroundImage: 'linear-gradient(115deg, #F0F7FF 0%, #FFFFFF 22%, #FFFFFF 80%, #F0F7FF 100%)' },
  headerInner: { width: '100%', maxWidth: 1600, alignSelf: 'center', minHeight: 68, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 0 },
  brandMark: { width: 30, height: 34 }, brandName: { color: colors.navy, fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E7EDF6' },
  actionButton: { minWidth: 50, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  profileAction: { flexDirection: 'row', gap: 9, paddingHorizontal: 10, marginLeft: 4 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EAF3FF', borderWidth: 2, borderColor: '#DEEEFF' },
  compactHeader: { paddingHorizontal: 16, gap: 16 }, compactLink: { paddingHorizontal: 6, gap: 4 }, compactLabel: { fontSize: 11 },
  desktopNav: { flex: 1, paddingLeft: 24, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingVertical: 10 },
  desktopLink: { minHeight: 44, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11 },
  desktopLinkActive: { backgroundColor: '#EAF3FF' }, desktopLinkHovered: { backgroundColor: '#F0F6FD' },
  desktopLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  root: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  footer: { minHeight: 70, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 7, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8EDF5', shadowColor: '#0B3E9C', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8, zIndex: 2 },
  tab: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  activeLabel: { color: colors.primary, fontWeight: '700' },
  indicator: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  activeIndicator: { backgroundColor: colors.primary },
  badge: { position: 'absolute', top: -4, right: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#E24555', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  menuSlot: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'flex-start' },
  menuButton: { width: 60, height: 60, marginTop: -20, borderRadius: 30, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: colors.primary, experimental_backgroundImage: 'linear-gradient(145deg, #42A5FF, #0755DC)', alignItems: 'center', justifyContent: 'center', shadowColor: '#1769E0', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  menuLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 35, 72, 0.18)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingBottom: 16, shadowColor: '#10284B', shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: -5 }, elevation: 12 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#DDE3ED', marginBottom: 15 },
  sheetTitle: { color: colors.navy, fontSize: 18, fontWeight: '800', paddingHorizontal: 22, marginBottom: 12 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 4 },
  shortcut: { minHeight: 93, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 2, paddingVertical: 4, gap: 5 },
  shortcutIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  pressed: { opacity: 0.65 },
});
