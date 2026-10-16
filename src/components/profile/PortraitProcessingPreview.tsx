import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/constants/colors';

type Props = { source: string; preview?: string; processing: boolean; uploading: boolean };

export function PortraitProcessingPreview({ source, preview, processing, uploading }: Props) {
  // Start static until the system preference is known, avoiding a motion flash.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [longWait, setLongWait] = useState(false);
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    const update = (value: boolean) => { if (active) setReduceMotion(value); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      update(media.matches);
      const change = () => update(media.matches);
      media.addEventListener('change', change);
      return () => { active = false; media.removeEventListener('change', change); };
    }
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    setLongWait(false);
    if (!processing) return;
    const timer = setTimeout(() => setLongWait(true), 20000);
    return () => clearTimeout(timer);
  }, [processing, source]);
  useEffect(() => {
    sweep.setValue(0);
    if (!processing || reduceMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); sweep.stopAnimation(); };
  }, [processing, reduceMotion, source, sweep]);
  const busy = processing || uploading;
  return <View style={s.content}>
    <View style={s.comparison}>
      <View style={s.column}><Text style={s.label}>Ảnh gốc</Text><View style={s.frame}>
        <Image source={{ uri: source }} contentFit="contain" style={s.image} accessibilityLabel="Ảnh đã chọn từ máy" />
      </View></View>
      <View style={s.column}><Text style={s.label}>{preview ? 'Ảnh đã tách nền' : 'Xem trước chân dung'}</Text>
        <View style={[s.frame, s.result]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 14 }, (_, row) => <View key={row} style={s.checkerRow}>{Array.from({ length: 10 }, (_, col) => <View key={col} style={[s.tile, { backgroundColor: (row + col) % 2 ? '#E7EDF5' : '#F7FAFF' }]} />)}</View>)}</View>
          {preview ? <Image source={{ uri: preview }} contentFit="contain" style={s.image} accessibilityLabel="Ảnh chân dung tách nền trong suốt" /> : <>
            <Image source={{ uri: source }} contentFit="contain" style={[s.image, s.ghost]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <View style={s.veil} />
            {processing && !reduceMotion && <Animated.View testID="portrait-scan" pointerEvents="none" style={[s.scan, { transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [14, 228] }) }] }]}><View style={s.scanTrail} /><View style={s.scanLine} /></Animated.View>}
            <View style={s.placeholder}><View style={s.mark}><Text style={s.markText}>✦</Text></View><Text style={s.placeholderText}>{processing ? 'Đang tách nền' : 'Chưa có ảnh xem trước'}</Text></View>
          </>}
          {!!preview && <View style={s.readyBadge}><Text style={s.readyText}>✓ Nền trong suốt</Text></View>}
        </View>
      </View>
    </View>
    {busy ? <View testID="portrait-processing" accessibilityLiveRegion="polite" accessibilityRole="progressbar" accessibilityLabel={uploading ? 'Đang lưu ảnh chân dung' : longWait ? 'Ảnh vẫn đang được xử lý' : 'Đang tách nền ảnh chân dung'} style={s.status}>
      <View style={s.statusHeading}><View style={s.dot} /><Text style={s.statusTitle}>{uploading ? 'Đang lưu ảnh chân dung' : longWait ? 'Ảnh vẫn đang được xử lý' : 'Đang tách nền ảnh chân dung'}</Text><Text style={s.aiBadge}>AI</Text></View>
      <Text style={s.statusDetail}>{uploading ? 'Đang chuẩn bị ảnh để bạn sử dụng trong hồ sơ.' : longWait ? 'Thời gian xử lý có thể lâu hơn khi dịch vụ đang bận. Bạn có thể hủy và thử lại sau.' : 'Vui lòng chờ một chút. Ảnh xem trước sẽ xuất hiện tại đây.'}</Text>
      {!reduceMotion && <View style={s.track}><Animated.View style={[s.trackFill, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, 230] }) }] }]} /></View>}
    </View> : preview ? <View style={s.success}><Text style={s.successTitle}>Chân dung đã sẵn sàng</Text><Text style={s.statusDetail}>Kiểm tra đường viền tóc và vai trước khi xác nhận.</Text></View> : null}
  </View>;
}

const s = StyleSheet.create({
  content: { gap: 16 }, comparison: { flexDirection: 'row', gap: 12 }, column: { flex: 1, minWidth: 0, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  frame: { height: 260, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  result: { borderColor: '#BDDBFF' }, image: { width: '100%', height: '100%' }, ghost: { opacity: 0.22 },
  checkerRow: { flex: 1, flexDirection: 'row' }, tile: { flex: 1 }, veil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(234,243,255,0.42)' },
  scan: { position: 'absolute', top: 0, left: 0, right: 0, height: 28 }, scanTrail: { height: 26, backgroundColor: 'rgba(23,105,224,0.10)' }, scanLine: { height: 2, backgroundColor: colors.primary },
  placeholder: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 8 },
  mark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#BDDBFF' },
  markText: { fontSize: 26, color: colors.primary }, placeholderText: { color: colors.navy, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  readyBadge: { position: 'absolute', bottom: 8, alignSelf: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.surface }, readyText: { color: colors.success, fontSize: 10, fontWeight: '600' },
  status: { padding: 14, gap: 8, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#BDDBFF' },
  statusHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  statusTitle: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700', color: colors.navy }, aiBadge: { fontSize: 10, fontWeight: '700', color: colors.primary, backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4 },
  statusDetail: { fontSize: 12, lineHeight: 18, color: colors.textSecondary }, track: { height: 3, marginTop: 4, overflow: 'hidden', backgroundColor: '#D2E4FC', borderRadius: 2 }, trackFill: { width: 80, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  success: { gap: 4, paddingVertical: 4 }, successTitle: { fontSize: 13, fontWeight: '600', color: colors.success },
});
