import type { AccountRole } from '@/constants/roles';

export type AuthAccount = {
  id: string;
  email: string;
  role: AccountRole;
  profileComplete: boolean;
  profile: { displayName: string } | null;
};
export type LoginRequest = { email: string; password: string };
export type LoginResponse = { account: AuthAccount; accessToken: string; refreshToken: string; requiresProfileCompletion: boolean };
export type RegisterStudentRequest = { fullName: string; email: string; password: string; confirmPassword: string; universityName?: string; major?: string };
export type RegisterPartnerRequest = { displayName: string; email: string; password: string; confirmPassword: string; partnerType: number };
