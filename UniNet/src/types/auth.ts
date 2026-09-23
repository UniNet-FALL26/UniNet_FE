import type { AccountRole } from '@/constants/roles';

export type AuthAccount = {
  id: string;
  email: string;
  fullName: string;
  role: AccountRole;
  profileComplete?: boolean;
};
export type LoginRequest = { email: string; password: string };
export type LoginResponse = { account: AuthAccount; accessToken: string; refreshToken?: string };
export type RegisterStudentRequest = { fullName: string; email: string; password: string };
export type RegisterPartnerRequest = RegisterStudentRequest & { organizationType: string };
