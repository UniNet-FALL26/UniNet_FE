import { ApiError } from '@/services/api';
import { allGitPages, projectGitService as git } from '@/services/project-github.service';
import type { GitCredential, GitGrantPage, GitHubConnection, GitInstallation, GitInstallationRepository } from '@/types/project-github';

// Official generic fallback for missing/invalid provider-supplied URLs.
// Never synthesize /settings/installations/{id}, organization URLs or query parameters.
export const githubInstallationSettingsUrl = 'https://github.com/settings/installations';
export function githubInstallationConfiguration(installation: GitInstallation) {
  try {
    const url = new URL(installation.configurationUrl ?? '');
    if (url.origin === 'https://github.com' && !url.username && !url.password && !url.search && !url.hash &&
      new RegExp(`^/(?:settings/installations|organizations/[^/]+/settings/installations)/${installation.installationId}/?$`).test(url.pathname)) {
      return { url: installation.configurationUrl!, direct: true };
    }
  } catch { /* Never synthesize a guessed per-installation URL. */ }
  return { url: githubInstallationSettingsUrl, direct: false };
}
export const credentialsForGitHubAccount = (rows: GitCredential[], account: GitHubConnection) =>
  rows.filter(row => String(row.gitHubUserId) === account.providerAccountId);

export type GitHubLinkChoice = { account: GitHubConnection; credentialId?: string; installationId?: number; installationPage: number; repositoryPage: number };
export type GitHubLinkOptions = { credentials: GitCredential[]; credential: GitCredential | null; installations: GitGrantPage<GitInstallation> | null; installation: GitInstallation | null; repositories: GitGrantPage<GitInstallationRepository> | null; linkedIds: number[] };
export async function readGitHubLinkOptions(projectId: string, choice: GitHubLinkChoice, signal: AbortSignal): Promise<GitHubLinkOptions> {
  const credentials = credentialsForGitHubAccount(await git.credentials(projectId, signal), choice.account);
  const usable = credentials.filter(x => !x.requiresReauthorization);
  const credential = choice.credentialId ? usable.find(x => x.credentialId === choice.credentialId) : usable.length === 1 ? usable[0] : null;
  if (choice.credentialId && !credential) throw new ApiError('Authorization changed', 403, 'GITHUB_APP_REAUTHORIZATION_REQUIRED');
  const empty = { credentials, credential: credential ?? null, installations: null, installation: null, repositories: null, linkedIds: [] };
  if (!credential) return empty;
  let installations = await git.installations(projectId, credential.credentialId, choice.installationPage, signal);
  let installation = choice.installationId ? installations.items.find(x => x.installationId === choice.installationId) : undefined;
  // Preserve the selected identity even if it moved to another provider page.
  if (choice.installationId && !installation) {
    for (let page = 1; page <= 1000; page++) {
      const value = page === choice.installationPage ? installations : await git.installations(projectId, credential.credentialId, page, signal);
      installation = value.items.find(x => x.installationId === choice.installationId);
      if (installation) { installations = value; break; }
      if (!value.hasMore) break;
    }
  }
  if (!choice.installationId && choice.installationPage === 1 && !installations.hasMore && installations.items.length === 1 && installations.items[0].status === 'Active') installation = installations.items[0];
  if (choice.installationId && (!installation || installation.status !== 'Active')) throw new ApiError('Installation unavailable', 403, 'GITHUB_APP_INSTALLATION_UNAVAILABLE');
  if (!installation) return { ...empty, credential, installations };
  const repositories = await git.installationRepositories(projectId, credential.credentialId, installation.installationId, choice.repositoryPage, signal);
  const linked = await allGitPages(page => git.repositories(projectId, page, signal));
  return { credentials, credential, installations, installation, repositories, linkedIds: linked.filter(x => x.projectId === projectId && !x.unlinkedAt).map(x => x.repository.providerRepositoryId) };
}

export async function refreshGitHubRepositoryAccess(projectId: string, account: GitHubConnection, selectedCredentialId: string, installationId: number) {
  const credentials = await git.credentials(projectId);
  const credential = credentialsForGitHubAccount(credentials, account).find(x => x.credentialId === selectedCredentialId);
  if (!credential || credential.requiresReauthorization) throw new ApiError('GitHub authorization changed', 403, 'GITHUB_APP_REAUTHORIZATION_REQUIRED');
  let installation: GitInstallation | undefined;
  let installations;
  for (let page = 1; page <= 1000; page++) {
    const result = await git.installations(projectId, credential.credentialId, page);
    installation = result.items.find(x => x.installationId === installationId);
    if (installation) { installations = result; break; }
    if (!result.hasMore) break;
  }
  if (!installation || installation.status !== 'Active' || !installations) throw new ApiError('Installation unavailable', 403, 'GITHUB_APP_INSTALLATION_UNAVAILABLE');
  const repositories = await git.installationRepositories(projectId, credential.credentialId, installation.installationId, 1);
  const linked = await allGitPages(page => git.repositories(projectId, page));
  return { credentials, credential, installation, installations, repositories,
    linkedIds: linked.filter(x => x.projectId === projectId && !x.unlinkedAt).map(x => x.repository.providerRepositoryId) };
}
