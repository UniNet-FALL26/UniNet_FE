// Set the public web origin before building to enable verified HTTPS app links.
module.exports = ({ config }) => {
  const fs = require('node:fs');
  const androidFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  const iosFile = process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist';
  const androidReady = fs.existsSync(androidFile), iosReady = fs.existsSync(iosFile);
  config = { ...config, extra: { ...config.extra, firebaseAndroidEnabled: androidReady, firebaseIosEnabled: iosReady },
    plugins: ['./plugins/with-chat-notifications', ...(config.plugins || []), 'expo-video', 'expo-sharing', ['expo-notifications', { defaultChannel: 'uninet-messages', color: '#1769E0' }],
      ['expo-build-properties', { ios: androidReady || iosReady ? { useFrameworks: 'static' } : {} }],
      ...(androidReady || iosReady ? ['@react-native-firebase/app', '@react-native-firebase/messaging', 'react-native-nitro-google-signin'] : [])],
    android: { ...config.android, ...(androidReady ? { googleServicesFile: androidFile } : {}) },
    ios: { ...config.ios, ...(iosReady ? { googleServicesFile: iosFile, bundleIdentifier: config.ios?.bundleIdentifier || 'com.uninet.mobile' } : {}) } };
  const origin = process.env.EXPO_PUBLIC_APP_ORIGIN;
  if (!origin) return { ...config, plugins: [...(config.plugins || []), 'expo-secure-store'] };
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('EXPO_PUBLIC_APP_ORIGIN must be an HTTPS origin without a path.');
  return {
    ...config,
    plugins: [...(config.plugins || []), 'expo-secure-store'],
    ios: { ...config.ios, associatedDomains: [...(config.ios?.associatedDomains || []), `applinks:${url.hostname}`] },
    android: { ...config.android, intentFilters: [...(config.android?.intentFilters || []), {
      action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'],
      data: [{ scheme: 'https', host: url.hostname, pathPrefix: '/payment/result' }, { scheme: 'https', host: url.hostname, pathPrefix: '/assessor-onboarding/' }, { scheme: 'https', host: url.hostname, pathPrefix: '/messages' }],
    }] },
  };
};
