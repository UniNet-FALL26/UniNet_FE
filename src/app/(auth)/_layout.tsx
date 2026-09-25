import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="welcome" /><Stack.Screen name="login" /><Stack.Screen name="register" /><Stack.Screen name="register-partner" />
    <Stack.Screen name="register-partner-details" /><Stack.Screen name="forgot-password" /><Stack.Screen name="email-sent" /><Stack.Screen name="complete-profile" />
  </Stack>;
}
