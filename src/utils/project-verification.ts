import type { EvidenceModeration, VerificationDetail } from '@/types/project-verification';

export const level1Labels = ['Đang chờ kiểm tra', 'Đang kiểm tra', 'Đã đạt cấp 1', 'Nội dung không đạt', 'Thiếu minh chứng', 'Lỗi dịch vụ kiểm tra'];
export function level1Message(review: EvidenceModeration | null) {
  if (!review) return 'Chưa có kết quả kiểm tra tự động. Người tạo có thể yêu cầu kiểm tra cấp 1.';
  if (!review.isCurrent) return 'Dữ liệu hoặc chính sách đã thay đổi. Cần kiểm tra dữ liệu hiện tại trước khi đăng ký cấp 2.';
  switch (review.status) {
    case 0: case 1: return 'Hệ thống đang xử lý văn bản báo cáo và độ an toàn URL. Bạn có thể làm mới để xem kết quả.';
    case 2: return 'Đã vượt qua kiểm tra văn bản và URL. Xem trạng thái cấp 2 để biết bước tiếp theo.';
    case 3: return 'Có nội dung báo cáo hoặc URL không đạt chính sách. Xem lý do theo từng báo cáo trước khi sửa.';
    case 4: return 'Cần bổ sung báo cáo hoặc minh chứng cho các công việc bên dưới.';
    default: {
      const last = [...review.attempts].sort((a, b) => b.number - a.number)[0];
      return last?.transient && last.number < 5
        ? 'Dịch vụ kiểm tra gặp lỗi tạm thời. Hệ thống có thể thử lại; hãy làm mới trạng thái.'
        : 'Chưa thể hoàn tất kiểm tra. Cần hỗ trợ vận hành hoặc cập nhật dữ liệu/chính sách trước khi chạy lại.';
    }
  }
}
export function level2Label(detail: VerificationDetail | null, eligible: boolean) {
  if (!detail) return eligible ? 'Có thể đăng ký cấp 2' : 'Chưa đủ điều kiện cấp 2';
  const v = detail.verification;
  if (v.status === 1) return 'Đạt cấp 2';
  if (v.status === 2) return 'Không đạt cấp 2';
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
