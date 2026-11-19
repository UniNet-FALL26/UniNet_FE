type Body = Record<string, unknown>;
const record = (value: unknown): Body => value && typeof value === 'object' && !Array.isArray(value) ? value as Body : {};
const codeMessages: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng. Vui lòng dùng email khác.',
  ACCOUNT_PENDING: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email xác nhận.',
  ACCOUNT_SUSPENDED: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
  ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản này.',
  PROFILE_NOT_FOUND: 'Không tìm thấy hồ sơ người dùng.',
  INVALID_NAME: 'Tên hiển thị không hợp lệ. Vui lòng kiểm tra lại.',
  INVALID_NICKNAME: 'Tên người dùng không hợp lệ hoặc đã được sử dụng.',
  INVALID_PARTNER_TYPE: 'Vui lòng chọn loại đối tác hợp lệ.',
  INVALID_PORTFOLIO_EMAIL: 'Email liên hệ không đúng định dạng.',
  INVALID_PORTFOLIO_URL: 'Liên kết phải bắt đầu bằng http:// hoặc https://.',
  INVALID_EXPERIENCE: 'Số năm kinh nghiệm phải nằm trong khoảng từ 0 đến 80.',
  INVALID_SKILL_REFERENCE: 'Một kỹ năng đã thay đổi hoặc không còn tồn tại. Vui lòng chọn lại.',
  DUPLICATE_SKILL: 'Kỹ năng này đã có trong danh sách.',
  VERIFICATION_ALREADY_PENDING: 'Hồ sơ xác minh đang chờ duyệt. Bạn không cần gửi lại.',
  PARTNER_ALREADY_VERIFIED: 'Tổ chức đã được xác minh.',
  INVALID_VERIFICATION_DOCUMENTS: 'Vui lòng bổ sung đầy đủ giấy tờ xác minh.',
  INVALID_VERIFICATION_DOCUMENT: 'Giấy tờ xác minh không hợp lệ. Vui lòng chọn lại tệp.',
  STUDENT_PROFILE_REQUIRED: 'Vui lòng hoàn thiện hồ sơ sinh viên trước khi tiếp tục.',
  GOOGLE_NOT_CONFIGURED: 'Đăng nhập Google hiện chưa khả dụng. Vui lòng dùng email và mật khẩu.',
  INVALID_GOOGLE_TOKEN: 'Không xác nhận được tài khoản Google. Vui lòng đăng nhập lại.',
  INVALID_REFRESH_TOKEN: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
  REFRESH_TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
};
const fieldNames: Record<string, string> = { ContactEmail: 'Email liên hệ', Email: 'Email', Phone: 'Số điện thoại', OrganizationName: 'Tên tổ chức', FullName: 'Họ tên', Password: 'Mật khẩu', ConfirmPassword: 'Xác nhận mật khẩu', Description: 'Nội dung', Title: 'Tiêu đề', Address: 'Địa chỉ', File: 'Tệp ảnh' };

