import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { colors } from '@/constants/colors';
import { ProjectVisibility, type CreateProjectRequest } from '@/types/project';

type Props = { draft: CreateProjectRequest; creating: boolean; error: string | null; onCreate: () => void; onEdit: () => void };
const dateLabel = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Chưa có';
  return `${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

export function ProjectCreationReview({ draft, creating, error, onCreate, onEdit }: Props) {
  const wide = useWindowDimensions().width >= 900;
  const [expanded, setExpanded] = useState(false);
  const longDescription = draft.description.length > 350 || draft.description.split('\n').length > 6;
  const isPrivate = draft.visibility === ProjectVisibility.Private;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <DetailNavigation title="Kiểm tra thông tin" crumbs={[{ label: 'Dự án', href: '/(tabs)/groups' }, { label: 'Tạo dự án', href: '/group/create' }, { label: 'Kiểm tra thông tin' }]} onBack={onEdit} disabled={creating} />
    <View style={[s.layout, wide && s.columns]}>
      <View style={s.main}>
        <View style={s.card}>
          <View style={s.projectHeader}><Text style={s.field}>{draft.projectField}</Text><View style={s.visibility}><SymbolView name={isPrivate ? { ios: 'lock', android: 'lock_outline', web: 'lock_outline' } : { ios: 'globe', android: 'public', web: 'public' }} size={12} tintColor={colors.textSecondary} /><Text style={s.visibilityText}>{isPrivate ? 'Riêng tư' : 'Công khai'}</Text></View></View>
          <Text accessibilityRole="header" style={s.projectTitle}>{draft.title}</Text>
          <View style={s.descriptionSection}><Text style={s.sectionTitle}>Mô tả dự án</Text><Text testID="project-review-description" style={s.description} numberOfLines={expanded ? undefined : 6}>{draft.description}</Text>{longDescription && <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Thu gọn' : 'Xem đầy đủ'} aria-expanded={expanded} accessibilityState={{ expanded }} onPress={() => setExpanded(current => !current)} style={s.expand}><Text style={s.link}>{expanded ? 'Thu gọn' : 'Xem đầy đủ'}</Text><SymbolView name={expanded ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={14} tintColor={colors.primary} /></Pressable>}</View>
        </View>
        <View style={s.card}>
          <View style={s.rolesHeader}><Text accessibilityRole="header" style={s.sectionTitle}>Vai trò cần tuyển</Text><Text style={s.roleCount}>{draft.roleRequirements.length} vai trò</Text></View>
          {draft.roleRequirements.map((role, index) => <View key={index} testID={`project-review-role-${index}`} style={[s.role, index > 0 && s.roleDivider]}>
            <View style={s.roleTop}><Text style={s.roleName}>{role.role}</Text><Text style={s.quantity}>{role.quantity} người</Text></View>
            <Text style={s.requirements}>{role.requirements}</Text>
          </View>)}
        </View>
      </View>
      <View style={[s.aside, wide && s.asideWide]}>
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.sectionTitle}>Thông tin nhóm</Text>
          <View style={s.metrics}><View style={s.metric}><Text style={s.metricValue}>{draft.memberTarget}</Text><Text style={s.metricLabel}>Thành viên mục tiêu</Text></View><View style={[s.metric, s.metricBorder]}><Text style={s.metricValue}>{draft.minimumQuantity}</Text><Text style={s.metricLabel}>Thành viên tối thiểu</Text></View></View>
          <Text style={s.small}>Đã bao gồm người tạo dự án.</Text>
          <View style={s.dates}>
            <View style={s.dateRow}><SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} size={17} tintColor={colors.textSecondary} /><View style={s.dateCopy}><Text style={s.dateLabel}>Hạn tuyển thành viên</Text><Text style={s.dateValue}>{dateLabel(draft.recruitmentDeadline)}</Text></View></View>
            <View style={s.dateRow}><SymbolView name={{ ios: 'flag', android: 'outlined_flag', web: 'outlined_flag' }} size={17} tintColor={colors.textSecondary} /><View style={s.dateCopy}><Text style={s.dateLabel}>Dự kiến hoàn thành</Text><Text style={s.dateValue}>{dateLabel(draft.expectedOutput)}</Text></View></View>
          </View>
        </View>
        <View style={s.note}><SymbolView name={{ ios: 'person.2', android: 'group', web: 'group' }} size={19} tintColor={colors.primary} /><Text style={s.noteText}>Sau khi tạo dự án, bạn có thể xem gợi ý thành viên và gửi lời mời tham gia.</Text></View>
      </View>
    </View>
    {!!error && <View accessibilityRole="alert" style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
    <View style={[s.actions, !wide && s.mobileActions]}>
      <Text style={s.footerHint}>Thông tin đã sẵn sàng? Tạo dự án để tiếp tục.</Text>
      <View style={s.buttons}><Button title="Quay lại chỉnh sửa" variant="outline" disabled={creating} onPress={onEdit} style={s.button} textStyle={s.buttonText} /><Button title="Tạo dự án" loading={creating} disabled={creating} onPress={onCreate} style={s.primaryButton} textStyle={s.buttonText} /></View>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 24 },
  layout: { gap: 20 }, columns: { flexDirection: 'row', alignItems: 'flex-start' }, main: { flex: 1, minWidth: 0, gap: 20 }, aside: { gap: 16 }, asideWide: { width: 300 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 20, gap: 16 }, projectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  field: { fontSize: 12, lineHeight: 18, color: colors.primary, flexShrink: 1 }, visibility: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, backgroundColor: colors.background, paddingVertical: 5, paddingHorizontal: 8 }, visibilityText: { fontSize: 11, color: colors.textSecondary },
  projectTitle: { fontSize: 21, lineHeight: 29, fontWeight: '600', color: colors.navy }, sectionTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.textPrimary }, descriptionSection: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }, description: { fontSize: 13, lineHeight: 22, color: colors.textSecondary }, expand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, minHeight: 30 }, link: { fontSize: 12, fontWeight: '500', color: colors.primary },
  rolesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, roleCount: { fontSize: 11, color: colors.textMuted }, role: { gap: 6 }, roleDivider: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }, roleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, roleName: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20, fontWeight: '600', color: colors.navy }, quantity: { fontSize: 11, lineHeight: 20, color: colors.textSecondary }, requirements: { fontSize: 12, lineHeight: 20, color: colors.textSecondary },
  metrics: { flexDirection: 'row', paddingVertical: 4 }, metric: { flex: 1, minWidth: 0, gap: 6 }, metricBorder: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.border }, metricValue: { fontSize: 26, lineHeight: 32, fontWeight: '600', color: colors.navy }, metricLabel: { fontSize: 11, lineHeight: 17, color: colors.textSecondary }, small: { fontSize: 11, lineHeight: 17, color: colors.textMuted }, dates: { gap: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border }, dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, dateCopy: { flex: 1, gap: 5 }, dateLabel: { fontSize: 11, lineHeight: 17, color: colors.textSecondary }, dateValue: { fontSize: 12, lineHeight: 19, fontWeight: '500', color: colors.navy },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 6 }, noteText: { flex: 1, fontSize: 12, lineHeight: 20, color: colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }, mobileActions: { flexDirection: 'column', alignItems: 'stretch' }, footerHint: { flexShrink: 1, fontSize: 12, lineHeight: 20, color: colors.textSecondary }, buttons: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 }, button: { minHeight: 40, paddingHorizontal: 14 }, primaryButton: { minHeight: 40, minWidth: 112, paddingHorizontal: 18 }, buttonText: { fontSize: 13, fontWeight: '600' }, errorBox: { padding: 14, borderRadius: 10, backgroundColor: '#FFF1F1' }, errorText: { color: colors.error, fontSize: 13, lineHeight: 20 },
});
