import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
export default function RoomsTab() {
  return <View style={styles.container}><Text style={styles.title}>Phòng trao đổi</Text><Text style={styles.body}>Tab này hiện là placeholder. API room/chat và nhà cung cấp call/video-call chưa có trong contract backend đã kiểm tra; không tạo dữ liệu giả hoặc call session lưu DB.</Text></View>;
}
const styles = StyleSheet.create({ container: { padding: 20, gap: 8 }, title: { fontSize: 20, fontWeight: '700', color: '#172033' }, body: { color: '#687386', lineHeight: 21 } });
