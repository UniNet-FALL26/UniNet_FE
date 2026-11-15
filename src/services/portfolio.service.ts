import { apiRequest } from '@/services/api';
import type { EligiblePortfolioProject, PortfolioContent, PortfolioResponse } from '@/types/portfolio';
import { portfolioSavePayload, profileEditorPayload } from '@/utils/profile-draft';

export const portfolioService = {
  getMine: (signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { signal }),
  getEligibleProjects: (signal?: AbortSignal) => apiRequest<EligiblePortfolioProject[]>('/profile/portfolio/me/eligible-projects', { signal, feedback: false }),
  getById: (profileId: string, signal?: AbortSignal) => apiRequest<PortfolioResponse>(`/profile/portfolio/${encodeURIComponent(profileId)}`, { signal }),
  saveDisplay: (showPortfolio: boolean, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/display/me', { method: 'PUT', body: JSON.stringify({ showPortfolio }), signal }),
  saveMine: (content: PortfolioContent, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { method: 'PUT', body: JSON.stringify(portfolioSavePayload(content)), signal }),
  saveEditor: (data: PortfolioResponse, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/editor/me', { method: 'PUT', body: JSON.stringify(profileEditorPayload(data)), signal }),
};
