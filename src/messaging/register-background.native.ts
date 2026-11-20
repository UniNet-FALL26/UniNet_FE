import Constants from 'expo-constants';
import { Platform } from 'react-native';

if (Constants.executionEnvironment !== 'storeClient' && Constants.expoConfig?.extra?.[Platform.OS === 'ios' ? 'firebaseIosEnabled' : 'firebaseAndroidEnabled']) {
  const sdk = require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
  // Background/terminated notifications are displayed by the OS using the FCM notification payload.
  sdk.setBackgroundMessageHandler(sdk.getMessaging(), async () => {});
}
