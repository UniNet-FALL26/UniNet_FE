import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { documentPresentation } from '@/utils/chat-files';

export function ChatDocumentIcon({ name, mimeType, size = 30 }: { name: string; mimeType?: string; size?: number }) {
  const format = documentPresentation(name, mimeType);
  if (!format.known) return <SymbolView name={{ ios: 'doc', android: 'insert_drive_file', web: 'insert_drive_file' }} size={size} tintColor={format.color} />;
  return <View accessibilityLabel={`Tài liệu ${format.label}`} style={[s.paper, { width: size, height: size * 1.2, backgroundColor: format.color }]}><View style={s.fold} /><Text style={[s.label, { fontSize: size * 0.24 }]}>{format.label}</Text></View>;
}
const s = StyleSheet.create({
  paper: { borderRadius: 4, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5, overflow: 'hidden' },
  fold: { position: 'absolute', right: 0, top: 0, width: '30%', height: '25%', backgroundColor: 'rgba(255,255,255,0.35)', borderBottomLeftRadius: 4 },
  label: { color: '#FFFFFF', fontWeight: '700', letterSpacing: -0.2 },
});
