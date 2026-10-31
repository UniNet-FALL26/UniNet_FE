// Set the public web origin before building to enable verified HTTPS app links.
module.exports = ({ config }) => {
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
      data: [{ scheme: 'https', host: url.hostname, pathPrefix: '/payment/result' }],
    }] },
  };
};
