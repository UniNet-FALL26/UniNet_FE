import type { VerificationDetail } from '@/types/project-verification';
import type { MeetingResponse } from '@/types/verification-meeting';

export function meetingState(detail: VerificationDetail, meeting: MeetingResponse | null = null, now = Date.now()) {
  const v = detail.verification;
  const active = detail.assignments.filter(a => a.status === 0 || a.status === 2);
  const assignment = active.length === 1 ? active[0] : null;
  const result = !!detail.finalResult || v.status === 1 || v.status === 2 || detail.assignments.some(a => !!a.report);
  let message = '';
  if (result) message = 'Đã có báo cáo hoặc kết luận thẩm định.';
  else if (v.status === 3) message = 'Hồ sơ đã hủy. Phiên không còn hoạt động.';
  else if (v.status !== 0) message = 'Trạng thái hồ sơ chưa hỗ trợ tham gia. Vui lòng làm mới hoặc liên hệ hỗ trợ.';
  else if (detail.meetingEndAt || meeting?.meetingEndAt) message = 'Buổi thẩm định đã kết thúc. Đang chờ chuyên gia nộp báo cáo.';
  else if (detail.payments.some(p => p.requiresManualReview)) message = 'Giao dịch cần đối soát. Vui lòng xem hồ sơ và liên hệ hỗ trợ.';
  else if (v.bookingStatus !== 2 || !v.bookingConfirmedAt) message = 'Lịch chưa được xác nhận. Vui lòng kiểm tra hồ sơ và thanh toán.';
  else if (active.length > 1) message = 'Có nhiều phân công đang hoạt động. Vui lòng liên hệ hỗ trợ để kiểm tra.';
  else if (!assignment) message = 'Đang chờ phân công chuyên gia thẩm định.';
  else if (!v.scheduledStartAt || !v.scheduledEndAt || !Number.isFinite(Date.parse(v.scheduledStartAt)) || Date.parse(v.scheduledEndAt) <= Date.parse(v.scheduledStartAt) || !Number.isFinite(Date.parse(v.scheduledEndAt))) message = 'Lịch thẩm định không hợp lệ. Vui lòng liên hệ hỗ trợ.';
  const canRead = !message && !!assignment;
  const waitingSeconds = canRead ? Math.max(0, Math.ceil((Date.parse(v.scheduledStartAt!) - now) / 1000)) : 0;
  const early = waitingSeconds > 0;
  const completed = result || v.status !== 0 || !!detail.meetingEndAt || !!meeting?.meetingEndAt;
  return { assignment, result, completed, waitingSeconds, canRead, canJoin: canRead && !early,
    message: message || (early ? 'Chưa đến giờ hẹn. Bạn có thể tham gia khi đến giờ.' : detail.meetingStartAt || meeting?.meetingStartAt ? 'Buổi thẩm định đang diễn ra.' : meeting?.roomName ? 'Phòng đã sẵn sàng. Đang chờ chuyên gia bắt đầu phiên.' : 'Đã đến giờ hẹn. Bạn có thể chuẩn bị và tham gia.') };
}

export function meetingWaitLabel(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.floor(seconds % 60);
  return `${days ? `${days} ngày ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}
