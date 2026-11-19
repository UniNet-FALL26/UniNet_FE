import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const desktopHeaderStyles = StyleSheet.create({
  frame: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E0EDFD',
    borderRadius: 18,
    zIndex: 2,
    boxShadow: '0 5px 22px rgba(39, 110, 190, 0.07)',
    experimental_backgroundImage: 'linear-gradient(115deg, #F0F7FF 0%, #FFFFFF 22%, #FFFFFF 80%, #F0F7FF 100%)',
  },
});
