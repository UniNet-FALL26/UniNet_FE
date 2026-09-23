import { StyleSheet, Text } from 'react-native';
export function GoogleMark() { return <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark}>G</Text>; }
const styles = StyleSheet.create({ mark: { color: '#4285F4', fontSize: 21, fontWeight: '800', lineHeight: 24 } });
