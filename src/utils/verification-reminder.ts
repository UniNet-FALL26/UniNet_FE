const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export function verificationReminder(createdAt: string | null | undefined, verified: boolean, now = Date.now()): string | null {
  if (verified || !createdAt) return null;
  const registered = Date.parse(createdAt);
  if (!Number.isFinite(registered) || !Number.isFinite(now) || registered > now) return null;
  const elapsedDays = Math.floor((now + VIETNAM_OFFSET_MS) / DAY_MS) - Math.floor((registered + VIETNAM_OFFSET_MS) / DAY_MS);
  if (elapsedDays < 1) return null;
  const remaining = 4 - elapsedDays;
  return remaining > 0 ? `Còn ${remaining} ngày, vui lòng xác minh tài khoản.` : 'Vui lòng xác minh tài khoản.';
}
