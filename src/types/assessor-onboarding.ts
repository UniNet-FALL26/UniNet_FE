export type OnboardingStep = 'profile' | 'contract' | 'activate';
export type Credential = { token: string };
export type ProfileInspect = { email: string };
export type ProfileInput = { fullName: string; citizenId: string; taxCode: string; bankName: string; bankAccountNumber: string; bankAccountHolder: string };
export type ProfileSubmitted = { id: string; status: 'ProfileSubmitted' };
export type ContractInspect = { fullName: string | null; templateVersion: string | null; contractSha256: string | null; signatureStatement: string | null; readSessionExpiresAt: string | null };
export type ActivationInspect = { fullName: string | null; emailNormalized: string; expiresAt: string | null };
