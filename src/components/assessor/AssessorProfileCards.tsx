import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { toast } from '@/store/toast.store';
import { assessorProfileSections, type AssessorProfileSection } from '@/constants/assessor-profile-sections';
import type { AssessorProfile } from '@/services/assessor-profile.service';

type Icon = ComponentProps<typeof SymbolView>['name'];
const icons = {
  bio: { ios: 'text.alignleft', android: 'notes', web: 'notes' }, contact: { ios: 'person.crop.rectangle', android: 'contact_page', web: 'contact_page' },
  work: { ios: 'briefcase.fill', android: 'work', web: 'work' }, education: { ios: 'graduationcap.fill', android: 'school', web: 'school' }, links: { ios: 'link', android: 'link', web: 'link' },
} as const;
function Field({ label, value, icon, color, background }: { label: string; value?: string | null; icon: Icon; color: string; background: string }) {
  return <View style={s.field}><View style={[s.fieldIcon, { backgroundColor: background }]}><SymbolView name={icon} size={16} tintColor={color} /></View><View style={s.fieldCopy}><Text style={s.fieldLabel}>{label}</Text><Text selectable style={[s.value, !value && s.empty]}>{value || 'Chưa cập nhật'}</Text></View></View>;
}
const linkFields = [{ key: 'linkedInUrl', label: 'LinkedIn', icon: require('@/assets/images/brands/linkedin.svg'), color: '#0A66C2' }, { key: 'gitHubUrl', label: 'GitHub', icon: require('@/assets/images/brands/github.svg'), color: '#24292F' }, { key: 'portfolioUrl', label: 'Website / Portfolio', icon: null, color: '#7853B6' }] as const;
export function AssessorProfileCards({ profile, accountEmail, onEdit }: { profile: AssessorProfile; accountEmail?: string; onEdit: (section: AssessorProfileSection) => void }) {
  const [width, setWidth] = useState(0); const columns = width >= 700;
  const desktop = useWindowDimensions().width >= 1200;
  const d = profile.assessorJson;
  const expertise = d?.expertise ?? (d === undefined && profile.major ? [profile.major] : []);
  const university = d?.university ?? (d === undefined ? profile.universityName : null);
  const work = assessorProfileSections.work, contact = assessorProfileSections.contact, education = assessorProfileSections.education;
  const row = (label: string, value: string | null | undefined, icon: Icon, section: { color: string; background: string }) => <Field key={label} label={label} value={value} icon={icon} color={section.color} background={section.background} />;
  return <View testID="assessor-profile-cards" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[s.grid, desktop && s.desktopGrid]}>
    {(Object.keys(assessorProfileSections) as AssessorProfileSection[]).map(section => {
      const config = assessorProfileSections[section];
      return <View testID={`assessor-card-${section}`} key={section} style={[s.card, columns && section !== 'bio' && s.half]}>
        <View style={s.header}><View style={[s.headingIcon, { backgroundColor: config.background }]}><SymbolView name={icons[section]} size={21} tintColor={config.color} /></View><Text role="heading" aria-level={2} style={s.title}>{config.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa ${config.title}`} hitSlop={6} onPress={() => onEdit(section)} style={({ hovered, pressed }) => [s.edit, hovered && s.editHovered, pressed && s.pressed]}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={17} tintColor={colors.primary} /></Pressable>
        </View>
        {section === 'bio' && <Text selectable style={[s.bio, !profile.bio && s.empty]}>{profile.bio || 'Thêm vài dòng giới thiệu về bản thân và kinh nghiệm của bạn.'}</Text>}
        {section === 'contact' && <View style={s.fields}>
          {row('Email', profile.contactEmail || accountEmail, { ios: 'envelope.fill', android: 'mail', web: 'mail' }, contact)}
          {row('Điện thoại', profile.phone, { ios: 'phone.fill', android: 'call', web: 'call' }, { color: '#23845D', background: '#EBF8F1' })}
          {row('Địa chỉ', profile.address, { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }, { color: '#C15C58', background: '#FDF0EE' })}
        </View>}
        {section === 'work' && <View style={s.fields}>
          {row('Chức danh', d?.jobTitle, icons.work, work)}
          {row('Công ty', d?.companyName, { ios: 'building.2.fill', android: 'business', web: 'business' }, work)}
          {row('Kinh nghiệm', d && (d.jobTitle || d.companyName || expertise.length || d.yearsOfExperience) ? `${d.yearsOfExperience} năm` : null, { ios: 'clock.fill', android: 'history', web: 'history' }, work)}
          <View style={s.expertise}><Text style={s.fieldLabel}>Lĩnh vực chuyên môn</Text>{expertise.length ? <View style={s.tags}>{expertise.map((value, index) => <View key={`${value}-${index}`} style={s.tag}><Text style={s.tagLabel}>{value}</Text></View>)}</View> : <Text style={s.empty}>Chưa cập nhật</Text>}</View>
        </View>}
        {section === 'education' && <View style={s.fields}>{row('Trình độ học vấn', d?.education, icons.education, education)}{row('Trường đại học', university, { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' }, education)}</View>}
        {section === 'links' && <View style={s.links}>{linkFields.map(link => {
          const url = d?.[link.key]; const valid = !!url && /^https?:\/\//i.test(url);
          return <Pressable key={link.key} accessibilityRole={valid ? 'link' : 'text'} accessibilityLabel={valid ? `Mở ${link.label}` : `${link.label}: Chưa cập nhật`} disabled={!valid} onPress={() => { if (valid) void Linking.openURL(url).catch(() => toast.error('Không mở được liên kết. Vui lòng thử lại.')); }} style={({ hovered, pressed }) => [s.link, hovered && valid && s.linkHovered, pressed && s.pressed]}>
            <View style={s.brandIcon}>{link.icon ? <Image testID={`assessor-brand-${link.key}`} source={link.icon} tintColor={link.color} contentFit="contain" style={s.brandImage} /> : <SymbolView name={{ ios: 'globe', android: 'language', web: 'language' }} size={23} tintColor={link.color} />}</View>
            <View style={s.fieldCopy}><Text style={s.linkLabel}>{link.label}</Text><Text style={s.linkHint}>{valid ? 'Xem trang cá nhân' : 'Chưa cập nhật'}</Text></View>
            {valid && <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={16} tintColor={colors.textMuted} />}
          </Pressable>;
        })}</View>}
      </View>;
    })}
  </View>;
}
const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginHorizontal: 20 },
  desktopGrid: { marginHorizontal: 0 },
  card: { width: '100%', minWidth: 0, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, half: { width: '47%', flexGrow: 1, flexBasis: '47%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 16, marginBottom: 2 }, headingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  edit: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, editHovered: { backgroundColor: colors.primaryLight },
  bio: { color: colors.textPrimary, fontSize: 14, lineHeight: 24 }, fields: { gap: 16 }, field: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fieldIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, fieldCopy: { flex: 1, minWidth: 0, gap: 4 },
  fieldLabel: { fontSize: 11, lineHeight: 16, color: colors.textSecondary }, value: { fontSize: 13, lineHeight: 20, color: colors.textPrimary }, empty: { color: colors.textMuted, fontSize: 13, lineHeight: 21 },
  expertise: { gap: 8, borderTopWidth: 1, borderTopColor: '#EDF2F8', paddingTop: 14 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFF5E7', maxWidth: '100%' }, tagLabel: { color: '#975913', fontSize: 12, lineHeight: 18 },
  links: { gap: 4 }, link: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10 },
  linkHovered: { backgroundColor: colors.background }, brandIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, brandImage: { width: 23, height: 23 },
  linkLabel: { color: colors.navy, fontSize: 13, fontWeight: '600' }, linkHint: { fontSize: 11, color: colors.textMuted }, pressed: { opacity: 0.75 },
});
