import { StyleSheet, Text, View, type TextProps } from 'react-native';
import { colors } from '@/constants/colors';
import type { PortfolioProject } from '@/types/portfolio';

function isVerifiedProject(project: PortfolioProject) {
  const status = project.verification?.status;
  return !!project.projectId && (status === 1 || status === 'Verified');
}

export function PortfolioProjectTitle({ project, style, ...props }: Omit<TextProps, 'children'> & { project: PortfolioProject }) {
  if (!isVerifiedProject(project)) return <Text {...props} style={style}>{project.title}</Text>;
  return <View style={styles.titleRow}>
    <Text {...props} style={[style, styles.title]}>{project.title}</Text>
    <Text style={styles.verified}>Đạt thẩm định</Text>
  </View>;
}

export function PortfolioProjectDetails({ project, color }: { project: PortfolioProject; color: string }) {
  if (!project.projectId) return null;
  const status = project.verification?.status;
  const verificationLabel = status === 2 || status === 'Failed' || status === 'Rejected' ? 'Không đạt thẩm định'
    : status === 3 || status === 'Cancelled' || status === 'Canceled' ? 'Hồ sơ thẩm định đã hủy'
    : 'Đã có kết quả thẩm định';
  const completedDate = project.completedAt?.slice(0, 10);
  const date = completedDate && /^\d{4}-\d{2}-\d{2}$/.test(completedDate) ? completedDate.split('-').reverse().join('/') : null;
  const style = { color, fontSize: 12, lineHeight: 18 };

  return <View style={{ gap: 4 }}>
    {project.featured && <Text style={[style, { fontWeight: '700' }]}>Dự án nổi bật</Text>}
    {typeof project.role === 'string' && !!project.role && <Text style={style}>Vai trò: {project.role}</Text>}
    {!!date && <Text style={style}>Hoàn thành: {date}</Text>}
    {!!project.personalContribution && <Text style={style}>Đóng góp: {project.personalContribution}</Text>}
    {!!project.verification && !isVerifiedProject(project) && <Text style={style}>{verificationLabel}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, rowGap: 4 },
  title: { flexShrink: 1 },
  verified: {
    color: '#166534', backgroundColor: colors.projectCompletedBackground, borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2, fontSize: 14, lineHeight: 19, fontWeight: '700',
  },
});
