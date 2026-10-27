import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'qrcode';

// Encode locally so payment details never go to an external QR image service.
export function PaymentQrCode({ value }: { value: string }) {
  const modules = useMemo(() => {
    try { return QRCode.create(value, { errorCorrectionLevel: 'M' }).modules; }
    catch { return null; }
  }, [value]);
  if (!modules) return null;
  const cell = Math.max(1, Math.floor(240 / (modules.size + 8)));
  return <View accessibilityRole="image" accessibilityLabel="Mã QR chuyển khoản thanh toán PayOS" style={[styles.code, { padding: cell * 4 }]}>
    {Array.from({ length: modules.size }, (_, row) => <View key={row} style={styles.row}>
      {Array.from({ length: modules.size }, (_, col) => <View key={col} style={{ width: cell, height: cell, backgroundColor: modules.get(row, col) ? '#000000' : '#FFFFFF' }} />)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  code: { alignSelf: 'center', backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row' },
});
