import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { compact: boolean; onVerify: () => void; onDismiss: () => void };

export function VerificationBanner({ compact, onVerify, onDismiss }: Props) {
  return <View testID="verification-banner" style={[s.banner, compact && s.compact]}>
    <View style={[s.artSlot, compact && s.compactArtSlot]}>
<View accessible={false} aria-hidden style={[s.art, compact && s.compactArt]}>
      <View style={s.halo} />
      <Text style={s.sparkle}>✦</Text><Text style={s.smallSparkle}>✦</Text>
      <View style={s.card}>
        <View style={s.binding} />
        <View style={s.person} /><View style={s.shoulders} />
        <View style={s.line} /><View style={[s.line, s.shortLine]} />
      </View>
      <View style={s.seal}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={18} tintColor="#FFFFFF" /></View>
    </View>
    </View>
    <View style={s.copy}>
      <Text accessibilityRole="header" style={[s.title, compact && s.compactTitle]}>Vui lòng xác minh tài khoản</Text>
      <Text numberOfLines={2} style={[s.description, compact && s.compactDescription]}>{compact ? 'Hoàn thiện thông tin và bảo vệ tài khoản.' : 'Xác minh tài khoản để hoàn thiện thông tin, sử dụng đầy đủ tính năng và bảo vệ tài khoản của bạn.'}</Text>
    </View>
    {!compact && <View style={s.hint}>
      <View accessible={false} style={s.infoIcon}><Text style={s.infoLetter}>i</Text></View>
      <Text style={s.hintText}>Việc xác minh chỉ mất vài phút{'\n'}và rất đơn giản.</Text>
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Xác minh ngay" onPress={onVerify} style={({ pressed }) => [s.verify, compact && s.compactVerify, pressed && s.pressed]}>
      <Text style={[s.verifyText, compact && s.compactVerifyText]}>{compact ? 'Xác minh' : 'Xác minh ngay'}</Text>
      {!compact && <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor="#FFFFFF" />}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo xác minh" onPress={onDismiss} style={({ pressed }) => [s.close, compact && s.compactClose, pressed && s.pressed]}>
      <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={compact ? 13 : 16} tintColor="#7D7E87" />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  banner: { flex: 1, minWidth: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#FFCFD8', borderRadius: 12, backgroundColor: '#FFF7F9' },
  compact: { gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  art: { width: 68, height: 54, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.62 }] },
  halo: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFE2E8', transform: [{ rotate: '-15deg' }] },
  card: { width: 43, height: 55, borderRadius: 6, backgroundColor: '#FF3157', borderWidth: 2, borderColor: '#FF8098', alignItems: 'center', paddingTop: 5, transform: [{ rotate: '-10deg' }], boxShadow: '3px 4px 0 #D91841, -4px -2px 0 #FFFFFF, 0 6px 12px #F8A8B7' },
  binding: { position: 'absolute', left: 3, top: 0, bottom: 0, width: 2, backgroundColor: '#FF97AB' },
  person: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF' },
  shoulders: { width: 18, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: '#FFFFFF', marginTop: 2, marginBottom: 5 },
  line: { width: 27, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF', marginBottom: 3 },
  shortLine: { width: 20, alignSelf: 'flex-start', marginLeft: 6 },
  seal: { position: 'absolute', right: 8, bottom: 0, width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFB51F', borderWidth: 2, borderColor: '#FFE5A4', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 7px #F4C27A' },
  sparkle: { position: 'absolute', right: 9, top: -5, color: '#FF886E', fontSize: 17 },
  smallSparkle: { position: 'absolute', left: 2, bottom: 0, color: '#FF886E', fontSize: 13 },
  artSlot: { width: 52, height: 46, alignItems: 'center', justifyContent: 'center' },
  compactArtSlot: { width: 28, height: 32 },
  compactArt: { transform: [{ scale: 0.42 }] },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: '#BF1230', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  compactTitle: { fontSize: 10, lineHeight: 13 },
  description: { color: '#555963', fontSize: 10, lineHeight: 14 },
  compactDescription: { fontSize: 9, lineHeight: 12 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, borderLeftWidth: 1, borderLeftColor: '#FFD6DF', paddingLeft: 10 },
  hintText: { fontSize: 8, lineHeight: 12, color: '#555963' },
  infoIcon: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#FF6476', alignItems: 'center', justifyContent: 'center' },
  infoLetter: { fontSize: 10, lineHeight: 12, fontWeight: '700', color: '#FF6476' },
  verify: { minHeight: 34, flexShrink: 0, borderRadius: 7, backgroundColor: '#ED073B', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  verifyText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  compactVerify: { minHeight: 26, paddingHorizontal: 7, borderRadius: 6 },
  compactVerifyText: { fontSize: 10 },
  close: { width: 28, minHeight: 34, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  compactClose: { width: 22, minHeight: 26 },
  pressed: { opacity: 0.7 },
});
