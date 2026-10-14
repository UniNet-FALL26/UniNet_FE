import type { PortfolioResponse } from '@/types/portfolio';
import { getProfileTemplate, getProfileTheme } from '@/data/profile-templates';

export function profileEditorPayload(data: PortfolioResponse) {
  return { profile: { fullName: data.profile.fullName, nickname: data.profile.nickname, avatarUrl: data.profile.avatarUrl, coverUrl: data.profile.coverUrl, bio: data.profile.bio }, portfolio: data.portfolio };
}

export function updateProfileAppearance(data: PortfolioResponse, templateId: string, themeId?: string): PortfolioResponse {
  const template = getProfileTemplate(templateId);
  const theme = getProfileTheme(template.id, themeId);
  return { ...data, portfolio: { ...data.portfolio, appearance: { ...data.portfolio.appearance,
    profile: { ...data.portfolio.appearance.profile, template: template.id, theme: theme.id } } } };
}

export function createProfileDraft(data: PortfolioResponse, templateId?: string, themeId?: string): PortfolioResponse {
  const saved = data.portfolio.appearance.profile;
  const template = templateId || saved.template;
  return updateProfileAppearance(data, template, themeId || (template === saved.template ? saved.theme : undefined));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function isProfileDraftDirty(draft: PortfolioResponse, baseline: PortfolioResponse): boolean {
  return JSON.stringify(canonical(profileEditorPayload(draft))) !== JSON.stringify(canonical(profileEditorPayload(createProfileDraft(baseline))));
}
