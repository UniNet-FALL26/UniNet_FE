import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { VerificationPackage } from '@/types/project-verification';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { HubIcon } from './hub/ProjectHubUI';

export function VerificationRegistrationPanel({ title, packages, selectedPackage, onSelect, page, pages, onPage }: {
  title: string; packages: VerificationPackage[]; selectedPackage: string | null; onSelect: (id: string) => void;
  page: number; pages: number; onPage: (page: number) => void;
}) {
  const wide = useWindowDimensions().width >= 900;
  const selected = packages.find(p => p.id === selectedPackage);
  const single = packages.length === 1 && pages === 1;
  const packageName = (p: VerificationPackage) => p.name || 'Thẩm định dự án với chuyên viên';
  return <View testID="verification-registration" style={[s.layout, wide && s.wide]}>
    <View style={s.main}>
      <View role="region" accessibilityLabel="Dịch vụ thẩm định" style={s.section}>
        <View style={s.sectionHeader}><HubIcon name="book" size={21} /><View style={s.sectionHeading}><Text accessibilityRole="header" aria-level={2} style={s.heading}>Dịch vụ thẩm định</Text><Text style={s.muted}>{single ? 'Gói dịch vụ được chọn sẵn cho dự án của bạn.' : 'Chọn gói dịch vụ phù hợp với dự án.'}</Text></View></View>
        {!packages.length && <Text role="status" style={s.muted}>Dịch vụ thẩm định hiện chưa mở đăng ký.</Text>}
        {packages.map(p => {
          const isSelected = p.id === selectedPackage;
          const content = <>
            <View style={s.packageTop}><Text style={[s.badge, !isSelected && s.unselectedBadge]}>{isSelected ? single ? 'Đã chọn sẵn' : 'Đã chọn' : 'Gói dịch vụ'}</Text>{isSelected && <HubIcon name="check" size={19} color={colors.primary} />}</View>
            <Text style={s.packageTitle}>{packageName(p)}</Text>
            <View style={s.priceRow}><Text style={s.price}>{p.price.toLocaleString('vi-VN')} ₫</Text>{p.durationInDays != null && <Text style={s.muted}>Thời hạn dịch vụ: {p.durationInDays} ngày</Text>}</View>
            <View style={s.benefits}>
              {['Chuyên viên xem xét và đánh giá dự án', 'Trao đổi trực tuyến theo lịch hẹn', 'Nhận kết quả trong hồ sơ thẩm định'].map(text => <View key={text} style={s.benefit}><HubIcon name="check" size={16} color={colors.success} /><Text style={s.body}>{text}</Text></View>)}
            </View>
          </>;
          return single ? <View key={p.id} style={[s.package, s.selected]}>{content}</View> : <Pressable key={p.id} accessibilityRole="radio" accessibilityLabel={packageName(p)} accessibilityState={{ checked: isSelected }} onPress={() => onSelect(p.id)} style={[s.package, isSelected && s.selected]}>{content}</Pressable>;
        })}
        {pages > 1 && <View style={s.pagination}><Button title="Trang trước" variant="outline" disabled={page <= 1} onPress={() => onPage(page - 1)} /><Text style={s.muted}>{page} / {pages}</Text><Button title="Trang sau" variant="outline" disabled={page >= pages} onPress={() => onPage(page + 1)} /></View>}
      </View>
      <View style={s.section}>
        <View style={s.sectionHeader}><HubIcon name="check" size={21} /><Text accessibilityRole="header" aria-level={2} style={s.heading}>Điều kiện đăng ký</Text></View>
        <View style={s.condition}><HubIcon name="check" size={18} color={colors.success} /><Text style={s.body}>Bạn là người tạo dự án đã hoàn thành.</Text></View>
        <Text style={s.muted}>Chuyên viên sẽ đưa ra kết luận sau buổi thẩm định.</Text>
      </View>
    </View>
    <View role="region" accessibilityLabel="Tóm tắt đăng ký" style={[s.section, wide && s.summary]}>
      <View style={s.sectionHeader}><HubIcon name="document" size={21} /><Text accessibilityRole="header" aria-level={2} style={s.heading}>Tóm tắt đăng ký</Text></View>
      <View style={s.summaryField}><Text style={s.muted}>Dự án</Text><Text style={s.summaryValue}>{title}</Text></View>
      <View style={s.summaryField}><Text style={s.muted}>Gói dịch vụ</Text><Text style={s.summaryValue}>{selected ? packageName(selected) : 'Chưa có gói được chọn'}</Text></View>
      <View style={s.total}><Text style={s.summaryValue}>Phí dịch vụ</Text><Text style={s.totalPrice}>{selected ? `${selected.price.toLocaleString('vi-VN')} ₫` : '—'}</Text></View>
      <View style={s.note}><View style={s.sectionHeader}><HubIcon name="info" size={17} /><Text style={s.noteTitle}>Bước tiếp theo</Text></View><Text style={s.noteText}>Chọn ngày và khung giờ thẩm định. Bạn chỉ thanh toán sau khi đã giữ lịch.</Text></View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  layout: { gap: 16, minWidth: 0 }, wide: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 12 }, summary: { width: 300 },
  section: { padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, minWidth: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionHeading: { flex: 1, minWidth: 0, gap: 4 },
  heading: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  muted: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  package: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 7, gap: 10 },
  selected: { borderColor: colors.primary, backgroundColor: '#F7FAFF' },
  packageTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { fontSize: 11, lineHeight: 18, fontWeight: '600', color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  unselectedBadge: { color: colors.textSecondary, backgroundColor: colors.background },
  packageTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: colors.textPrimary },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  price: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: colors.primary },
  benefits: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 8 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, body: { flex: 1, fontSize: 12, lineHeight: 19, color: colors.textPrimary },
  condition: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 6, backgroundColor: '#EEF8F2' },
  summaryField: { gap: 4 }, summaryValue: { fontSize: 12, lineHeight: 19, fontWeight: '500', color: colors.textPrimary },
  total: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
  totalPrice: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: colors.primary },
  note: { gap: 6, padding: 12, backgroundColor: colors.primaryLight, borderRadius: 7 }, noteTitle: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.textPrimary }, noteText: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
