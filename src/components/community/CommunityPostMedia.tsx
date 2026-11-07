import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Layout = 'single' | 'pair' | 'hero' | 'half' | 'third';
type Props = { urls: readonly string[]; onOpen: (index: number) => void };

export function CommunityPostMedia({ urls, onOpen }: Props) {
  if (!urls.length) return null;
  const tile = (index: number, layout: Layout, remaining = 0) => <Pressable
    key={index}
    testID={`community-media-tile-${index}`}
    accessibilityRole="button"
    accessibilityLabel={remaining ? `Mở ảnh ${index + 1}, còn ${remaining} ảnh khác` : `Mở ảnh ${index + 1}`}
    onPress={() => onOpen(index)}
    style={[s.tile, s[layout]]}
  >
    <Image source={{ uri: urls[index] }} resizeMode="cover" blurRadius={24} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.backdrop} />
    <Image source={{ uri: urls[index] }} resizeMode="contain" accessibilityLabel={`Ảnh bài viết ${index + 1}`} style={StyleSheet.absoluteFill} />
    {remaining > 0 && <View style={s.more}><Text style={s.moreText}>+{remaining}</Text></View>}
  </Pressable>;
  if (urls.length === 1) return tile(0, 'single');
  if (urls.length === 2) return <View style={s.grid}><View style={s.row}>{tile(0, 'pair')}{tile(1, 'pair')}</View></View>;
  return <View style={s.grid}>
    {tile(0, 'hero')}
    <View style={s.row}>
      {tile(1, urls.length === 3 ? 'half' : 'third')}
      {tile(2, urls.length === 3 ? 'half' : 'third')}
      {urls.length > 3 && tile(3, 'third', urls.length - 4)}
    </View>
  </View>;
}

const s = StyleSheet.create({
  grid: { width: '100%', gap: 3, overflow: 'hidden', borderRadius: 12, backgroundColor: '#FFF' },
  row: { flexDirection: 'row', gap: 3 },
  tile: { position: 'relative', minWidth: 0, overflow: 'hidden', backgroundColor: '#EAF0F7' },
  single: { width: '100%', height: 280 },
  pair: { flex: 1, aspectRatio: 0.85, minHeight: 220, maxHeight: 360 },
  hero: { width: '100%', aspectRatio: 2.1, minHeight: 180, maxHeight: 310 },
  half: { flex: 1, aspectRatio: 1.2, minHeight: 160, maxHeight: 260 },
  third: { flex: 1, aspectRatio: 1, minHeight: 150, maxHeight: 220 },
  backdrop: { ...StyleSheet.absoluteFill, transform: [{ scale: 1.15 }], pointerEvents: 'none' },
  more: { ...StyleSheet.absoluteFill, pointerEvents: 'none', backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFF', fontSize: 25, fontWeight: '700' },
});
