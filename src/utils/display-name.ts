type DisplayIdentity = { nickname?: string | null; displayName?: string | null; fullName?: string | null };
export function getDisplayName(identity?: DisplayIdentity | null): string {
  return identity?.nickname?.trim() || identity?.displayName?.trim() || identity?.fullName?.trim() || 'Thành viên UniNet';
}
