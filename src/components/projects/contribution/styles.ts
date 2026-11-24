import { StyleSheet } from 'react-native';
import { hubColors as c } from '../hub/ProjectHubUI';
export const contributionStyles = StyleSheet.create({
  root: { gap: 18, minWidth: 0 }, title: { color: c.ink, fontSize: 22, fontWeight: '700', lineHeight: 29 }, sub: { color: c.textSecondary, fontSize: 14, lineHeight: 22 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { minWidth: 0, padding: 20, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.surface, gap: 13 },
  heading: { color: c.ink, fontSize: 16, fontWeight: '600', lineHeight: 23 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, copy: { color: c.textSecondary, fontSize: 14, lineHeight: 22 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  stepMarker: { height: 30, width: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  next: { padding: 20, backgroundColor: c.blueWash, borderRadius: 12, gap: 12 }, error: { color: c.error, fontSize: 14, lineHeight: 22 }, success: { color: c.success, fontSize: 14, lineHeight: 22 },
  field: { borderWidth: 1, borderColor: c.line, borderRadius: 8, color: c.ink, backgroundColor: c.surface, minHeight: 48, padding: 12, fontSize: 14 },
  item: { paddingVertical: 15, gap: 9, borderBottomWidth: 1, borderColor: c.line }, small: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, technical: { color: c.textSecondary, fontSize: 12, lineHeight: 19, flexShrink: 1 },
});
