import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { ProjectSpecialization } from '@/types/project';

export type Specialization = ProjectSpecialization;

const apiRoot = () => (API_URL.endsWith('/api') ? '' : '/api');

const requiredId = (value: string, label: string) => {
  if (!value.trim()) throw new Error(`Không tìm thấy ${label}.`);
  return encodeURIComponent(value);
};

function isSpecialization(value: unknown): value is Specialization {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    record.id.trim().length > 0 &&
    typeof record.name === 'string' &&
    record.name.trim().length > 0
  );
}

export const specializationService = {
  async getSpecializations(signal?: AbortSignal): Promise<Specialization[]> {
    const response = await apiRequest<Specialization[]>(`${apiRoot()}/specializations`, {
      method: 'GET',
      signal,
      feedback: false,
    });
    if (!Array.isArray(response)) {
      throw new Error('Phản hồi danh sách chuyên ngành không hợp lệ.');
    }
    return response;
  },

  async getProjectSpecialization(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<Specialization | null> {
    const response = await apiRequest<{ specialization?: unknown }>(
      `${apiRoot()}/projects/${requiredId(projectId, 'mã dự án')}`,
      {
        method: 'GET',
        signal,
        feedback: false,
      },
    );
    if (!response || typeof response !== 'object') {
      throw new Error('Phản hồi thông tin chuyên ngành dự án không hợp lệ.');
    }
    if (response.specialization === undefined || response.specialization === null) {
      return null;
    }
    if (!isSpecialization(response.specialization)) {
      throw new Error('Dữ liệu chuyên ngành hiện tại không hợp lệ.');
    }
    return response.specialization;
  },

  async updateProjectSpecialization(
    projectId: string,
    specializationId: string,
  ): Promise<Specialization> {
    const response = await apiRequest<Specialization>(
      `${apiRoot()}/admin/projects/${requiredId(projectId, 'mã dự án')}/specialization`,
      {
        method: 'PUT',
        body: JSON.stringify({ specializationId }),
        feedback: false,
      },
    );
    if (!isSpecialization(response)) {
      throw new Error('Phản hồi cập nhật chuyên ngành không hợp lệ.');
    }
    return response;
  },
};
