const prefix = 'https://example.com/uninet-samples/';
const samples: Record<string, number> = {
  'developer-portrait.png': require('@/assets/images/profile-samples/developer-portrait.png'),
  'developer-cover.svg': require('@/assets/images/profile-samples/developer-cover.svg'),
  'developer-cover-amber.svg': require('@/assets/images/profile-samples/developer-cover-amber.svg'),
  'developer-cover-mobile.svg': require('@/assets/images/profile-samples/developer-cover-mobile.svg'),
  'developer-cover-mobile-amber.svg': require('@/assets/images/profile-samples/developer-cover-mobile-amber.svg'),
  'developer-decoration.svg': require('@/assets/images/profile-samples/developer-decoration.svg'),
  'developer-decoration-amber.svg': require('@/assets/images/profile-samples/developer-decoration-amber.svg'),
  'mobile.svg': require('@/assets/images/profile-samples/mobile.svg'),
  'web.svg': require('@/assets/images/profile-samples/web.svg'),
  'social.svg': require('@/assets/images/profile-samples/social.svg'),
  'game.svg': require('@/assets/images/profile-samples/game.svg'),
};
// Sample URLs retain the backend URL contract while resolving entirely offline.
export const profileMedia = (url?: string | null, theme?: string, mobileCover = false) => {
  if (url === `${prefix}developer-cover.svg` && mobileCover) return samples[theme === 'amber' ? 'developer-cover-mobile-amber.svg' : 'developer-cover-mobile.svg'];
  if (url === `${prefix}developer-cover.svg` && theme === 'amber') return samples['developer-cover-amber.svg'];
  return url?.startsWith(prefix) ? samples[url.slice(prefix.length)] : url ? { uri: url } : undefined;
};
export const profileHeroCover = (url?: string | null, theme?: string, compact = false) => profileMedia(url || `${prefix}developer-cover.svg`, theme, compact);
export const profileMobileDecoration = (url?: string | null, theme?: string) => !url || url === `${prefix}developer-cover.svg`
  ? samples[theme === 'amber' ? 'developer-decoration-amber.svg' : 'developer-decoration.svg'] : undefined;
export const isSampleLink = (url?: string | null) => !url || /^https?:\/\/example\.com(?:\/|$)/i.test(url);
