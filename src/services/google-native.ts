import { Platform } from 'react-native';

export async function getGoogleIdToken(): Promise<string | null> {
  if (Platform.OS !== 'android') throw new Error('Đăng nhập Google hiện hỗ trợ web và Android.');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) throw new Error('Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.');
  // Load only on user interaction so Expo Go / an older installed build can still open the login screen.
  let sdk: typeof import('react-native-nitro-google-signin');
  try { sdk = await import('react-native-nitro-google-signin'); }
  catch { throw new Error('Vui lòng cập nhật bản cài Android để sử dụng đăng nhập Google.'); }
  try {
    sdk.GoogleOneTapSignIn.configure({ webClientId, offlineAccess: false });
    await sdk.GoogleOneTapSignIn.checkPlayServices();
    const response = await sdk.GoogleOneTapSignIn.presentExplicitSignIn();
    if (sdk.isCancelledResponse(response)) return null;
    if (!sdk.isSuccessResponse(response) || !response.data.idToken) throw new Error('Missing Google credential');
    return response.data.idToken;
  } catch (cause) {
    if (sdk.isErrorWithCode(cause)) {
      if (cause.code === sdk.statusCodes.SIGN_IN_CANCELLED) return null;
      if (cause.code === sdk.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Vui lòng cài đặt hoặc cập nhật Dịch vụ Google Play rồi thử lại.');
      if (cause.code === sdk.statusCodes.DEVELOPER_ERROR) throw new Error('Đăng nhập Google chưa được cấu hình đúng cho bản cài Android này.');
    }
    throw new Error('Không đăng nhập được với Google. Vui lòng thử lại.');
  }
}
