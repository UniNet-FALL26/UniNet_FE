import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { ProjectCover, hubColors as c } from './ProjectHubUI';

export function ProjectCard({ title, description, coverUrl, technologies, width, onOpen, accessory, footer, cover, testID, headingLevel = 2 }: {
  title: string; description?: string | null; coverUrl?: string | null; technologies: string[]; width: DimensionValue;
  onOpen?: () => void; accessory?: ReactNode; footer?: ReactNode; cover?: ReactNode; testID?: string; headingLevel?: number;
}) {
  const content = <>
    <View style={styles.cover}>{cover ?? <ProjectCover url={coverUrl ?? null} title={title} height={168} hideTitle style={{ borderRadius: 0, backgroundColor: '#E7EFFF' }} />}</View>
    <View style={styles.body}>
      <Text accessibilityRole="header" aria-level={headingLevel} numberOfLines={1} style={styles.title}>{title}</Text>
      <Text numberOfLines={2} style={styles.description}>{description}</Text>
      <View style={styles.technologies}>
        {technologies.slice(0, 3).map((technology, index) => <View key={`${technology}-${index}`} style={styles.chip}><Text numberOfLines={1} style={styles.chipText}>{technology}</Text></View>)}
        {technologies.length > 3 && <View style={styles.chip}><Text accessibilityLabel={`${technologies.length - 3} công nghệ khác`} style={styles.chipText}>+{technologies.length - 3}</Text></View>}
      </View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  </>;
  return <View testID={testID} style={[styles.card, { width }]}>
    {onOpen ? <Pressable accessibilityRole="button" accessibilityLabel={`Xem dự án ${title}`} onPress={onOpen} style={({ pressed }) => [styles.content, pressed && { opacity: 0.85 }]}>{content}</Pressable> : <View style={styles.content}>{content}</View>}
    {accessory && <View pointerEvents="box-none" style={styles.accessory}>{accessory}</View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFFFFF', boxShadow: '0 2px 6px rgba(22,39,75,0.05)' },
  content: { borderRadius: 14, overflow: 'hidden' }, cover: { height: 168, backgroundColor: '#E7EFFF' }, accessory: { position: 'absolute', top: 0, left: 0, right: 0, height: 168 },
  body: { padding: 16, gap: 8 }, title: { color: c.ink, fontSize: 16, fontWeight: '700', lineHeight: 23 },
  description: { color: c.ink, fontSize: 13, lineHeight: 20, minHeight: 40 },
  technologies: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingVertical: 8, overflow: 'hidden' },
  chip: { maxWidth: '36%', flexShrink: 1, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: c.blueWash },
  chipText: { color: c.primary, fontSize: 10, fontWeight: '600' }, footer: { gap: 8, marginTop: 8 },
});
