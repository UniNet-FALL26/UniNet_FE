import type { VerificationDetail } from '@/types/project-verification';

export function canChooseMeeting(detail: VerificationDetail, now = Date.now()) {
  const v = detail.verification;
  const scheduleOpen = !v.scheduledStartAt || Date.parse(v.scheduledStartAt) > now || v.bookingStatus === 3 ||
    (v.bookingStatus === 1 && !!v.reservedUntil && Date.parse(v.reservedUntil) <= now);
  return v.status === 0 && [0, 1, 3].includes(v.bookingStatus) && !detail.meetingStartAt && !detail.meetingEndAt &&
    scheduleOpen && detail.assignments.length === 0 &&
    !detail.payments.some(p => p.status === 0 || p.status === 1 || p.requiresManualReview);
}
export function holdSeconds(detail: VerificationDetail, now: number) {
  const v = detail.verification;
  return v.bookingStatus === 1 && v.reservedUntil ? Math.max(0, Math.ceil((Date.parse(v.reservedUntil) - now) / 1000)) : 0;
}
export function slotDate(value: string, zone: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function slotTime(value: string, zone: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
