import { useEffect, useRef } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { colors } from '@/constants/colors';

const rowHeight = 28, visibleRows = 7, inset = rowHeight * 3;
export function TimeWheel({ label, values, value, onChange }: { label: 'Giờ' | 'Phút'; values: number[]; value: number; onChange: (value: number) => void }) {
  const scroll = useRef<ScrollView>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = Math.max(values.indexOf(value), 0);
  const repeated = [...values, ...values, ...values];
  useEffect(() => {
    scroll.current?.scrollTo({ y: (values.length + selectedIndex) * rowHeight, animated: false });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [selectedIndex, values]);
  const choose = (index: number) => {
    if (timer.current) clearTimeout(timer.current);
    const normalized = (index % values.length + values.length) % values.length;
    if (values[normalized] !== value) onChange(values[normalized]);
    else if (index < values.length || index >= values.length * 2) {
      scroll.current?.scrollTo({ y: (values.length + normalized) * rowHeight, animated: false });
    }
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / rowHeight);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => choose(index), 140);
  };
  return <View style={s.column}>
    <View style={s.label}><SymbolView name={{ ios: label === 'Giờ' ? 'clock' : 'stopwatch', android: label === 'Giờ' ? 'schedule' : 'timer', web: label === 'Giờ' ? 'schedule' : 'timer' }} size={16} tintColor={colors.primary} /><Text style={s.labelText}>{label}</Text></View>
    <View style={s.wheel}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Giảm ${label.toLowerCase()}`} onPress={() => choose(selectedIndex - 1)} style={({ pressed }) => [s.arrow, pressed && s.hover]}><SymbolView name={{ ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }} size={21} tintColor={colors.textSecondary} /></Pressable>
      <View style={s.viewport}>
        <View pointerEvents="none" style={s.selection} />
        <ScrollView ref={scroll} testID={`time-wheel-${label === 'Giờ' ? 'hour' : 'minute'}`} showsVerticalScrollIndicator={false} nestedScrollEnabled snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={16} onScroll={settle} contentContainerStyle={s.items}>
          {repeated.map((number, index) => {
            const difference = Math.abs(values.indexOf(number) - selectedIndex);
            const distance = Math.min(difference, values.length - difference);
            const selected = number === value;
            return <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${label} ${String(number).padStart(2, '0')}`} accessibilityState={{ selected }} aria-hidden={index < values.length || index >= values.length * 2} tabIndex={index === values.length + selectedIndex ? 0 : -1} onPress={() => choose(index)} style={s.item}><Text style={[s.itemText, distance >= 3 && s.faded, selected && s.selectedText]}>{String(number).padStart(2, '0')}</Text></Pressable>;
          })}
        </ScrollView>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Tăng ${label.toLowerCase()}`} onPress={() => choose(selectedIndex + 1)} style={({ pressed }) => [s.arrow, pressed && s.hover]}><SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={21} tintColor={colors.textSecondary} /></Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  column: { flex: 1, maxWidth: 126, minWidth: 80, backgroundColor: colors.primaryLight, borderRadius: 12 }, label: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 32 }, labelText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  wheel: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' }, arrow: { minHeight: 36, alignItems: 'center', justifyContent: 'center' }, hover: { backgroundColor: colors.primaryLight },
  viewport: { height: rowHeight * visibleRows, overflow: 'hidden' }, items: { paddingVertical: inset }, selection: { position: 'absolute', left: 5, right: 5, top: inset, height: rowHeight, borderRadius: 7, backgroundColor: '#D6E6FF' },
  item: { height: rowHeight, alignItems: 'center', justifyContent: 'center' }, itemText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' }, faded: { opacity: 0.32 }, selectedText: { fontSize: 20, fontWeight: '700', color: colors.primary },
});