/** Accept human Vietnamese messages, never transport diagnostics, stack traces or machine codes. */
export function readableApiMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > 800 || !/[\u00C0-\u1EF9]/.test(text)) return null;
  if (/<\/?[a-z][^>]*>|\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|Exception|StackTrace|SQLSTATE|SqlException|Npgsql|DbUpdate|System\.|invalid column|syntax error|status code|\.(?:cs|ts|js):\d+|\bat \S+\(|[A-Za-z]:\\|\b(?:SELECT|INSERT|UPDATE|DELETE)\s.+\b(?:FROM|INTO|SET)\b/i.test(text)) return null;
  return text;
}
function subject(path: string) {
  if (/\/profile\/partner/.test(path)) return 'hồ sơ đối tác';
  if (/\/profile|\/portfolio/.test(path)) return 'hồ sơ';
  if (/\/images|\/files|\/ai-images/.test(path)) return 'ảnh hoặc tệp đính kèm';
  if (/\/applications|\/applicants/.test(path)) return 'hồ sơ ứng tuyển';
  if (/\/reports|\/task-reports/.test(path)) return 'báo cáo công việc';
  if (/\/tasks/.test(path)) return 'công việc';
  if (/\/campaigns|\/advertisements|\/ads/.test(path)) return 'quảng cáo';
  if (/\/payments|\/checkout/.test(path)) return 'yêu cầu thanh toán';
  if (/\/partner\/jobs/.test(path)) return 'bài tuyển dụng';
  if (/\/comments|\/replies/.test(path)) return 'bình luận';
  if (/\/community/.test(path)) return 'bài viết cộng đồng';
  if (/\/verification/.test(path)) return 'hồ sơ xác minh';
  if (/\/projects/.test(path)) return 'dự án';
  if (/\/notifications/.test(path)) return 'thông báo';
  if (/\/auth/.test(path)) return 'tài khoản';
  return 'yêu cầu của bạn';
}
export function apiErrorMessage(path: string, status: number | undefined, value: unknown): string {
  const body = record(value), nested = record(body.error);
  const messages = Object.entries(record(body.errors)).flatMap(([field, errors]) => {
    const label = fieldNames[field.split('.').pop() || field] || 'Thông tin đã nhập';
    return (Array.isArray(errors) ? errors : [errors]).map(error => readableApiMessage(error) || (typeof error === 'string' && /required|empty/i.test(error) ? `${label} không được để trống.` : `${label} không hợp lệ. Vui lòng kiểm tra lại.`));
  });
  if (messages.length) return [...new Set(messages)].slice(0, 3).join(' ');
  const message = readableApiMessage(body.message ?? nested.message ?? body.detail);
  if (message) return message;
  const code = typeof body.code === 'string' ? body.code : typeof nested.code === 'string' ? nested.code : undefined;
  if (code && codeMessages[code]) return codeMessages[code];
  if (status === 401) return path.split('?')[0] === '/auth/login' ? 'Email hoặc mật khẩu không chính xác.' : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return `Bạn không có quyền thực hiện thao tác với ${subject(path)}.`;
  if (status === 404) return `Không tìm thấy ${subject(path)}. Nội dung có thể đã bị xóa hoặc không còn truy cập được.`;
  if (status === 409) return `${subject(path).charAt(0).toUpperCase() + subject(path).slice(1)} đã thay đổi hoặc bị trùng. Vui lòng tải lại và thử lại.`;
  if (status === 413) return 'Tệp vượt quá dung lượng cho phép. Với ảnh hồ sơ, vui lòng chọn ảnh tối đa 5 MB.';
  if (status === 415) return 'Định dạng tệp chưa được hỗ trợ. Với ảnh, vui lòng chọn JPG, PNG hoặc WebP.';
  if (status === 429) return 'Bạn thao tác quá nhiều lần liên tiếp. Vui lòng đợi một chút rồi thử lại.';
  if (status === 400 || status === 422) return `Thông tin ${subject(path)} chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.`;
  if (status && status >= 500) return `Không thể xử lý ${subject(path)} vì dịch vụ đang gặp sự cố. Vui lòng thử lại sau.`;
  return `Không thể xử lý ${subject(path)}. Vui lòng kiểm tra kết nối và thử lại.`;
}
export function apiSuccessMessage(path: string, method: string, result?: unknown): string {
  const server = readableApiMessage(record(result).message);
  if (server) return server;
  if (/\/auth\/login|\/auth\/google/.test(path)) return 'Đăng nhập thành công.';
  if (/\/auth\/register/.test(path)) return 'Đăng ký tài khoản thành công.';
  if (/\/profile\/partner/.test(path)) return 'Đã cập nhật hồ sơ đối tác.';
  if (/\/profile\/.*display/.test(path)) return 'Đã cập nhật cách hiển thị hồ sơ.';
  if (/\/profile|\/portfolio/.test(path)) return 'Đã lưu hồ sơ.';
  if (/\/react|\/favorite/.test(path)) return 'Đã cập nhật lượt thích.';
  if (/\/bookmark/.test(path)) return 'Đã cập nhật bài viết đã lưu.';
  if (/\/read-all/.test(path)) return 'Đã đánh dấu tất cả thông báo là đã đọc.';
  if (/\/read$/.test(path)) return 'Đã đánh dấu thông báo là đã đọc.';
  const action = method === 'DELETE' ? 'xóa' : method === 'POST' ? 'gửi' : 'cập nhật';
  return `Đã ${action} ${subject(path)} thành công.`;
}
export function apiFeedbackPolicy(path: string, method: string) {
  const route = path.split('?')[0].replace(/^\/api(?=\/)/, '');
  const background = /^\/auth\/(?:me|refresh)$|\/notifications\/unread-count$|\/release$/.test(route);
  const intermediate = /^\/(?:images|files|ai-images)(?:\/|$)/.test(route);
  return { success: !background && !intermediate && !['GET', 'HEAD', 'OPTIONS'].includes(method), error: !background };
}
