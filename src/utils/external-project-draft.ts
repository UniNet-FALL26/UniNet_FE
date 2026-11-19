import type { DraftData, DraftFile } from '@/types/external-project-draft';

export const isFileId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
export const draftFieldLabels: Record<string, string> = {
  specializationId: 'Chuyên ngành',
  title: 'Tên dự án', description: 'Mô tả dự án', projectField: 'Lĩnh vực', startDate: 'Thời gian bắt đầu', endDate: 'Thời gian kết thúc',
  submitterRole: 'Vai trò của bạn', submitterContribution: 'Đóng góp của bạn', submitterIsLeader: 'Bạn có phải trưởng nhóm?', leaderName: 'Họ tên trưởng nhóm', skillIds: 'Kỹ năng / công nghệ', evidenceFileIds: 'Minh chứng',
};
// Bounds are used only for validation. The original precision is sent unchanged.
export function implementationDateBounds(value: string): [number, number] | null {
  if (!/^[0-9]{4}(-[0-9]{2})?(-[0-9]{2})?$/.test(value)) return null;
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  const make = (m: number, d: number) => { const date = new Date(0); date.setUTCFullYear(year, m - 1, d); date.setUTCHours(0, 0, 0, 0); return date; };
  const first = make(month, day);
  if (first.getUTCMonth() !== month - 1 || first.getUTCDate() !== day) return null;
  const last = value.length === 4 ? make(12, 31) : value.length === 7 ? make(month + 1, 0) : first;
  return [first.getTime(), last.getTime()];
}
export function validateDraft(data: DraftData, files: DraftFile[], skillIds: string[], complete: boolean, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = ['title', 'description', 'projectField', 'startDate', 'endDate', 'submitterRole', 'submitterContribution'] as const;
  const limits = { title: 255, description: 2000, projectField: 150, submitterRole: 255, submitterContribution: 4000, leaderName: 255, repositoryUrl: 2048, demoUrl: 2048 } as const;
  if (complete) {
    if (!data.specializationId) errors.specializationId = 'Vui lòng chọn chuyên ngành dự án.';
    for (const key of required) if (!data[key]?.trim()) errors[key] = 'Vui lòng bổ sung trường này.';
    if (data.submitterIsLeader === null) errors.submitterIsLeader = 'Vui lòng chọn Có hoặc Không.';
    if (data.submitterIsLeader === false && !data.leaderName?.trim()) errors.leaderName = 'Vui lòng nhập tên trưởng nhóm.';
    if (!data.skillIds.length) errors.skillIds = 'Chọn ít nhất một kỹ năng.';
    if (!data.evidenceFileIds.length) errors.evidenceFileIds = 'Chọn ít nhất một tài liệu minh chứng.';
  }
  for (const [key, limit] of Object.entries(limits)) if ((data[key as keyof typeof limits]?.trim().length ?? 0) > limit) errors[key] = `Tối đa ${limit} ký tự.`;
  if (data.specializationId != null && !isFileId(data.specializationId)) errors.specializationId = 'Vui lòng chọn chuyên ngành hợp lệ.';
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const key of ['startDate', 'endDate'] as const) {
    if (!data[key]?.trim()) continue;
    const bounds = implementationDateBounds(data[key]!.trim());
    if (!bounds) errors[key] = 'Dùng YYYY, YYYY-MM hoặc YYYY-MM-DD hợp lệ.';
    else if (bounds[0] > today) errors[key] = 'Thời gian thực hiện không được ở tương lai.';
  }
  const start = implementationDateBounds(data.startDate?.trim() || ''), end = implementationDateBounds(data.endDate?.trim() || '');
  if (start && end && start[0] > end[1]) errors.endDate = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
  for (const key of ['repositoryUrl', 'demoUrl'] as const) {
    if (!data[key]?.trim()) continue;
    try { const url = new URL(data[key]!.trim()); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { errors[key] = 'Dùng URL HTTP/HTTPS không chứa tên đăng nhập hoặc mật khẩu.'; }
  }
  if (data.skillIds.length > 30 || new Set(data.skillIds).size !== data.skillIds.length || data.skillIds.some(id => !isFileId(id) || !skillIds.includes(id))) errors.skillIds = 'Chọn tối đa 30 kỹ năng hợp lệ trong danh mục.';
  if (data.evidenceFileIds.length > 10 || new Set(data.evidenceFileIds).size !== data.evidenceFileIds.length || data.evidenceFileIds.some(id => !files.some(file => file.fileId === id))) errors.evidenceFileIds = 'Chỉ chọn tài liệu thuộc bản nháp này.';
  if (data.features.length > 40 || data.features.some(value => !value.trim() || value.trim().length > 1000)) errors.features = 'Tối đa 40 chức năng; mỗi mục từ 1–1.000 ký tự.';
  if (data.members.length > 30 || data.members.some(member => !member.name.trim() || member.name.trim().length > 255 || (member.role?.trim().length ?? 0) > 255)) errors.members = 'Tối đa 30 thành viên; nhập tên và tối đa 255 ký tự mỗi trường.';
  return errors;
}
