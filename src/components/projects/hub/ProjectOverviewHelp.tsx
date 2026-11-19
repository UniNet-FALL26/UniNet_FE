import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { overviewGuides, type OverviewGuideId } from '@/utils/project-overview-content';
import { HubAction, HubModal, hubColors as c } from './ProjectHubUI';

export function ProjectOverviewHelp({ section }: { section: OverviewGuideId }) {
  const [open, setOpen] = useState(false);
  const guide = overviewGuides[section];
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Hướng dẫn: ${guide.title}`} onPress={() => setOpen(true)} hitSlop={10} style={styles.button}><Text accessible={false} style={styles.mark}>!</Text></Pressable>
    {open && <HubModal compact wide={false} title={`Hướng dẫn: ${guide.title}`} onClose={() => setOpen(false)} footer={<HubAction compact title="Đã hiểu" onPress={() => setOpen(false)} variant="primary" />}>
      <Text style={styles.purpose}>{guide.purpose}</Text>
      <Text accessibilityRole="header" aria-level={3} style={styles.heading}>Nên viết những gì?</Text>
      <View style={{ gap: 10 }}>{guide.prompts.map((prompt, index) => <View key={prompt} style={styles.row}><Text style={styles.number}>{index + 1}.</Text><Text style={styles.body}>{prompt}</Text></View>)}</View>
      <View style={styles.example}><Text accessibilityRole="header" aria-level={3} style={styles.heading}>Ví dụ minh họa</Text><Text style={styles.body}>{guide.example}</Text></View>
      <Text style={styles.note}>Điều chỉnh ví dụ theo dự án thực tế của bạn; nội dung này không tự điền vào dự án.</Text>
    </HubModal>}
  </>;
}
const styles = StyleSheet.create({ button: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, mark: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, fontWeight: '700' }, purpose: { fontSize: 13, lineHeight: 21, color: c.ink, marginBottom: 16 }, heading: { fontSize: 13, fontWeight: '700', color: c.ink, marginBottom: 8 }, row: { flexDirection: 'row', gap: 8 }, number: { fontSize: 13, lineHeight: 21, color: c.primary, fontWeight: '600' }, body: { flexShrink: 1, fontSize: 13, lineHeight: 21, color: c.ink }, example: { backgroundColor: c.blueWash, padding: 14, borderRadius: 9, marginTop: 18 }, note: { fontSize: 11, lineHeight: 17, color: c.textSecondary, marginTop: 12 } });
