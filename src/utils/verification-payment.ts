import type { VerificationDetail, VerificationTransaction } from '@/types/project-verification';
import { canChooseMeeting, holdSeconds } from '@/utils/verification-booking';

export function canCreateCheckout(detail: VerificationDetail, transaction: VerificationTransaction | null, now: number) {
  return canChooseMeeting(detail, now) && holdSeconds(detail, now) > 0 &&
    (!transaction || (transaction.status === 2 && !transaction.requiresReview && !transaction.reconciliationRequired));
}
export function checkoutLink(transaction: VerificationTransaction | null, detail: VerificationDetail, now: number) {
  if (!transaction || transaction.status !== 0 || transaction.requiresReview || transaction.reconciliationRequired ||
    detail.verification.status !== 0 || !(holdSeconds(detail, now) > 0) ||
    detail.payments.some(p => p.status === 1 || p.requiresManualReview) ||
    !transaction.expiredAt || !(Date.parse(transaction.expiredAt) > now) ||
    Date.parse(transaction.expiredAt) !== Date.parse(detail.verification.reservedUntil ?? '') || !transaction.checkoutUrl) return null;
  try {
    const url = new URL(transaction.checkoutUrl);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function paymentQrPayload(transaction: VerificationTransaction | null, detail: VerificationDetail, now: number) {
  if (!checkoutLink(transaction, detail, now)) return null;
  const payload = transaction?.qrCode;
  return typeof payload === 'string' && payload.trim().length > 0 && payload.length <= 4096 ? payload : null;
}
export function paymentPresentation(detail: VerificationDetail, transaction: VerificationTransaction | null, now: number) {
  if (transaction?.requiresReview || transaction?.reconciliationRequired || detail.payments.some(p => p.requiresManualReview)) return { title: 'Thanh toán cần đối soát', message: transaction?.status === 1 || detail.payments.some(p => p.status === 1)
    ? 'Đã ghi nhận thanh toán nhưng lịch hẹn cần được hỗ trợ xử lý. Vui lòng liên hệ hỗ trợ, không thanh toán thêm.'
    : 'Giao dịch cần được hỗ trợ đối soát và xử lý lịch hẹn. Vui lòng liên hệ hỗ trợ, không thanh toán thêm.' };
  const paid = transaction?.status === 1 || detail.payments.some(p => p.status === 1);
  if (paid) return detail.verification.bookingStatus === 2
    ? { title: 'Thanh toán thành công', message: 'Hệ thống đã xác nhận thanh toán và lịch hẹn. Hồ sơ đang chờ bước xác minh tiếp theo.' }
    : { title: 'Đã ghi nhận thanh toán', message: 'Lịch hẹn chưa được xác nhận đồng bộ. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ, không thanh toán thêm.' };
  if (transaction?.status === 0 || detail.payments.some(p => p.status === 0)) return { title: 'Đang chờ xác nhận thanh toán', message: 'Nếu đã trả tiền, hãy chờ hệ thống cập nhật. Đóng PayOS hoặc quay lại ứng dụng chưa xác nhận kết quả giao dịch.' };
  if (holdSeconds(detail, now) <= 0) return { title: 'Chưa có lịch giữ còn hiệu lực', message: 'Chọn lại lịch trước khi thanh toán. Không sử dụng đường dẫn thanh toán đã hết hạn.' };
  if (transaction?.status === 2) return { title: 'Thanh toán chưa thành công', message: 'Bạn có thể thử thanh toán lại khi lịch giữ vẫn còn hiệu lực.' };
  return { title: 'Sẵn sàng thanh toán', message: 'Kiểm tra thông tin rồi tạo checkout. Số tiền cuối cùng được backend xác nhận trên giao dịch.' };
}
