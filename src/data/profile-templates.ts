import type { ProfileTheme } from '@/types/portfolio';
import { DeveloperShowcaseThemes } from '@/components/profile/templates/developer-showcase/DeveloperShowcaseThemes';
import { developerLandscapeThemes } from '@/components/profile/templates/developer-landscape/DeveloperLandscapeThemes';

const base = { page: '#F8FBFF', surface: '#FFFFFF', text: '#111D36', muted: '#52627A', border: '#E1EAF5', onAccent: '#FFFFFF' };
export const profileTemplates: { id: string; name: string; themes: ProfileTheme[]; description?: string; defaultTheme?: string; supportedThemes?: string[] }[] = [{
  id: 'developer-modern', name: 'Developer Modern', themes: [
    { ...base, id: 'blue', name: 'Xanh công nghệ', swatch: '#2563EB', accent: '#2563EB', accentStrong: '#174EC4', accentSoft: '#EAF1FF', heroBackground: '#0C182B', heroText: '#F8FAFF', heroMuted: '#C0CCE0', heroPanel: '#14243B', heroBorder: '#293E5D' },
    { ...base, id: 'amber', name: 'Vàng cam', swatch: '#F5AA26', accent: '#D95A08', accentStrong: '#B84705', accentSoft: '#FFF2DF', heroBackground: '#FFF8EF', heroText: '#111D36', heroMuted: '#52627A', heroPanel: '#FFFFFF', heroBorder: '#F0DEC7', page: '#FFFCF7', border: '#EFE4D7' },
  ],
}, { id: 'developer-showcase', name: 'Developer Showcase', themes: DeveloperShowcaseThemes }, {
  id: 'developer-landscape', name: 'Developer Landscape',
  description: 'Hồ sơ công nghệ với Hero phong cảnh, kỹ năng và hành trình nghề nghiệp trực quan.',
  defaultTheme: 'blue', supportedThemes: ['blue', 'pink', 'mint'], themes: developerLandscapeThemes,
}];
export const getProfileTemplate = (id?: string) => profileTemplates.find(template => template.id === id) ?? profileTemplates[0];
export const getProfileTheme = (templateId?: string, themeId?: string) => {
  const template = getProfileTemplate(templateId);
  return template.themes.find(theme => theme.id === themeId) ?? template.themes[0];
};
