import { ACCOUNT_ROLE } from '@/constants/roles';
export function accountHome(role?: number) {
  if (role === ACCOUNT_ROLE.ASSESSOR) return '/(assessor)/assessor-community' as const;
  if (role === ACCOUNT_ROLE.PARTNER) return '/(company)' as const;
  return '/(tabs)' as const;
}
export function accountProfile(role?: number) {
  if (role === ACCOUNT_ROLE.ASSESSOR) return '/(assessor)/assessor-profile' as const;
  if (role === ACCOUNT_ROLE.PARTNER) return '/(company)/profile' as const;
  return '/(tabs)/profile' as const;
}
