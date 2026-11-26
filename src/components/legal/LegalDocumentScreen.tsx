import { useCallback, useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { LEGAL_DOCUMENTS, type LegalDocumentKind } from '@/data/legal-documents';
import { useScreenSafeAreaEdges } from '@/hooks/useScreenSafeAreaEdges';
import { useAuthStore } from '@/store/auth.store';

export function LegalDocumentScreen({ kind }: { kind: LegalDocumentKind }) {
  return <LegalDocumentBody key={kind} kind={kind} />;
}

function LegalDocumentBody({ kind }: { kind: LegalDocumentKind }) {
  const doc = LEGAL_DOCUMENTS[kind];
  const companion = LEGAL_DOCUMENTS[doc.companionKind];
  const safeAreaEdges = useScreenSafeAreaEdges();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();

  const wide = width >= 960;
  const compact = width < 520;
  const scrollRef = useRef<ScrollView>(null);
  const mainTopRef = useRef(0);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [activeId, setActiveId] = useState(doc.sections[0]?.id ?? '');

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setActiveId(id);
    const relativeY = sectionOffsets.current[id];
    if (typeof relativeY !== 'number') return;
    const targetY = Math.max(0, mainTopRef.current + relativeY - 16);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y - mainTopRef.current + 120;
      let current = doc.sections[0]?.id ?? '';
      for (const section of doc.sections) {
        const offset = sectionOffsets.current[section.id];
        if (typeof offset === 'number' && offset <= y) {
          current = section.id;
        }
      }
      setActiveId(prev => (prev === current ? prev : current));
    },
    [doc.sections],
  );

  const switchDoc = (nextKind: LegalDocumentKind) => {
    if (nextKind === kind) return;
    router.replace((nextKind === 'terms' ? '/terms' : '/privacy') as Href);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace((isAuthenticated ? '/settings' : '/(auth)/welcome') as Href);
  };

  const docSwitcher = (
    <View style={s.switcher} role="tablist" aria-label="Chuyển văn bản pháp lý">
      {(['terms', 'privacy'] as const).map(item => {
        const active = item === kind;
        const label = item === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật';
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => switchDoc(item)}
            style={({ pressed }) => [
              s.switchTab,
              active && s.switchTabActive,
              pressed && !active && s.switchTabPressed,
            ]}
          >
            <SymbolView
              name={
                item === 'terms'
                  ? { ios: 'doc.text', android: 'description', web: 'description' }
                  : { ios: 'hand.raised', android: 'privacy_tip', web: 'privacy_tip' }
              }
              size={16}
              tintColor={active ? colors.primaryDark : colors.textSecondary}
            />
            <Text numberOfLines={1} style={[s.switchText, active && s.switchTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={safeAreaEdges}>
      <DetailNavigation
        title={doc.title}
        backLabel="Quay lại"
        fallback={isAuthenticated ? '/settings' : '/(auth)/welcome'}
        crumbs={
          isAuthenticated
            ? undefined
            : [{ label: 'UniNet', href: '/(auth)/welcome' }, { label: doc.title }]
        }
      />

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          compact && s.mobileScrollContent,
          { paddingBottom: Math.max(40, insets.bottom + 24) },
        ]}
      >
        <View style={[s.layout, wide && s.wideLayout]}>
          {wide && (
            <View style={s.rail}>
              <View style={s.railCard}>
                <Text style={s.railLabel}>VĂN BẢN PHÁP LÝ</Text>
                {(['terms', 'privacy'] as const).map(item => {
                  const active = item === kind;
                  const target = LEGAL_DOCUMENTS[item];
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityLabel={target.title}
                      accessibilityState={{ selected: active }}
                      onPress={() => switchDoc(item)}
                      style={({ pressed }) => [
                        s.railDocItem,
                        active && s.railDocItemActive,
                        pressed && !active && s.railItemPressed,
                      ]}
                    >
                      <View style={[s.railDocIcon, active && s.railDocIconActive]}>
                        <SymbolView
                          name={
                            item === 'terms'
                              ? { ios: 'doc.text', android: 'description', web: 'description' }
                              : { ios: 'hand.raised', android: 'privacy_tip', web: 'privacy_tip' }
                          }
                          size={16}
                          tintColor={active ? colors.surface : colors.primary}
                        />
                      </View>
                      <Text style={[s.railDocText, active && s.railDocTextActive]}>
                        {target.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.railCard}>
                <Text style={s.railLabel}>MỤC LỤC</Text>
                <View style={s.tocList}>
                  {doc.sections.map((section, index) => {
                    const active = activeId === section.id;
                    return (
                      <Pressable
                        key={section.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Mục ${index + 1}: ${section.title}`}
                        onPress={() => scrollToSection(section.id)}
                        style={({ pressed }) => [
                          s.tocItem,
                          active && s.tocItemActive,
                          pressed && !active && s.railItemPressed,
                        ]}
                      >
                        <Text style={[s.tocNumber, active && s.tocNumberActive]}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                        <Text numberOfLines={2} style={[s.tocTitle, active && s.tocTitleActive]}>
                          {section.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={s.railMetaCard}>
                <View style={s.metaRow}>
                  <Text style={s.metaKey}>Hiệu lực</Text>
                  <Text style={s.metaVal}>{doc.effectiveDate}</Text>
                </View>
                <View style={s.metaRow}>
                  <Text style={s.metaKey}>Phiên bản</Text>
                  <Text style={s.metaVal}>{doc.version}</Text>
                </View>
                <View style={s.metaRow}>
                  <Text style={s.metaKey}>Áp dụng</Text>
                  <Text style={s.metaVal}>{doc.audience}</Text>
                </View>
                <View style={[s.metaRow, s.metaRowLast]}>
                  <Text style={s.metaKey}>Liên hệ</Text>
                  <Text selectable style={[s.metaVal, s.metaEmail]}>
                    support@uninet.vn
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View
            style={s.main}
            onLayout={event => {
              mainTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            {!wide && docSwitcher}

            <View style={[s.hero, compact && s.compactHero]}>
              <View style={s.heroTopRow}>
                <View style={s.kickerPill}>
                  <Image
                    source={require('@/assets/images/uninet-mark.png')}
                    resizeMode="contain"
                    style={s.heroMark}
                    accessibilityLabel="Logo UniNet"
                  />
                  <Text style={s.kicker}>{doc.kicker}</Text>
                </View>
                <View style={s.versionBadge}>
                  <Text style={s.versionBadgeText}>
                    Hiệu lực {doc.effectiveDate} · {doc.version}
                  </Text>
                </View>
              </View>

              <Text role="heading" aria-level={1} style={[s.heroTitle, compact && s.compactTitle]}>
                {doc.title}
              </Text>
              <Text style={s.heroSubtitle}>{doc.subtitle}</Text>

              <View style={[s.highlightsGrid, compact && s.highlightsStack]}>
                {doc.highlights.map(item => (
                  <View key={item.title} style={[s.highlightCard, compact && s.highlightCardCompact]}>
                    <View style={s.highlightIcon}>
                      <SymbolView name={item.icon} size={18} tintColor={colors.primary} />
                    </View>
                    <View style={s.highlightCopy}>
                      <Text style={s.highlightTitle}>{item.title}</Text>
                      <Text style={s.highlightDesc}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {!wide && (
              <View style={s.mobileTocWrap}>
                <Text style={s.mobileTocLabel}>Đi nhanh đến mục</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.mobileTocScroll}
                >
                  {doc.sections.map((section, index) => {
                    const active = activeId === section.id;
                    return (
                      <Pressable
                        key={section.id}
                        accessibilityRole="button"
                        onPress={() => scrollToSection(section.id)}
                        style={({ pressed }) => [
                          s.mobileTocChip,
                          active && s.mobileTocChipActive,
                          pressed && s.switchTabPressed,
                        ]}
                      >
                        <Text style={[s.mobileTocNum, active && s.mobileTocNumActive]}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[s.mobileTocText, active && s.mobileTocTextActive]}
                        >
                          {section.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={s.sectionsStack}>
              {doc.sections.map((section, index) => (
                <View
                  key={section.id}
                  onLayout={event => {
                    sectionOffsets.current[section.id] = event.nativeEvent.layout.y;
                  }}
                  style={[s.sectionCard, compact && s.compactSectionCard]}
                >
                  <View style={s.sectionHeader}>
                    <View style={s.sectionNumber}>
                      <Text style={s.sectionNumberText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={s.sectionIcon}>
                      <SymbolView name={section.icon} size={17} tintColor={colors.primary} />
                    </View>
                    <Text role="heading" aria-level={2} style={s.sectionTitle}>
                      {section.title}
                    </Text>
                  </View>

                  <View style={s.sectionBody}>
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <Text key={pIndex} style={s.paragraph}>
                        {paragraph}
                      </Text>
                    ))}

                    {section.bullets && section.bullets.length > 0 && (
                      <View style={s.bulletList}>
                        {section.bullets.map((bullet, bIndex) => (
                          <View key={bIndex} style={s.bulletRow}>
                            <View style={s.bulletDot} />
                            <Text style={s.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {section.callout && (
                      <View
                        style={[
                          s.callout,
                          section.callout.tone === 'warning' ? s.calloutWarning : s.calloutInfo,
                        ]}
                      >
                        <SymbolView
                          name={
                            section.callout.tone === 'warning'
                              ? { ios: 'exclamationmark.triangle', android: 'info', web: 'info' }
                              : { ios: 'info.circle', android: 'info', web: 'info' }
                          }
                          size={18}
                          tintColor={
                            section.callout.tone === 'warning' ? colors.warning : colors.primary
                          }
                        />
                        <View style={s.calloutCopy}>
                          <Text
                            style={[
                              s.calloutTitle,
                              section.callout.tone === 'warning' && s.calloutWarningTitle,
                            ]}
                          >
                            {section.callout.title}
                          </Text>
                          <Text style={s.calloutBody}>{section.callout.body}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={[s.companionCard, compact && s.compactCompanionCard]}>
              <View style={s.companionCopy}>
                <Text style={s.companionKicker}>TÀI LIỆU LIÊN QUAN</Text>
                <Text style={s.companionTitle}>{companion.title}</Text>
                <Text style={s.companionDesc}>{doc.companionDescription}</Text>
              </View>
              <View style={[s.companionActions, compact && s.companionActionsCompact]}>
                <Button
                  title={`Xem ${companion.title}`}
                  onPress={() => switchDoc(doc.companionKind)}
                  style={s.companionPrimaryBtn}
                  textStyle={s.companionBtnText}
                />
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={handleBack}
                  style={s.companionBackBtn}
                  textStyle={s.companionBtnText}
                />
              </View>
            </View>

            <View style={s.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lên đầu trang"
                onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                style={({ pressed }) => [s.topLink, pressed && s.railItemPressed]}
              >
                <SymbolView
                  name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                  size={15}
                  tintColor={colors.primary}
                />
                <Text style={s.topLinkText}>Lên đầu trang</Text>
              </Pressable>

              <View style={s.footerBrand}>
                <Image
                  source={require('@/assets/images/uninet-mark.png')}
                  resizeMode="contain"
                  style={s.footerLogo}
                  accessibilityLabel="Logo UniNet"
                />
                <Text style={s.footerName}>UniNet</Text>
              </View>
              <Text style={s.footerTagline}>Kết nối để cùng phát triển</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 4px 18px rgba(17, 26, 54, 0.04)' }
    : {
        shadowColor: '#10284B',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      };

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  mobileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  layout: {
    gap: 20,
  },
  wideLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },

  rail: {
    width: 268,
    flexShrink: 0,
    gap: 14,
  },
  railCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...cardShadow,
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: colors.textMuted,
  },
  railDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  railDocItemActive: {
    backgroundColor: colors.primaryLight,
  },
  railItemPressed: {
    backgroundColor: '#F1F6FD',
  },
  railDocIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDocIconActive: {
    backgroundColor: colors.primary,
  },
  railDocText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  railDocTextActive: {
    color: colors.navy,
    fontWeight: '700',
  },

  tocList: { gap: 4 },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tocItemActive: {
    backgroundColor: '#F0F6FF',
  },
  tocNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: 2,
  },
  tocNumberActive: {
    color: colors.primary,
  },
  tocTitle: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tocTitleActive: {
    color: colors.navy,
    fontWeight: '700',
  },

  railMetaCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...cardShadow,
  },
  metaRow: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 3,
  },
  metaRowLast: { borderBottomWidth: 0 },
  metaKey: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  metaVal: { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  metaEmail: { color: colors.primary },

  main: {
    flex: 1,
    minWidth: 0,
    gap: 18,
  },

  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  switchTab: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  switchTabActive: {
    backgroundColor: colors.primaryLight,
  },
  switchTabPressed: {
    opacity: 0.78,
  },
  switchText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  switchTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  hero: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 26,
    gap: 14,
    ...cardShadow,
  },
  compactHero: {
    padding: 18,
    borderRadius: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMark: { width: 22, height: 22 },
  kicker: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  versionBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  versionBadgeText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  compactTitle: {
    fontSize: 24,
    lineHeight: 31,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  highlightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  highlightsStack: {
    flexDirection: 'column',
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E1ECFA',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  highlightCardCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  highlightIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  highlightCopy: {
    flex: 1,
    gap: 4,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    lineHeight: 18,
  },
  highlightDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  mobileTocWrap: {
    gap: 8,
  },
  mobileTocLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  mobileTocScroll: {
    gap: 8,
    paddingRight: 8,
  },
  mobileTocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 240,
  },
  mobileTocChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#B8D4FA',
  },
  mobileTocNum: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  mobileTocNumActive: {
    color: colors.primaryDark,
  },
  mobileTocText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  mobileTocTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  sectionsStack: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 14,
    ...cardShadow,
  },
  compactSectionCard: {
    padding: 17,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionNumber: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  sectionNumberText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '800',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  sectionBody: {
    gap: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bulletList: {
    gap: 9,
    paddingLeft: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textSecondary,
  },

  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    marginTop: 2,
  },
  calloutInfo: {
    backgroundColor: '#F2F7FF',
    borderColor: '#CFE1FC',
  },
  calloutWarning: {
    backgroundColor: '#FFF9EC',
    borderColor: '#F4DFB0',
  },
  calloutCopy: {
    flex: 1,
    gap: 3,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  calloutWarningTitle: {
    color: '#8A4F0E',
  },
  calloutBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  companionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    ...cardShadow,
  },
  compactCompanionCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 18,
  },
  companionCopy: {
    flex: 1,
    gap: 4,
  },
  companionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary,
  },
  companionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  companionDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  companionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  companionActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  companionPrimaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  companionBackBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  companionBtnText: {
    fontSize: 13.5,
  },

  footer: {
    alignItems: 'center',
    gap: 7,
    paddingTop: 8,
    paddingBottom: 6,
  },
  topLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  topLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogo: { width: 28, height: 28 },
  footerName: { color: colors.navy, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  footerTagline: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
});

