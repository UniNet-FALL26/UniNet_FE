import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';

export type ProfileSkillSort = 'name' | 'name-desc' | 'category';
export function profileSkillOptions(catalog: NonNullable<PortfolioResponse['skillCatalog']>, search: string, sort: ProfileSkillSort) {
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const query = normalize(search.trim());
  return catalog.filter(item => normalize(item.name + ' ' + item.category).includes(query)).sort((a, b) => {
    const names = a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }) || a.id.localeCompare(b.id);
    return sort === 'name-desc' ? -names : sort === 'category' ? a.category.localeCompare(b.category, 'vi') || names : names;
  });
}
export function addProfileSkills(content: PortfolioContent, skillIds: readonly string[], catalog: NonNullable<PortfolioResponse['skillCatalog']>): PortfolioContent {
  const ids = [...new Set(skillIds)];
  if (!ids.length) throw new Error('Vui lòng chọn ít nhất một kỹ năng.');
  return ids.reduce((next, skillId) => addProfileEntry(next, 'skills', { skillId }, catalog), content);
}

export function profileSkillSelection(content: PortfolioContent, catalog: NonNullable<PortfolioResponse['skillCatalog']>) {
  return content.skills.map((skill, index) => {
    const match = catalog.find(item => item.id === skill.skillId || item.name.trim().toLowerCase() === skill.name.trim().toLowerCase());
    return { id: match?.id ?? skill.skillId ?? 'saved-skill:' + index, name: skill.name, category: skill.category ?? '', iconUrl: match?.iconUrl ?? skill.iconUrl ?? null };
  });
}
export function updateProfileSkills(content: PortfolioContent, skillIds: readonly string[], catalog: NonNullable<PortfolioResponse['skillCatalog']>): PortfolioContent {
  const saved = profileSkillSelection(content, catalog), selected = new Set(skillIds);
  let next = { ...content, skills: content.skills.filter((_, index) => selected.has(saved[index].id)) };
  for (const id of selected) {
    if (!saved.some(item => item.id === id)) next = addProfileEntry(next, 'skills', { skillId: id }, catalog);
  }
  return next;
}

