import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CompanyIcon, companyColors as c } from './company-ui';
import { WebsiteBrandIcon, websitePlatformLabel } from './WebsiteBrandIcon';

type Props = {
  name: string;
  description: string | null;
  websites: string[];
  onEdit: () => void;
  onOpenWebsite: (url: string) => void;
};

export function CompanyAboutCard({ name, description, websites, onEdit, onOpenWebsite }: Props) {
  const mobile = useWindowDimensions().width < 700;
  return <View testID="company-about-card" style={[s.card, mobile && s.mobileCard]}>
    <View style={s.header}>
      <View style={s.headingIcon}><CompanyIcon name={{ ios: 'building.2', android: 'business', web: 'business' }} size={21} /></View>
      <View style={s.heading}><Text style={s.eyebrow}>GIỚI THIỆU TỔ CHỨC</Text><Text role="heading" aria-level={2} style={s.title}>Về {name}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa phần giới thiệu" onPress={onEdit} style={({ hovered, pressed }) => [s.edit, hovered && s.editHovered, pressed && s.pressed]}>
        <CompanyIcon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={17} />
      </Pressable>
    </View>
    <Text style={[s.description, !description?.trim() && s.empty]}>{description?.trim() || 'Thêm phần giới thiệu để sinh viên hiểu hơn về tổ chức của bạn.'}</Text>
    {!!websites.length && <View style={s.linksSection}>
      <View style={s.links}>{websites.map((website, index) => <Pressable key={`${website}-${index}`} accessibilityRole="link" accessibilityLabel={`Mở ${websitePlatformLabel(website)}`} onPress={() => onOpenWebsite(website)} style={({ pressed }) => [s.link, pressed && s.pressed]}>
        <WebsiteBrandIcon url={website} size={20} />
        <Text style={s.platform}>{websitePlatformLabel(website)}</Text>
      </Pressable>)}</View>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 20, backgroundColor: c.white },
  mobileCard: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headingIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.purpleSoft },
  heading: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { color: c.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { color: c.ink, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  edit: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F8FF' },
  editHovered: { backgroundColor: c.purpleSoft },
  description: { color: '#53657D', fontSize: 13, lineHeight: 23 },
  empty: { color: c.muted },
  linksSection: { borderTopWidth: 1, borderTopColor: '#EDF2F8', marginTop: 20, paddingTop: 16, gap: 12 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  link: { maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  platform: { color: c.ink, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
