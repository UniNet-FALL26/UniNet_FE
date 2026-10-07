import type { ProfileTheme } from '@/types/portfolio';

export type LandscapeTheme = ProfileTheme & {
  heroBackgroundImage: number; ctaBackgroundImage: number; heroOverlay: string;
  surfaceSoft: string; glow: string; timeline: string; timelineSoft: string;
  skillActive: string; ctaBackground: string; footerBackground: string;
};
const shared = { surface: '#FFFFFF', text: '#14203B', muted: '#526079', heroText: '#FFFFFF', heroMuted: '#DAE3EF', heroOverlay: '#07132396' };
export const developerLandscapeThemes: LandscapeTheme[] = [
  { ...shared, id: 'blue', name: 'Blue Mountain', swatch: '#398CF4', accent: '#71BFFF', accentStrong: '#1554B6', accentSoft: '#EAF3FF', onAccent: '#0B2948',
    heroBackground: '#122841', heroPanel: '#172F49', heroBorder: '#516D8B', page: '#F6FAFF', border: '#DCE8F6',
    surfaceSoft: '#EFF5FC', glow: '#398CF440', timeline: '#2368CD', timelineSoft: '#EAF3FF', skillActive: '#1554B6', ctaBackground: '#122841', footerBackground: '#0B1B30',
    heroBackgroundImage: require('@/assets/images/profile-landscape/blue.svg'), ctaBackgroundImage: require('@/assets/images/profile-landscape/blue.svg') },
  { ...shared, id: 'pink', name: 'Pink Sunset', swatch: '#ED68CE', accent: '#FFA0E2', accentStrong: '#A21C7D', accentSoft: '#FCECF8', onAccent: '#48203F',
    heroBackground: '#2C203E', heroPanel: '#3A2A4B', heroBorder: '#86658E', page: '#FFFAFE', border: '#F0DFF0',
    surfaceSoft: '#FBF1F9', glow: '#ED68CE40', timeline: '#B6298D', timelineSoft: '#FCECF8', skillActive: '#A21C7D', ctaBackground: '#2C203E', footerBackground: '#21182F',
    heroBackgroundImage: require('@/assets/images/profile-landscape/pink.svg'), ctaBackgroundImage: require('@/assets/images/profile-landscape/pink.svg') },
  { ...shared, id: 'mint', name: 'Mint Forest', swatch: '#6DE5CE', accent: '#89F4DC', accentStrong: '#006B60', accentSoft: '#E5F8F3', onAccent: '#123D36',
    heroBackground: '#122D32', heroPanel: '#193D43', heroBorder: '#507D80', page: '#F6FCFA', border: '#DDEEE9',
    surfaceSoft: '#EDF7F4', glow: '#6DE5CE40', timeline: '#008476', timelineSoft: '#E5F8F3', skillActive: '#006B60', ctaBackground: '#122D32', footerBackground: '#0C2229',
    heroBackgroundImage: require('@/assets/images/profile-landscape/mint.svg'), ctaBackgroundImage: require('@/assets/images/profile-landscape/mint.svg') },
];
export const getLandscapeTheme = (id: string) => developerLandscapeThemes.find(theme => theme.id === id) ?? developerLandscapeThemes[0];
