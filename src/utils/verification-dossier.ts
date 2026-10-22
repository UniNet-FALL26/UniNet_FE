import type { VerificationDetail } from '@/types/project-verification';

export function canCancelVerification(detail: VerificationDetail, now = Date.now()) {
  const v = detail.verification;
  return v.status === 0 && !detail.finalResult?.finalizedAt && detail.assignments.length === 0 &&
    !detail.meetingStartAt && !detail.meetingEndAt &&
    (!v.scheduledStartAt || Date.parse(v.scheduledStartAt) > now || v.bookingStatus === 3 ||
      (v.bookingStatus === 1 && !!v.reservedUntil && Date.parse(v.reservedUntil) <= now));
}

export function dossierSteps(detail: VerificationDetail) {
  const v = detail.verification;
  const final = v.status === 1 || v.status === 2;
  return [
    { title: 'Tạo hồ sơ', done: true },
    { title: 'Xác nhận lịch và thanh toán', done: v.bookingStatus === 2 && detail.payments.some(p => p.status === 1) },
    { title: 'Phân công chuyên viên', done: detail.assignments.some(a => [0, 1, 2].includes(a.status)) },
    { title: 'Buổi xác minh', done: !!detail.meetingEndAt },
    { title: 'Kết luận cấp 2', done: final },
  ];
}
