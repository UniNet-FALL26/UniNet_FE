export type GitHubConnection = {
  id: string; providerAccountId: string; login: string; status: number;
  displayName?: string | null; avatarUrl?: string | null;
};
export type GitHubFlow = { flowId: string; authorizationUrl: string; expiresAt: string };
export type GitIdentity = {
  id: string; projectId: string; userProfileId: string; externalAccountId: number;
  externalUsername: string; status: number; linkedAt: string; unlinkedAt: string | null;
};
export type GitRepository = {
  id: string; projectId: string;
  repository: { providerRepositoryId: number; fullName: string; htmlUrl: string; isPrivate: boolean };
  accessStatus: number; credentialSource: number; syncReadiness: string;
  syncPaused: boolean; unlinkedAt: string | null;
};
export type GitCredential = { credentialId: string; gitHubUserId: number; login: string; requiresReauthorization: boolean };
export type GitInstallation = { installationId: number; ownerLogin: string; ownerType: string; status: string; configurationUrl?: string | null };
export type GitInstallationRepository = { repositoryId: number; fullName: string; isPrivate: boolean; eligible: boolean; ineligibilityReason: string | null };
export type GitPage<T> = { items: T[]; page: number; pageSize: number; totalCount: number };
export type GitGrantPage<T> = { items: T[]; page: number; hasMore: boolean };
export type GitSyncState = { projectGitRepositoryId: string; lastSuccessfulSyncAt?: string | null; latestJob: { status: number; errorCode: string | null; completedAt?: string | null } | null };
export type OfficialMemberContribution = {
  gitShare?: number; peerShare?: number;
  contractVersion: string; projectId: string; runId: string; publishedAt: string;
  userId: string; contributionPercent: number;
};
