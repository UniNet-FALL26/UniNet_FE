import { API_URL } from '@/constants/config';
import { apiRequest, ApiError } from '@/services/api';
import type { ConfirmDraftResponse, DraftData, DraftResponse } from '@/types/external-project-draft';
import { isFileId } from '@/utils/external-project-draft';

const root = `${API_URL.replace(/\/$/, '').endsWith('/api') ? '' : '/api'}/external-project-drafts`;
const path = (id: string) => `${root}/${encodeURIComponent(id)}`;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const nullableText = (value: unknown) => value === null || typeof value === 'string';
function draftResponse(value: unknown): DraftResponse {
  const bad = () => new ApiError('Phản hồi bản nháp không hợp lệ. Vui lòng tải lại trạng thái.', 502);
  if (!object(value) || !isFileId(value.draftId) || !Number.isInteger(value.status) || Number(value.status) < 0 || Number(value.status) > 4 || !Number.isInteger(value.version) || !object(value.data) || !strings(value.missingFields) || !Array.isArray(value.files)) throw bad();
  for (const key of ['createdAt', 'updatedAt', 'expiresAt']) if (typeof value[key] !== 'string' || !Number.isFinite(Date.parse(value[key] as string))) throw bad();
  if (!nullableText(value.errorCode) || !(value.confirmedProjectId === null || isFileId(value.confirmedProjectId)) || (value.status === 3 && !isFileId(value.confirmedProjectId))) throw bad();
  const data = value.data;
  for (const key of ['title', 'description', 'projectField', 'startDate', 'endDate', 'repositoryUrl', 'demoUrl', 'submitterRole', 'submitterContribution', 'leaderName']) if (!nullableText(data[key])) throw bad();
  if (!(data.submitterIsLeader === null || typeof data.submitterIsLeader === 'boolean') || !strings(data.skillIds) || !strings(data.evidenceFileIds) || !strings(data.features) || !Array.isArray(data.members) || !data.members.every(member => object(member) && typeof member.name === 'string' && nullableText(member.role))) throw bad();
  if (!value.files.every(file => object(file) && isFileId(file.fileId) && ['fileName', 'url', 'format', 'resourceType'].every(key => typeof file[key] === 'string') && typeof file.sizeBytes === 'number')) throw bad();
  if (value.extraction !== null) {
    const extraction = value.extraction;
    const sourced = (entry: unknown): boolean => object(entry) && typeof entry.value === 'string' && Array.isArray(entry.sources) && entry.sources.every(c => object(c) && isFileId(c.fileId) && Number.isInteger(c.segmentNumber) && typeof c.quote === 'string');
    if (!object(extraction) || !object(extraction.information) || !Array.isArray(extraction.documents) || !Array.isArray(extraction.warnings)) throw bad();
    const info = extraction.information;
    for (const key of ['title', 'description', 'projectField', 'startDate', 'endDate', 'repositoryUrl', 'demoUrl']) if (info[key] != null && !sourced(info[key])) throw bad();
    if (!Array.isArray(info.features) || !info.features.every(sourced) || !Array.isArray(info.skills) || !info.skills.every(skill => object(skill) && sourced(skill.name) && (skill.skillId === null || isFileId(skill.skillId))) || !Array.isArray(info.members) || !info.members.every(member => object(member) && sourced(member.name) && (member.role === null || sourced(member.role)))) throw bad();
    if (!extraction.documents.every(doc => object(doc) && isFileId(doc.fileId) && typeof doc.fileName === 'string' && Array.isArray(doc.segments) && doc.segments.every(segment => object(segment) && Number.isInteger(segment.number) && typeof segment.text === 'string' && ['pageNumber', 'paragraphNumber', 'lineNumber'].every(key => segment[key] == null || Number.isInteger(segment[key]))))) throw bad();
  }
  return value as unknown as DraftResponse;
}
export const externalProjectDraftService = {
  create: async (fileIds: string[]) => draftResponse(await apiRequest<unknown>(root, { method: 'POST', body: JSON.stringify({ fileIds }), feedback: false })),
  get: async (id: string, signal?: AbortSignal) => draftResponse(await apiRequest<unknown>(path(id), { signal, feedback: false })),
  update: async (id: string, version: number, data: DraftData) => draftResponse(await apiRequest<unknown>(path(id), { method: 'PATCH', body: JSON.stringify({ version, data }), feedback: false })),
  confirm: async (id: string, version: number): Promise<ConfirmDraftResponse> => {
    const result = await apiRequest<unknown>(`${path(id)}/confirm`, { method: 'POST', body: JSON.stringify({ version, confirmSharingRights: true }), feedback: false });
    if (!object(result) || !isFileId(result.projectId) || !isFileId(result.draftId) || !isFileId(result.evidenceModerationId) || !Number.isInteger(result.version) || result.origin !== 1 || result.status !== 2) throw new ApiError('Chưa xác định được kết quả xác nhận. Vui lòng tải lại trạng thái.', 502);
    return result as unknown as ConfirmDraftResponse;
  },
};
