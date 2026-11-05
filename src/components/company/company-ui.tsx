import { useDismissDetail } from '@/components/navigation/NavigationDismissContext';
import { colors as appColors } from "@/constants/colors";
import { router, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotificationUpdates } from '@/components/notifications/NotificationsProvider';

export const companyColors = {
  purple: appColors.primary,
  purpleDark: appColors.primaryDark,
  purpleSoft: appColors.primaryLight,
  ink: appColors.textPrimary,
  muted: appColors.textMuted,
  line: appColors.border,
  page: appColors.background,
  white: appColors.surface,
  green: appColors.success,
  greenSoft: "#E8F7F0",
  amber: appColors.warning,
  amberSoft: "#FFF4DF",
  rose: appColors.error,
  blue: appColors.primary,
};

export type CompanyIconName = ComponentProps<typeof SymbolView>["name"];
type IconName = CompanyIconName;

export function CompanyIcon({
  name,
  size = 18,
  color = companyColors.purple,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

export function CompanyPage({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function PageScroll({
  children,
  contentStyle,
  scrollRef,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ScrollView>;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.inlineAction}>
          <Text style={styles.inlineActionText}>{action}</Text>
          <CompanyIcon
            name={{
              ios: "arrow.right",
              android: "arrow_forward",
              web: "arrow_forward",
            }}
            size={13}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Tag({
  children,
  tone = "purple",
  icon,
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "amber" | "gray" | "rose";
  icon?: IconName;
}) {
  const tones = {
    purple: [companyColors.purpleSoft, companyColors.purple],
    green: [companyColors.greenSoft, companyColors.green],
    amber: [companyColors.amberSoft, companyColors.amber],
    gray: [companyColors.page, appColors.textSecondary],
    rose: ["#FCEBED", companyColors.rose],
  } as const;
  return (
    <View style={[styles.tag, { backgroundColor: tones[tone][0] }]}>
      <View style={styles.tagInner}>
        {icon && <CompanyIcon name={icon} size={12} color={tones[tone][1]} />}
        <Text style={[styles.tagText, { color: tones[tone][1] }]}>
          {children}
        </Text>
      </View>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  icon,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "outline" | "soft";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary"
          ? styles.actionPrimary
          : variant === "outline"
            ? styles.actionOutline
            : styles.actionSoft,
        style,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <CompanyIcon
          name={icon}
          size={16}
          color={variant === "primary" ? "#FFFFFF" : companyColors.purple}
        />
      ) : null}
      <Text
        style={[
          styles.actionText,
          variant !== "primary" && styles.actionTextSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const tabs = [
  {
    label: "Cộng đồng",
    route: "/(company)/company-community",
    icon: { ios: "person.2", android: "groups", web: "groups" },
    active: { ios: "person.2.fill", android: "groups", web: "groups" },
  },
  {
    label: "Nhắn tin",
    route: "/(company)/company-messages",
    icon: { ios: "bubble.left", android: "chat_bubble_outline", web: "chat_bubble_outline" },
    active: { ios: "bubble.left.fill", android: "chat_bubble", web: "chat_bubble" },
  },
  {
    label: "Tuyển dụng",
    route: "/(company)/jobs",
    icon: { ios: "briefcase", android: "work_outline", web: "work_outline" },
    active: { ios: "briefcase.fill", android: "work", web: "work" },
  },
  {
    label: "Thông báo",
    route: "/(company)/company-notifications",
    icon: { ios: "bell", android: "notifications_none", web: "notifications_none" },
    active: { ios: "bell.fill", android: "notifications", web: "notifications" },
  },
  {
    label: "Hồ sơ",
    route: "/(company)/profile",
    icon: { ios: "person.crop.circle", android: "account_circle", web: "account_circle" },
    active: { ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" },
  },
] as const;

export function CompanyTabBar({ placement = 'footer' }: { placement?: 'header' | 'footer' }) {
  const dismissDetail = useDismissDetail();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { unreadCount, synchronize } = useNotificationUpdates();
  const inHeader = placement === 'header';
  const compactHeader = inHeader && width < 1200;
  return (
    <View
      testID={inHeader ? 'company-header-navigation' : 'company-footer-navigation'}
      style={inHeader ? styles.headerTabBar : [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="tablist"
    >
      {tabs.filter(tab => !inHeader || (tab.route !== '/(company)/profile' && tab.route !== '/(company)/company-notifications')).map((tab) => {
        const targetPath = tab.route.slice(tab.route.indexOf(")") + 1);
        const isActive = pathname === targetPath || (tab.route.endsWith("/jobs") && pathname === "/create");
        const notification = tab.route === '/(company)/company-notifications';
        const icon = <CompanyIcon name={isActive ? tab.active : tab.icon} size={inHeader ? compactHeader ? 17 : 19 : 23} color={isActive ? companyColors.purple : appColors.textSecondary} />;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            aria-selected={isActive}
            onPress={() => { dismissDetail?.(); if (notification) synchronize(); router.navigate(tab.route as never); }}
            style={({ pressed }) => [inHeader ? styles.headerTab : styles.tab, compactHeader && styles.compactHeaderTab, inHeader && isActive && styles.headerTabActive, pressed && styles.pressed]}
          >
            {inHeader ? icon : <View style={styles.tabIcon}>{icon}{notification && unreadCount > 0 && <View testID="company-footer-unread-badge" style={styles.tabBadge}><Text style={styles.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}</View>}
            <Text numberOfLines={1} style={[styles.tabLabel, inHeader && styles.headerTabLabel, compactHeader && styles.compactHeaderLabel, isActive && styles.tabLabelActive, inHeader && isActive && styles.headerActiveLabel]}>
              {tab.label}
            </Text>
            {!inHeader && <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: companyColors.page },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 26,
    gap: 12,
  },
  titleWrap: { paddingHorizontal: 4, gap: 5, marginBottom: 2 },
  pageTitle: {
    color: companyColors.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
  },
  pageSubtitle: { color: companyColors.muted, fontSize: 12, lineHeight: 18 },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: companyColors.white,
    borderWidth: 1,
    borderColor: companyColors.line,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: { color: companyColors.ink, fontSize: 15, fontWeight: "800" },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 3 },
  inlineActionText: {
    color: companyColors.purple,
    fontSize: 11,
    fontWeight: "700",
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  tagText: { fontSize: 10, lineHeight: 13, fontWeight: "700" },
  actionButton: {
    minHeight: 42,
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionPrimary: { backgroundColor: companyColors.purple },
  actionOutline: {
    backgroundColor: companyColors.white,
    borderWidth: 1,
    borderColor: companyColors.line,
  },
  actionSoft: { backgroundColor: companyColors.purpleSoft },
  actionText: { color: companyColors.white, fontSize: 12, fontWeight: "800" },
  actionTextSecondary: { color: companyColors.purple },
  pressed: { opacity: 0.7 },
  tabBar: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: 'flex-start',
    backgroundColor: companyColors.white,
    borderTopWidth: 1,
    borderTopColor: companyColors.line,
    paddingTop: 7,
    shadowColor: '#0B3E9C', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8, zIndex: 2,
  },
  headerTabBar: { flex: 1, paddingLeft: 24, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingVertical: 10 },
  headerTab: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 11, gap: 6, borderRadius: 11 },
  headerTabActive: { backgroundColor: companyColors.purpleSoft },
  headerTabLabel: { fontSize: 13, color: appColors.textSecondary },
  headerActiveLabel: { fontWeight: '700' },
  compactHeaderTab: { paddingHorizontal: 6, gap: 4 },
  compactHeaderLabel: { fontSize: 11 },
  tab: { flex: 1, minHeight: 62, justifyContent: 'center', alignItems: "center", gap: 2 },
  tabIcon: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: appColors.textSecondary, fontSize: 10, fontWeight: "600", textAlign: 'center' },
  tabLabelActive: { color: companyColors.purple, fontWeight: "700" },
  tabIndicator: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  tabIndicatorActive: { backgroundColor: companyColors.blue },
  tabBadge: { position: 'absolute', top: -4, right: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#E24555', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: companyColors.white },
  tabBadgeText: { color: companyColors.white, fontSize: 9, fontWeight: '800' },
});