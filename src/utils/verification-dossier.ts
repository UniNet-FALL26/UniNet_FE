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
  const paid = detail.payments.some(p => p.status === 1);
  const review = detail.payments.some(p => p.requiresManualReview);
  const bookingConfirmed = v.bookingStatus === 2;
  const paymentProgress = paid
    ? review ? 'Đã thanh toán · Cần hỗ trợ đối soát và xử lý lịch hẹn'
      : bookingConfirmed ? 'Đã thanh toán và xác nhận lịch'
      : 'Đã thanh toán · Chờ xác nhận lịch'
    : review ? 'Giao dịch cần đối soát · Vui lòng liên hệ hỗ trợ'
      : bookingConfirmed ? 'Đã xác nhận lịch · Chờ thanh toán'
      : 'Chưa hoàn tất';
  return [
    { title: 'Tạo hồ sơ', done: true },
    { title: 'Xác nhận lịch và thanh toán', done: bookingConfirmed && paid && !review, statusText: paymentProgress },
    { title: 'Phân công chuyên viên', done: detail.assignments.some(a => [0, 1, 2].includes(a.status)) },
    { title: 'Buổi xác minh', done: !!detail.meetingEndAt },
    { title: 'Kết luận cấp 2', done: final },
  ];
}
