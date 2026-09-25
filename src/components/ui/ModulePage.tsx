import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

export function ModulePage({ title, description, sections }: { title: string; description: string; sections: string[] }) {
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.brand}>UNINET</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Khu vực</Text>
        <Text style={styles.sectionCount}>{sections.length} mục</Text>
      </View>
      <View style={styles.sectionList}>
        {sections.map((section, index) => <View key={section} style={styles.sectionRow}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <Text style={styles.sectionName}>{section}</Text>
        </View>)}
      </View>
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}><SymbolView name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={23} tintColor={colors.primary} /></View>
        <Text style={styles.emptyTitle}>Nội dung đang được chuẩn bị</Text>
        <Text style={styles.emptyText}>Các mục trong {title.toLowerCase()} sẽ hiển thị tại đây khi được kết nối.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 34, maxWidth: 600, width: '100%', alignSelf: 'center' },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2.2 },
  title: { color: colors.navy, fontSize: 30, lineHeight: 37, fontWeight: '800', marginTop: 9 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 9 },
  sectionHeader: { marginTop: 31, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  sectionCount: { color: colors.textMuted, fontSize: 12 },
  sectionList: { gap: 9 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionNumber: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sectionNumberText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  sectionName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  emptyCard: { marginTop: 22, borderRadius: 17, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8D8EF', backgroundColor: '#FDFEFF', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 27 },
  emptyIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: colors.navy, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
});
