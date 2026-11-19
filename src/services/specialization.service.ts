import { apiRequest } from '@/services/api';

export type Specialization = { id: string; code: string; name: string; isActive: boolean };

export const specializationService = {
  getSpecializations: (signal?: AbortSignal) => apiRequest<Specialization[]>('/specializations', { signal }),
};
