import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
export default function ContributionTab() {
  return <View style={styles.container}><Text style={styles.title}>Contribution</Text><Text style={styles.body}>Chưa kết nối API Contribution trong tab này. Chỉ hiển thị điểm chính thức khi backend trả về kết quả đã finalized; không tự tính điểm ở FE.</Text></View>;
}
const styles = StyleSheet.create({ container: { padding: 20, gap: 8 }, title: { fontSize: 20, fontWeight: '700', color: '#172033' }, body: { color: '#687386', lineHeight: 21 } });
