import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ProfileTheme } from '@/types/portfolio';
import { profileInterestSymbol } from '@/data/profile-interests';
import { SectionAdd, useProfileEditing } from './ProfileEditContext';

export function ProfileInterestIcon({ name, theme }: { name: string; theme: ProfileTheme }) {
  return <View testID="profile-interest-icon" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.icon, { backgroundColor: theme.accentSoft }]}>
    <SymbolView name={profileInterestSymbol(name)} tintColor={theme.accentStrong} size={16} style={s.symbol} />
  </View>;
}

export function ProfileInterests({ interests, theme }: { interests?: string[] | null; theme: ProfileTheme }) {
  const editing = useProfileEditing();
  if (!interests?.length && !editing) return null;
  return <View testID="profile-interests" style={s.section}>
    <View style={s.heading}><Text role="heading" aria-level={2} style={[s.title, { color: theme.text }]}>Sở thích cá nhân</Text><SectionAdd title="Sở thích cá nhân" theme={theme} /></View>
    {!interests?.length && <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }}>Chọn những sở thích để mọi người hiểu thêm về bạn.</Text>}
    <View style={s.interests}>{interests?.map((interest, index) => {
      return <View key={`${interest}-${index}`} testID="profile-interest-tag" style={[s.interest, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ProfileInterestIcon name={interest} theme={theme} />
        <Text style={[s.label, { color: theme.text }]}>{interest}</Text>
      </View>;
    })}</View>
  </View>;
}

const s = StyleSheet.create({
  section: { marginBottom: 32, gap: 14 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { fontSize: 23, lineHeight: 31, fontWeight: '700' },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interest: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', minWidth: 0, borderWidth: 1, borderRadius: 10, paddingLeft: 7, paddingRight: 12, paddingVertical: 7 },
  icon: { width: 24, height: 24, flexShrink: 0, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  symbol: { width: 16, height: 16 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '500', flexShrink: 1 },
});
