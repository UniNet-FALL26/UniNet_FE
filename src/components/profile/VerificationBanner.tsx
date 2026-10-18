import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { compact: boolean; onVerify: () => void; onDismiss: () => void };

export function VerificationBanner({ compact, onVerify, onDismiss }: Props) {
  return <View testID="verification-banner" style={[s.banner, compact && s.compact]}>
    <View pointerEvents="none" style={s.glow} />
    <View accessible={false} aria-hidden style={s.art}>
      <View style={s.halo} />
      <Text style={s.sparkle}>✦</Text><Text style={s.smallSparkle}>✦</Text>
      <View style={s.card}>
        <View style={s.binding} />
        <View style={s.person} /><View style={s.shoulders} />
        <View style={s.line} /><View style={[s.line, s.shortLine]} />
      </View>
      <View style={s.seal}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={18} tintColor="#FFFFFF" /></View>
    </View>
    <View style={s.copy}>
      <Text accessibilityRole="header" style={s.title}>Vui lòng xác minh tài khoản</Text>
      <Text style={s.description}>Xác minh tài khoản để hoàn thiện thông tin, sử dụng đầy đủ tính năng và bảo vệ tài khoản của bạn.</Text>
    </View>
    <View style={[s.actions, compact && s.compactActions]}>
      <View style={[s.hint, compact && s.compactHint]}>
        <View style={s.infoIcon}><Text style={s.infoLetter}>i</Text></View>
        <Text style={s.hintText}>Việc xác minh chỉ mất vài phút{compact ? ' ' : '\n'}và rất đơn giản.</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Xác minh ngay" onPress={onVerify} hitSlop={6} style={({ pressed }) => [s.verify, pressed && s.pressed]}>
        <Text style={s.verifyText}>Xác minh ngay</Text>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} tintColor="#FFFFFF" />
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo xác minh" onPress={onDismiss} hitSlop={4} style={({ pressed }) => [s.close, compact && s.compactClose, pressed && s.pressed]}>
      <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={19} tintColor="#7D7E87" />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  banner: { flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FFCFD8', borderRadius: 14, backgroundColor: '#FFF7F9', boxShadow: '0 4px 14px rgba(237, 25, 68, 0.06)' },
  compact: { flexWrap: 'wrap', gap: 8, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 10 },
  glow: { position: 'absolute', width: 280, height: 110, borderRadius: 140, backgroundColor: '#FFEAF0', bottom: -85, right: 80, transform: [{ rotate: '-8deg' }] },
  art: { width: 68, height: 54, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.82 }] },
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
  copy: { flex: 1, minWidth: 120, gap: 3 },
  title: { color: '#BF1230', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  description: { color: '#555963', fontSize: 11, lineHeight: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compactActions: { width: '100%', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, borderLeftWidth: 1, borderLeftColor: '#FFD6DF', paddingLeft: 12, paddingVertical: 6 },
  compactHint: { flex: 1, minWidth: 110, borderLeftWidth: 0, paddingLeft: 0 },
  hintText: { flexShrink: 1, color: '#555963', fontSize: 9, lineHeight: 13 },
  infoIcon: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FF6476', alignItems: 'center', justifyContent: 'center' },
  infoLetter: { color: '#FF6476', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  verify: { minHeight: 32, borderRadius: 8, backgroundColor: '#ED073B', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 3px 8px rgba(237, 7, 59, 0.16)' },
  verifyText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  close: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  compactClose: { position: 'absolute', right: 0, top: 0, height: 32, marginLeft: 0 },
  pressed: { opacity: 0.7 },
});
