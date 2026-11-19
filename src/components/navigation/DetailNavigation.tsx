import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { detailNavigation, type NavigationCrumb } from '@/utils/detail-navigation';
import { useDismissDetail } from './NavigationDismissContext';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

type Options = { title?: string; crumbs?: NavigationCrumb[]; fallback?: string; projectId?: string; onBack?: () => void; onParentNavigate?: (href: string) => void; backLabel?: string; disabled?: boolean; actions?: ReactNode; mobileActions?: ReactNode };
type Registration = { owner: symbol; options: Options };
const Context = createContext<{ update: (registration: Registration) => void; remove: (owner: symbol) => void } | null>(null);

// Screens register their existing handlers/actions; the shell keeps this row fixed above scrolling content.
export function DetailNavigation(options: Options) {
  const context = useContext(Context);
  const owner = useRef(Symbol('detail-navigation')).current;
  useLayoutEffect(() => { context?.update({ owner, options }); });
  useLayoutEffect(() => () => context?.remove(owner), [context, owner]);
  return context ? null : <NavigationBar options={options} />;
}

export function DetailNavigationFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const contentInsets = useMemo(() => ({ ...insets, top: 0, bottom: 0 }), [insets.top, insets.bottom, insets.left, insets.right]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const update = useCallback((next: Registration) => setRegistration(next), []);
  const remove = useCallback((owner: symbol) => setRegistration(current => current?.owner === owner ? null : current), []);
  const context = useMemo(() => ({ update, remove }), [update, remove]);
  return <Context.Provider value={context}><View style={s.frame}><NavigationBar options={registration?.options} /><View style={s.content}><SafeAreaInsetsContext.Provider value={contentInsets}>{children}</SafeAreaInsetsContext.Provider></View></View></Context.Provider>;
}

function NavigationBar({ options }: { options?: Options }) {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id?: string; projectId?: string; jobId?: string; template?: string; theme?: string }>();
  const { account } = useAuthStore();
  const dismissDetail = useDismissDetail();
  const desktop = useWindowDimensions().width >= 1024;
  const route = detailNavigation(pathname, account?.role, { ...params, projectId: options?.projectId || params.projectId });
  if (!route && !options) return null;
  const crumbs = options?.crumbs || route?.crumbs || [{ label: options?.title || 'Chi tiết' }];
  const back = options?.onBack || (() => router.canGoBack() ? router.back() : router.replace((options?.fallback || route?.fallback || '/(tabs)') as Href));
  const openParent = (href: string) => {
    if (options?.onParentNavigate) { options.onParentNavigate(href); return; }
    dismissDetail?.();
    router.navigate(href as Href);
  };
  return <View testID="detail-navigation" style={[s.bar, desktop && s.desktop]}><View style={[s.inner, desktop && s.desktopInner]}>
    <Pressable accessibilityRole="button" accessibilityLabel={options?.backLabel || 'Quay lại'} disabled={options?.disabled} onPress={back} style={({ pressed }) => [s.back, pressed && s.pressed]}><SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={21} tintColor={colors.navy} /></Pressable>
    {desktop ? <View testID="detail-breadcrumbs" accessibilityLabel="Đường dẫn trang" style={s.crumbs}>{crumbs.map((item, index) => <View key={`${index}:${item.label}`} style={s.crumb}>{index > 0 && <Text style={s.separator}>›</Text>}{item.href ? <Pressable accessibilityRole="link" disabled={options?.disabled} onPress={() => openParent(item.href!)}><Text style={s.parent}>{item.label}</Text></Pressable> : <Text aria-current={index === crumbs.length - 1 ? 'page' : undefined} style={s.current}>{item.label}</Text>}</View>)}</View> : <Text numberOfLines={1} style={s.title}>{options?.title || crumbs[crumbs.length - 1]?.label}</Text>}
    {(options?.actions || (!desktop && options?.mobileActions)) && <View testID="detail-page-actions" style={s.actions}>{options?.actions}{!desktop && options?.mobileActions}</View>}
  </View></View>;
}

const s = StyleSheet.create({
  frame: { flex: 1, minHeight: 0 }, content: { flex: 1, minHeight: 0 },
  bar: { flexShrink: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  desktop: { backgroundColor: colors.background, borderBottomWidth: 0 },
  inner: { width: '100%', maxWidth: 1500, alignSelf: 'center', minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  desktopInner: { minHeight: 44 },
  back: { width: 40, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.65 },
  crumbs: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 10 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 10 }, separator: { color: colors.textMuted, fontSize: 14 },
  parent: { color: colors.textSecondary, fontSize: 12, lineHeight: 20 }, current: { color: colors.textSecondary, fontSize: 12, lineHeight: 20 },
  title: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 14, fontWeight: '600' }, actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 },
});
