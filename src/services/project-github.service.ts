import { API_URL } from '@/constants/config';
import { apiRequest } from '@/services/api';
import type { GitCredential, GitGrantPage, GitHubConnection, GitHubFlow, GitIdentity, GitInstallation, GitInstallationRepository, GitPage, GitRepository, GitSyncState, OfficialMemberContribution } from '@/types/project-github';

const api = (path: string) => `${API_URL.endsWith('/api') ? '' : '/api'}${path}`;
const project = (id: string) => `/projects/${encodeURIComponent(id)}/git`;
const get = <T>(path: string, signal?: AbortSignal) => apiRequest<T>(api(path), { method: 'GET', signal, cache: 'no-store', feedback: false });
const post = <T>(path: string, body: unknown) => apiRequest<T>(api(path), { method: 'POST', body: JSON.stringify(body), feedback: false });
export const projectGitService = {
  connections: (signal?: AbortSignal) => get<GitHubConnection[]>('/github/connections', signal),
  startOAuth: (returnTarget: string) => post<GitHubFlow>('/github/oauth/start', { returnTarget }),
  completeOAuth: (flowId: string) => post<GitHubConnection>('/github/oauth/complete', { flowId }),
  repositories: (id: string, page = 1, signal?: AbortSignal) => get<GitPage<GitRepository>>(`${project(id)}/repositories?page=${page}&pageSize=50`, signal),
  syncStatus: (id: string, signal?: AbortSignal) => get<{ items: GitSyncState[] }>(`${project(id)}/sync-status`, signal),
  credentials: (id: string, signal?: AbortSignal) => get<GitCredential[]>(`${project(id)}/app/credentials`, signal),
  startApp: (id: string, oauthConnectionId: string) => post<GitHubFlow>(`${project(id)}/app/authorization/start`, { oauthConnectionId, returnTarget: process.env.EXPO_PUBLIC_GITHUB_APP_RETURN_TARGET || 'e2e' }),
  installations: (id: string, credentialId: string, page = 1, signal?: AbortSignal) => get<GitGrantPage<GitInstallation>>(`${project(id)}/app/installations?credentialId=${encodeURIComponent(credentialId)}&page=${page}`, signal),
  installationRepositories: (id: string, credentialId: string, installationId: number, page = 1, signal?: AbortSignal) => get<GitGrantPage<GitInstallationRepository>>(`${project(id)}/app/installations/${installationId}/repositories?credentialId=${encodeURIComponent(credentialId)}&page=${page}`, signal),
  linkRepository: (id: string, credentialId: string, installationId: number, repositoryId: number) => post<{ projectGitRepositoryId: string; repositoryId: number; linkStatus: number; readiness: string; wasAlreadyLinked: boolean }>(`${project(id)}/app/repositories/link`, { credentialId, installationId, repositoryId }),
  unlinkRepository: (id: string, linkId: string) => apiRequest<void>(api(`${project(id)}/repositories/${encodeURIComponent(linkId)}`), { method: 'DELETE', feedback: false }),
  identities: (id: string, page = 1, signal?: AbortSignal) => get<GitPage<GitIdentity>>(`${project(id)}/identities?page=${page}&pageSize=50`, signal),
  linkIdentity: (id: string, connectionId: string) => post<GitIdentity>(`${project(id)}/identities`, { connectionId }),
  reactivateIdentity: (id: string, identityId: string, connectionId: string) => post<GitIdentity>(`${project(id)}/identities/${encodeURIComponent(identityId)}/reactivate`, { connectionId }),
  unlinkIdentity: (id: string, identityId: string) => apiRequest<GitIdentity>(api(`${project(id)}/identities/${encodeURIComponent(identityId)}`), { method: 'DELETE', feedback: false }),
  myContribution: (id: string, signal?: AbortSignal) => get<OfficialMemberContribution>(`/projects/${encodeURIComponent(id)}/contribution/v2/results/me`, signal),
};

// Read all pages: repeated observations / projects with >50 identities must not truncate UI silently.
export async function allGitPages<T>(read: (page: number) => Promise<GitPage<T>>): Promise<T[]> {
  const result: T[] = [];
  for (let page = 1; ; page++) {
    const value = await read(page);
    if (!Array.isArray(value.items) || !Number.isFinite(value.totalCount)) throw new Error('Phản hồi GitHub không hợp lệ.');
    result.push(...value.items);
    if (result.length >= value.totalCount) return result;
    if (!value.items.length || page >= 1000) throw new Error('Không thể tải đầy đủ dữ liệu GitHub. Vui lòng thử lại.');
  }
}
