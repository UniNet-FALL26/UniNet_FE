import type { StudentVerification, StudentVerificationDraft, VerificationDocument } from '@/types/student-verification';

export function verificationPresentation(value: Pick<StudentVerification, 'status' | 'isVerified'>) {
  if (value.isVerified || value.status === 1) return { state: 'approved', label: 'Đã xác minh', description: 'Tài khoản sinh viên đã được xác thực.', color: '#21845A', background: '#ECF9F1' } as const;
  if (value.status === 0) return { state: 'pending', label: 'Đang xét duyệt', description: 'Yêu cầu xác minh của bạn đã được gửi và đang chờ phê duyệt.', color: '#1769E0', background: '#EEF5FF' } as const;
  if (value.status === 2) return { state: 'rejected', label: 'Cần bổ sung', description: 'Yêu cầu xác minh cần được cập nhật. Nhấn để xem chi tiết.', color: '#B94824', background: '#FFF2EB' } as const;
  return { state: 'unverified', label: 'Chưa xác minh', description: 'Hoàn tất xác minh sinh viên để tăng độ tin cậy cho tài khoản.', color: '#C73542', background: '#FFF1F3' } as const;
}

export function validateStudentVerification(value: StudentVerificationDraft) {
  const errors: Partial<Record<keyof StudentVerificationDraft, string>> = {};
  if (value.fullName.trim().length < 2 || value.fullName.trim().length > 255) errors.fullName = 'Nhập họ và tên đúng theo giấy tờ (2–255 ký tự).';
  if (value.schoolName.trim().length < 2 || value.schoolName.trim().length > 255) errors.schoolName = 'Nhập tên trường đại học / cao đẳng (2–255 ký tự).';
  if (!/^[\p{L}\p{N}._\/-]{3,50}$/u.test(value.studentCode.trim())) errors.studentCode = 'Mã số sinh viên gồm 3–50 chữ, số hoặc các ký tự . _ / -.';
  return errors;
}

export function validateVerificationDocument(value: Pick<VerificationDocument, 'name' | 'mimeType' | 'size'>): string | null {
  if (!Number.isFinite(value.size) || value.size <= 0 || value.size > 5 * 1024 * 1024) return 'Chọn tệp không rỗng, dung lượng tối đa 5 MB.';
  const extension = value.name.split('.').pop()?.toLowerCase();
  const expected = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : extension === 'pdf' ? 'application/pdf' : null;
  if (!expected || (value.mimeType && value.mimeType !== expected)) return 'Chỉ hỗ trợ giấy tờ JPG, PNG hoặc PDF.';
  return null;
}
