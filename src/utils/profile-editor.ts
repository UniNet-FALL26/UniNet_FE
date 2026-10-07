import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';

export type ProfileSectionId = 'basic' | 'skills' | 'projects' | 'education' | 'experience' | 'certificates' | 'activities' | 'languages' | 'articles' | 'socialLinks';
export type ProfileFormField = { key: string; label: string; kind?: 'url' | 'email' | 'number' | 'list' | 'boolean' | 'skill'; required?: boolean; multiline?: boolean; max?: number; min?: number; integer?: boolean };
export type ProfileEditorSection = { id: ProfileSectionId; title: string; fields: ProfileFormField[]; limit?: number };
const title: ProfileFormField = { key: 'title', label: 'Tên / tiêu đề', required: true, max: 255 };
const description: ProfileFormField = { key: 'description', label: 'Mô tả', multiline: true };
const organization: ProfileFormField = { key: 'organization', label: 'Đơn vị / tổ chức', max: 255 };
const url: ProfileFormField = { key: 'url', label: 'Liên kết', kind: 'url' };
const milestone = [title, organization, { key: 'period', label: 'Thời gian', max: 100 }, { key: 'startDate', label: 'Ngày bắt đầu', max: 20 }, { key: 'endDate', label: 'Ngày kết thúc', max: 20 }, description];
export const profileEditorSections: ProfileEditorSection[] = [
  { id: 'basic', title: 'Giới thiệu & liên hệ', fields: [
    { key: 'headline', label: 'Chức danh', max: 255 }, { key: 'careerObjective', label: 'Giới thiệu / mục tiêu nghề nghiệp', multiline: true },
    { key: 'location', label: 'Địa điểm', max: 255 }, { key: 'availability', label: 'Trạng thái công việc', max: 100 },
    { key: 'contactEmail', label: 'Email liên hệ', kind: 'email', max: 255 }, { key: 'cvUrl', label: 'Liên kết CV', kind: 'url' },
  ] },
  { id: 'skills', title: 'Kỹ năng', limit: 100, fields: [
    { key: 'skillId', label: 'Kỹ năng', kind: 'skill', required: true },
    { key: 'level', label: 'Mức độ (0–3)', kind: 'number', min: 0, max: 3, integer: true },
    { key: 'yearsOfExperience', label: 'Số năm kinh nghiệm', kind: 'number', min: 0, max: 80 },
  ] },
  { id: 'projects', title: 'Dự án', limit: 50, fields: [title, description, { key: 'type', label: 'Loại dự án', max: 100 }, { key: 'coverUrl', label: 'Liên kết ảnh bìa', kind: 'url' }, { key: 'technologies', label: 'Công nghệ (phân cách bằng dấu phẩy)', kind: 'list' }, url, { key: 'githubUrl', label: 'Liên kết mã nguồn', kind: 'url' }, { key: 'featured', label: 'Dự án nổi bật', kind: 'boolean' }] },
  { id: 'education', title: 'Học vấn', limit: 50, fields: [...milestone, { key: 'gpa', label: 'GPA', max: 20 }] },
  { id: 'experience', title: 'Kinh nghiệm', limit: 50, fields: milestone },
  { id: 'certificates', title: 'Chứng chỉ', limit: 50, fields: [title, { key: 'issuer', label: 'Đơn vị cấp', required: true, max: 255 }, { key: 'year', label: 'Năm cấp', max: 100 }, { key: 'logoUrl', label: 'Liên kết logo', kind: 'url' }, url] },
  { id: 'activities', title: 'Hoạt động', limit: 50, fields: [title, organization, description, { key: 'date', label: 'Thời gian', max: 100 }] },
  { id: 'languages', title: 'Ngôn ngữ', limit: 20, fields: [{ key: 'name', label: 'Ngôn ngữ', required: true, max: 100 }, { key: 'level', label: 'Trình độ', required: true, max: 100 }] },
  { id: 'articles', title: 'Bài viết', limit: 50, fields: [title, { key: 'date', label: 'Ngày đăng', max: 100 }, { key: 'coverUrl', label: 'Liên kết ảnh bìa', kind: 'url' }, { ...url, required: true }] },
  { id: 'socialLinks', title: 'Liên kết cá nhân', limit: 20, fields: [{ key: 'label', label: 'Tên liên kết', required: true, max: 100 }, { ...url, required: true }] },
];
export function profileFormValues(content: PortfolioContent, sectionId: ProfileSectionId): Record<string, string> {
  const section = profileEditorSections.find(item => item.id === sectionId)!;
  return Object.fromEntries(section.fields.map(field => [field.key, sectionId === 'basic' ? String(content[field.key as keyof PortfolioContent] ?? '') : field.kind === 'boolean' ? 'false' : '']));
}
export function addProfileEntry(content: PortfolioContent, sectionId: ProfileSectionId, values: Record<string, string>, catalog: NonNullable<PortfolioResponse['skillCatalog']>): PortfolioContent {
  const section = profileEditorSections.find(item => item.id === sectionId);
  if (!section) throw new Error('Phần hồ sơ không hợp lệ.');
  const entry: Record<string, unknown> = {};
  for (const field of section.fields) {
    const value = (values[field.key] ?? '').trim();
    if (field.required && !value) throw new Error(`Vui lòng nhập ${field.label.toLowerCase()}.`);
    if (field.kind === 'number') {
      const number = value ? Number(value) : null;
      if (number !== null && (!Number.isFinite(number) || number < (field.min ?? 0) || number > (field.max ?? Infinity) || (field.integer && !Number.isInteger(number)))) throw new Error(`${field.label} không hợp lệ.`);
      entry[field.key] = number;
    } else if (field.kind === 'boolean') entry[field.key] = value === 'true';
    else if (field.kind === 'list') {
      const items = value.split(',').map(item => item.trim()).filter(Boolean);
      if (items.length > 20 || items.some(item => item.length > 100)) throw new Error('Tối đa 20 công nghệ, mỗi tên tối đa 100 ký tự.');
      entry[field.key] = items;
    } else {
      if (value.length > (field.max ?? (field.kind === 'url' ? 2048 : 2000))) throw new Error(`${field.label} quá dài.`);
      if (value && field.kind === 'url') {
        let parsed: URL;
        try { parsed = new URL(value); } catch { throw new Error(`${field.label} phải là URL HTTP hoặc HTTPS hợp lệ.`); }
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error(`${field.label} phải là URL HTTP hoặc HTTPS hợp lệ.`);
      }
      if (value && field.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Email liên hệ không hợp lệ.');
      entry[field.key] = value || null;
    }
  }
  if (sectionId === 'basic') return { ...content, ...entry };
  const existing = content[sectionId] ?? [];
  if (existing.length >= (section.limit ?? 50)) throw new Error(`Đã đạt giới hạn mục trong ${section.title.toLowerCase()}.`);
  if (sectionId === 'skills') {
    const skill = catalog.find(item => item.id === entry.skillId);
    if (!skill) throw new Error('Vui lòng chọn kỹ năng từ danh mục.');
    if (content.skills.some(item => item.skillId === skill.id || item.name.toLowerCase() === skill.name.toLowerCase())) throw new Error('Kỹ năng này đã có trong hồ sơ.');
    Object.assign(entry, { skillId: skill.id, name: skill.name, category: skill.category, iconUrl: skill.iconUrl });
  }
  return { ...content, [sectionId]: [...existing, entry] } as PortfolioContent;
}
