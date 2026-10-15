import { apiRequest } from '@/services/api';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import { profileEditorPayload } from '@/utils/profile-draft';

export const portfolioService = {
  getMine: (signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { signal }),
  getById: (profileId: string, signal?: AbortSignal) => apiRequest<PortfolioResponse>(`/profile/portfolio/${encodeURIComponent(profileId)}`, { signal }),
  saveDisplay: (showPortfolio: boolean, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/display/me', { method: 'PUT', body: JSON.stringify({ showPortfolio }), signal }),
  saveMine: (content: PortfolioContent, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { method: 'PUT', body: JSON.stringify(content), signal }),
  saveEditor: (data: PortfolioResponse, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/editor/me', { method: 'PUT', body: JSON.stringify(profileEditorPayload(data)), signal }),
};
