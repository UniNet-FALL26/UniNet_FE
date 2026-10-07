import { apiRequest } from '@/services/api';
import type { PortfolioContent, PortfolioResponse } from '@/types/portfolio';

export const portfolioService = {
  getMine: (signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { signal }),
  saveMine: (content: PortfolioContent, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/me', { method: 'PUT', body: JSON.stringify(content), signal }),
  saveEditor: (data: PortfolioResponse, signal?: AbortSignal) => apiRequest<PortfolioResponse>('/profile/portfolio/editor/me', { method: 'PUT', body: JSON.stringify({ profile: { fullName: data.profile.fullName, nickname: data.profile.nickname, avatarUrl: data.profile.avatarUrl, coverUrl: data.profile.coverUrl, bio: data.profile.bio }, portfolio: data.portfolio }), signal }),
};
