import type { PortfolioResponse } from '@/types/portfolio';
export const profileEditFields = {
  fullName: { label: 'Họ và tên', scope: 'profile', max: 255, required: true },
  nickname: { label: 'Biệt danh', scope: 'profile', max: 100, required: true },
  bio: { label: 'Giới thiệu', scope: 'profile', max: 2000, multiline: true },
  avatarUrl: { label: 'Ảnh đại diện', scope: 'profile', max: 2048, kind: 'url' },
  coverUrl: { label: 'Ảnh bìa', scope: 'profile', max: 2048, kind: 'url' },
  headline: { label: 'Chức danh', scope: 'portfolio', max: 255 },
  contactEmail: { label: 'Email liên hệ', scope: 'portfolio', max: 255, kind: 'email' },
  yearsOfExperience: { label: 'Năm kinh nghiệm', scope: 'portfolio', max: 80, kind: 'number' },
  gpa: { label: 'GPA tại trường', scope: 'portfolio', max: 20 },
} as const;
export type ProfileEditField = keyof typeof profileEditFields;
export type ProfileImageTarget = { section: 'projects' | 'articles' | 'certificates'; index: number };
export function updateProfileImage(data: PortfolioResponse, target: ProfileImageTarget, input: string): PortfolioResponse {
  const items = data.portfolio[target.section];
  if (!Number.isInteger(target.index) || target.index < 0 || target.index >= items.length) throw new Error('Không tìm thấy mục cần đổi ảnh.');
  const validated = updateProfileField(data, 'avatarUrl', input).profile.avatarUrl;
  const key = target.section === 'certificates' ? 'logoUrl' : 'coverUrl';
  return { ...data, portfolio: { ...data.portfolio, [target.section]: items.map((item, index) => index === target.index ? { ...item, [key]: validated } : item) } };
}
export function profileFieldValue(data: PortfolioResponse, field: ProfileEditField): string {
  const definition = profileEditFields[field];
  const source = data[definition.scope] as unknown as Record<string, unknown>;
  const value = source[field];
  if (value == null && field === 'bio') return data.portfolio.careerObjective ?? '';
  if (value == null && field === 'yearsOfExperience') return String(portfolioMetrics(data.portfolio).years);
  if (value == null && field === 'gpa') return portfolioMetrics(data.portfolio).gpa ?? '';
  return value == null ? '' : String(value);
}
export function updateProfileField(data: PortfolioResponse, field: ProfileEditField, input: string): PortfolioResponse {
  const definition = profileEditFields[field];
  const value = input.trim();
  if ('required' in definition && definition.required && !value) throw new Error(`Vui lòng nhập ${definition.label.toLowerCase()}.`);
  let result: string | number | null = value || null;
  if ('kind' in definition && definition.kind === 'number') {
    result = value ? Number(value) : null;
    if (result !== null && (!Number.isFinite(result) || result < 0 || result > definition.max)) throw new Error('Số năm kinh nghiệm phải từ 0 đến 80.');
  } else {
    if (value.length > definition.max) throw new Error(`${definition.label} quá dài.`);
    if (value && 'kind' in definition && definition.kind === 'url') {
      let url: URL; try { url = new URL(value); } catch { throw new Error('Vui lòng nhập liên kết ảnh HTTP hoặc HTTPS hợp lệ.'); }
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Vui lòng nhập liên kết ảnh HTTP hoặc HTTPS hợp lệ.');
    }
    if (value && 'kind' in definition && definition.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Email liên hệ không hợp lệ.');
  }
  return { ...data, [definition.scope]: { ...data[definition.scope], [field]: result } };
}
export function portfolioMetrics(data: PortfolioResponse['portfolio']) {
  return {
    projects: data.projects.length,
    technologies: new Set(data.skills.map(skill => (skill.skillId || skill.name.trim().toLowerCase()))).size,
    years: data.yearsOfExperience ?? Math.max(0, ...data.skills.map(skill => skill.yearsOfExperience ?? 0)),
    gpa: data.gpa ?? data.education.find(item => item.gpa?.trim())?.gpa ?? null,
  };
}
