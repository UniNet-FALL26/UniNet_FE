import type { AccountRole } from '@/constants/roles';

export type AuthAccount = {
  id: string;
  email: string;
  role: AccountRole;
  profileComplete: boolean;
  profile: { id: string; fullName: string; nickname: string; organizationName: string | null; displayName: string; isVerified: boolean } | null;
};
export type LoginRequest = { email: string; password: string };
export type LoginResponse = { account: AuthAccount; accessToken: string; refreshToken: string; expiresAt?: string; requiresProfileCompletion: boolean };
export type RegisterStudentRequest = { fullName: string; nickname?: string; email: string; password: string; confirmPassword: string; universityName?: string; major?: string };
export type RegisterPartnerRequest = { organizationName: string; fullName: string; nickname: string; email: string; password: string; confirmPassword: string; partnerType: number };
