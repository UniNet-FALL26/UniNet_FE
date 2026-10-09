import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as appColors } from '@/constants/colors';

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
  greenSoft: '#E8F7F0',
  amber: appColors.warning,
  amberSoft: '#FFF4DF',
  rose: appColors.error,
  blue: appColors.primary,
};

export type CompanyIconName = ComponentProps<typeof SymbolView>['name'];
type IconName = CompanyIconName;

export function CompanyIcon({ name, size = 18, color = companyColors.purple }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

export function CompanyPage({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function PageScroll({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.titleWrap}><Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{title}</Text>{action && onAction ? <Pressable onPress={onAction} style={styles.inlineAction}><Text style={styles.inlineActionText}>{action}</Text><CompanyIcon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={13} /></Pressable> : null}</View>;
}

export function Tag({ children, tone = 'purple' }: { children: ReactNode; tone?: 'purple' | 'green' | 'amber' | 'gray' | 'rose' }) {
  const tones = {
    purple: [companyColors.purpleSoft, companyColors.purple],
    green: [companyColors.greenSoft, companyColors.green],
    amber: [companyColors.amberSoft, companyColors.amber],
    gray: [companyColors.page, appColors.textSecondary],
    rose: ['#FCEBED', companyColors.rose],
  } as const;
  return <View style={[styles.tag, { backgroundColor: tones[tone][0] }]}><Text style={[styles.tagText, { color: tones[tone][1] }]}>{children}</Text></View>;
}

export function ActionButton({ title, onPress, icon, variant = 'primary', style }: { title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'outline' | 'soft'; style?: StyleProp<ViewStyle> }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, variant === 'primary' ? styles.actionPrimary : variant === 'outline' ? styles.actionOutline : styles.actionSoft, style, pressed && styles.pressed]}>
    {icon ? <CompanyIcon name={icon} size={16} color={variant === 'primary' ? '#FFFFFF' : companyColors.purple} /> : null}
    <Text style={[styles.actionText, variant !== 'primary' && styles.actionTextSecondary]}>{title}</Text>
  </Pressable>;
}

const tabs = [
  { label: 'Tổng quan', route: '/(company)', icon: { ios: 'square.grid.2x2', android: 'dashboard', web: 'dashboard' }, active: { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' } },
  { label: 'Bài đăng', route: '/(company)/jobs', icon: { ios: 'briefcase', android: 'work_outline', web: 'work_outline' }, active: { ios: 'briefcase.fill', android: 'work', web: 'work' } },
  { label: 'Ứng viên', route: '/(company)/applicants', icon: { ios: 'person.2', android: 'groups', web: 'groups' }, active: { ios: 'person.2.fill', android: 'groups', web: 'groups' } },
  { label: 'Công ty', route: '/(company)/profile', icon: { ios: 'building.2', android: 'business', web: 'business' }, active: { ios: 'building.2.fill', android: 'business', web: 'business' } },
] as const;

export function CompanyTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 4) }]} accessibilityRole="tablist">
    {tabs.map((tab) => {
      const targetPath = tab.route === '/(company)' ? '/' : tab.route.slice(tab.route.indexOf(')') + 1);
      const isActive = tab.route === '/(company)' ? pathname === '/' || pathname === '/company' : pathname === targetPath || (tab.route.endsWith('/jobs') && pathname === '/create');
      return <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: isActive }} onPress={() => router.navigate(tab.route as never)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <CompanyIcon name={isActive ? tab.active : tab.icon} size={20} color={isActive ? companyColors.purple : companyColors.muted} />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: companyColors.page },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 26, gap: 12 },
  titleWrap: { paddingHorizontal: 4, gap: 5, marginBottom: 2 },
  pageTitle: { color: companyColors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  pageSubtitle: { color: companyColors.muted, fontSize: 12, lineHeight: 18 },
  card: { borderRadius: 16, padding: 14, backgroundColor: companyColors.white, borderWidth: 1, borderColor: companyColors.line },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  sectionTitle: { color: companyColors.ink, fontSize: 15, fontWeight: '800' },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  inlineActionText: { color: companyColors.purple, fontSize: 11, fontWeight: '700' },
  tag: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
  actionButton: { minHeight: 42, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionPrimary: { backgroundColor: companyColors.purple },
  actionOutline: { backgroundColor: companyColors.white, borderWidth: 1, borderColor: companyColors.line },
  actionSoft: { backgroundColor: companyColors.purpleSoft },
  actionText: { color: companyColors.white, fontSize: 12, fontWeight: '800' },
  actionTextSecondary: { color: companyColors.purple },
  pressed: { opacity: 0.7 },
  tabBar: { minHeight: 64, flexDirection: 'row', backgroundColor: companyColors.white, borderTopWidth: 1, borderTopColor: companyColors.line, paddingHorizontal: 4, paddingTop: 7 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { color: companyColors.muted, fontSize: 9, fontWeight: '600' },
  tabLabelActive: { color: companyColors.purple, fontWeight: '800' },
});
