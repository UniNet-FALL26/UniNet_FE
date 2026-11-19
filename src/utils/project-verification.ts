import type { VerificationDetail } from '@/types/project-verification';

export function level2Label(detail: VerificationDetail | null, eligible: boolean) {
  if (!detail) return eligible ? 'Có thể đăng ký thẩm định' : 'Chưa đủ điều kiện thẩm định';
  const v = detail.verification;
  if (v.status === 1) return 'Đạt thẩm định';
  if (v.status === 2) return 'Không đạt thẩm định';
  if (v.status === 3) return 'Hồ sơ đã hủy';
  if (v.status !== 0 || detail.payments.some(p => p.requiresManualReview) || v.bookingStatus === 5) return 'Cần hỗ trợ xử lý';
  if (detail.meetingEndAt) return 'Buổi xác minh đã kết thúc — chờ kết luận';
  if (detail.assignments.some(a => a.status === 0 || a.status === 2)) return 'Đã phân công — xem lịch hẹn';
  if (detail.payments.some(p => p.status === 0)) return 'Đang chờ thanh toán hoặc xác nhận';
  if (detail.payments.some(p => p.status === 1)) return v.bookingStatus === 2 ? 'Đã thanh toán — chờ phân công' : 'Cần hỗ trợ xử lý trạng thái thanh toán';
  if (v.bookingStatus === 3 || (v.bookingStatus === 1 && v.reservedUntil && Date.parse(v.reservedUntil) <= Date.now())) return 'Hết thời gian giữ lịch';
  if (v.bookingStatus === 4) return 'Lịch hẹn đã hủy';
  if (detail.payments.some(p => p.status === 2)) return 'Thanh toán chưa thành công';
  if (v.bookingStatus === 1) return 'Đã giữ lịch — chờ thanh toán';
  return v.bookingStatus === 0 ? 'Chưa chọn lịch' : 'Cần hỗ trợ xử lý';
}
