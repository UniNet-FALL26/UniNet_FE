import type { HubLink } from '@/types/project-hub';

export const projectLinkTypes = [
  { id: 'github', label: 'GitHub' },
  { id: 'website', label: 'Website / Demo' },
  { id: 'figma', label: 'Figma' },
  { id: 'google-play', label: 'Google Play' },
  { id: 'app-store', label: 'App Store' },
  { id: 'api', label: 'API (Swagger)' },
  { id: 'other', label: 'Khác' },
] as const;

export function getProjectLinkType(label: string) {
  return projectLinkTypes.find(item => item.label.toLowerCase() === label.trim().toLowerCase()) ?? projectLinkTypes[6];
}

export function normalizeProjectLinks(links: HubLink[]): HubLink[] {
  if (links.length > 30) throw new Error('Chỉ được lưu tối đa 30 liên kết.');
  return links.map((link, index) => {
    const label = link.label.trim(), url = link.url.trim();
    if (!label) throw new Error(`Liên kết ${index + 1}: vui lòng chọn loại liên kết.`);
    if (label.length > 100) throw new Error(`Liên kết ${index + 1}: tên tối đa 100 ký tự.`);
    let parsed: URL;
    try { parsed = new URL(url); }
    catch { throw new Error(`Liên kết ${index + 1}: vui lòng nhập địa chỉ HTTP hoặc HTTPS hợp lệ.`); }
    if (url.length > 2048 || /\s/.test(url) || !/^https?:\/\//i.test(url) || !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error(`Liên kết ${index + 1}: dùng URL HTTP hoặc HTTPS, tối đa 2048 ký tự và không chứa thông tin đăng nhập.`);
    }
    return { label, url };
  });
}
