import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, HubPanel, hubColors as c } from './ProjectHubUI';

export function ProjectVerificationCard({ project }: { project: HubProject }) {
  const completed = project.status === 2;
  return <HubPanel compact title="Thẩm định dự án" icon="check">
    <Text style={styles.description}>Giúp dự án của bạn được nhìn nhận từ góc độ chuyên môn và làm nổi bật giá trị đã tạo ra.</Text>
    <View style={styles.benefits}>{[
      'Nhận đánh giá chuyên sâu từ chuyên gia',
      'Hiểu rõ điểm mạnh và lộ trình cải thiện',
      'Tăng độ tin cậy và giá trị hồ sơ dự án',
    ].map(text => <View key={text} style={styles.benefit}><View style={styles.checkCircle}><HubIcon name="check" size={13} color="#198046" /></View><Text style={styles.benefitText}>{text}</Text></View>)}</View>
    {completed && project.isOwner ? <HubAction compact title="Thẩm định dự án" icon="check" variant="primary" onPress={() => router.push({ pathname: '/group/verification/[id]', params: { id: project.id } } as never)} />
      : <Text style={styles.hint}>{completed ? 'Chủ dự án có thể đăng ký thẩm định.' : 'Bạn có thể đăng ký thẩm định sau khi dự án hoàn thành.'}</Text>}
  </HubPanel>;
}

const styles = StyleSheet.create({
  description: { color: c.textSecondary, fontSize: 13, lineHeight: 20 },
  benefits: { gap: 10, paddingVertical: 6 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E6F7EC', alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, minWidth: 0, color: c.ink, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  hint: { color: c.textSecondary, fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 10, backgroundColor: c.blueWash },
});
