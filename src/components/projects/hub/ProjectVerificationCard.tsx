import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, HubPanel, hubColors as c } from './ProjectHubUI';

export function ProjectVerificationCard({ project }: { project: HubProject }) {
  const completed = project.status === 2;
  return <HubPanel compact title="Thẩm định dự án" icon="check">
    <Text style={styles.description}>Giúp dự án của bạn được nhìn nhận từ góc độ chuyên môn và làm nổi bật giá trị đã tạo ra.</Text>
    <View style={styles.benefits}>{[
      'Nhận đánh giá từ chuyên gia',
      'Hiểu điểm mạnh và hướng cải thiện',
      'Tăng độ tin cậy cho hồ sơ dự án',
    ].map(text => <View key={text} style={styles.benefit}><HubIcon name="check" size={15} /><Text style={styles.benefitText}>{text}</Text></View>)}</View>
    {completed && project.isOwner ? <HubAction compact title="Thẩm định dự án" icon="check" variant="primary" onPress={() => router.push({ pathname: '/group/verification/[id]', params: { id: project.id } } as never)} />
      : <Text style={styles.hint}>{completed ? 'Chủ dự án có thể đăng ký thẩm định.' : 'Bạn có thể đăng ký thẩm định sau khi dự án hoàn thành.'}</Text>}
  </HubPanel>;
}
const styles = StyleSheet.create({
  description: { color: c.textSecondary, fontSize: 12, lineHeight: 19 },
  benefits: { gap: 9, paddingVertical: 4 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  benefitText: { flex: 1, minWidth: 0, color: c.ink, fontSize: 12, lineHeight: 18 },
  hint: { color: c.textSecondary, fontSize: 11, lineHeight: 17, padding: 10, borderRadius: 8, backgroundColor: c.blueWash },
});
