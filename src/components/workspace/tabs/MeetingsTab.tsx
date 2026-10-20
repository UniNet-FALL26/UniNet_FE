import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
export default function MeetingsTab() {
  return <View style={styles.container}><Text style={styles.title}>Cuộc họp</Text><Text style={styles.body}>Giao diện lịch họp đang chờ API CRUD meeting được xác nhận và triển khai ở backend.</Text></View>;
}
const styles = StyleSheet.create({ container: { padding: 20, gap: 8 }, title: { fontSize: 20, fontWeight: '700', color: '#172033' }, body: { color: '#687386', lineHeight: 21 } });