export type ProfileSectionId = 'basic' | 'skills' | 'projects' | 'education' | 'experience' | 'certificates' | 'activities' | 'languages' | 'articles' | 'socialLinks';
export type ProfileFormField = { key: string; label: string; kind?: 'url' | 'email' | 'number' | 'list' | 'boolean' | 'skill' | 'date' | 'year'; placeholder?: string; required?: boolean; multiline?: boolean; max?: number; min?: number; integer?: boolean };
export type ProfileEditorSection = { id: ProfileSectionId; title: string; fields: ProfileFormField[]; limit?: number };
const title: ProfileFormField = { key: 'title', label: 'Tên / tiêu đề', required: true, max: 255 };
const description: ProfileFormField = { key: 'description', label: 'Mô tả', multiline: true };
const organization: ProfileFormField = { key: 'organization', label: 'Đơn vị / tổ chức', max: 255 };
const url: ProfileFormField = { key: 'url', label: 'Liên kết', kind: 'url' };
const milestone: ProfileFormField[] = [title, organization, { key: 'startDate', label: 'Ngày bắt đầu', kind: 'date', max: 20, placeholder: 'DD/MM/YYYY' }, { key: 'endDate', label: 'Ngày kết thúc', kind: 'date', max: 20, placeholder: 'DD/MM/YYYY, để trống nếu chưa kết thúc' }, description];
const educationHints: Record<string, string> = {
  title: 'VD: Cử nhân Công nghệ thông tin', organization: 'VD: Trường Đại học Bách khoa',
  description: 'VD: Chuyên ngành, thành tích hoặc hoạt động nổi bật',
};
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
  { id: 'education', title: 'Học vấn', limit: 50, fields: milestone.map(field => ({ ...field, placeholder: educationHints[field.key] ?? field.placeholder })) },
  { id: 'experience', title: 'Kinh nghiệm', limit: 50, fields: milestone },
  { id: 'certificates', title: 'Chứng chỉ', limit: 50, fields: [title, { key: 'issuer', label: 'Đơn vị cấp', required: true, max: 255 }, { key: 'year', label: 'Ngày cấp', kind: 'date', max: 20, placeholder: 'DD/MM/YYYY' }, url] },
  { id: 'activities', title: 'Hoạt động', limit: 50, fields: [title, organization, description, { key: 'date', label: 'Thời gian', kind: 'date', max: 20, placeholder: 'DD/MM/YYYY' }] },
  { id: 'languages', title: 'Ngôn ngữ', limit: 20, fields: [{ key: 'name', label: 'Ngôn ngữ', required: true, max: 100 }, { key: 'level', label: 'Trình độ', required: true, max: 100 }] },
  { id: 'articles', title: 'Bài viết', limit: 50, fields: [title, { key: 'date', label: 'Ngày đăng', kind: 'date', max: 20, placeholder: 'DD/MM/YYYY' }, { key: 'coverUrl', label: 'Liên kết ảnh bìa', kind: 'url' }, { ...url, required: true }] },
  { id: 'socialLinks', title: 'Liên kết cá nhân', limit: 20, fields: [{ key: 'label', label: 'Tên liên kết', required: true, max: 100 }, { ...url, required: true }] },
];
export function profileFormValues(content: PortfolioContent, sectionId: ProfileSectionId, entryIndex?: number): Record<string, string> {
  const section = profileEditorSections.find(item => item.id === sectionId)!;
  const initial: Record<string, unknown> = sectionId === 'basic' ? { ...content } : (sectionId === 'education' || sectionId === 'certificates') && entryIndex !== undefined ? { ...content[sectionId][entryIndex] } : {};
  const values = Object.fromEntries(section.fields.map(field => [field.key, String(initial[field.key] ?? (field.kind === 'boolean' ? 'false' : ''))]));
  if (sectionId === 'certificates') values.logoUrl = String(initial.logoUrl ?? '');
  return values;
}
export function updateProfileEducation(content: PortfolioContent, index: number, values: Record<string, string>): PortfolioContent {
  return updateProfileEntry(content, 'education', index, values);
}
export function updateProfileEntry(content: PortfolioContent, section: 'education' | 'certificates', index: number, values: Record<string, string>): PortfolioContent {
  if (!Number.isInteger(index) || index < 0 || index >= content[section].length) throw new Error('Mục hồ sơ không còn tồn tại.');
  const validated = addProfileEntry({ ...content, [section]: [] }, section, values, [])[section][0];
  return { ...content, [section]: content[section].map((item, i) => i === index ? { ...item, ...validated } : item) };
}
export function profileDateToIso(value: string): string | null {
  const text = value.trim();
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = local ? `${local[3]}-${local[2]}-${local[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? iso : null;
}
export function addProfileEntry(content: PortfolioContent, sectionId: ProfileSectionId, values: Record<string, string>, catalog: NonNullable<PortfolioResponse['skillCatalog']>): PortfolioContent {
  const section = profileEditorSections.find(item => item.id === sectionId);
  if (!section) throw new Error('Phần hồ sơ không hợp lệ.');
  const entry: Record<string, unknown> = {};
  const fields: ProfileFormField[] = sectionId === 'certificates' ? [...section.fields, { key: 'logoUrl', label: 'Ảnh chứng chỉ', kind: 'url' }] : section.fields;
  for (const field of fields) {
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
      if (value && field.kind === 'date' && !profileDateToIso(value)) throw new Error(`${field.label} phải là ngày hợp lệ theo định dạng DD/MM/YYYY.`);
      if (value && field.kind === 'year' && (!/^\d{4}$/.test(value) || Number(value) < 1)) throw new Error(`${field.label} phải là năm hợp lệ gồm 4 chữ số.`);
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
  if (typeof entry.startDate === 'string' && typeof entry.endDate === 'string' && profileDateToIso(entry.endDate)! < profileDateToIso(entry.startDate)!) throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
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
