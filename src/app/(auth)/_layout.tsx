import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { DesktopAuthTransition } from '@/components/auth/DesktopAuthTransition';
export default function AuthLayout() {
  const wide = useWindowDimensions().width >= 900;
  return <ThemeProvider value={wide ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } } : DefaultTheme}><DesktopAuthTransition><Stack screenOptions={{ headerShown: false, ...(wide ? { animation: 'none', contentStyle: { backgroundColor: 'transparent' } } : {}) }}>
    <Stack.Screen name="welcome" /><Stack.Screen name="login" /><Stack.Screen name="register" /><Stack.Screen name="register-partner" />
    <Stack.Screen name="register-partner-details" /><Stack.Screen name="forgot-password" /><Stack.Screen name="email-sent" /><Stack.Screen name="complete-profile" />
  </Stack></DesktopAuthTransition></ThemeProvider>;
}
