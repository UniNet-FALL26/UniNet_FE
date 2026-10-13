const messages: Record<string, string> = {
  INVALID_TITLE: 'Tên dự án phải có từ 1 đến 255 ký tự.',
  INVALID_FIELD: 'Lĩnh vực dự án phải có từ 1 đến 255 ký tự.',
  INVALID_DESCRIPTION: 'Mô tả dự án phải có từ 1 đến 2.000 ký tự.',
  INVALID_MEMBER_TARGET: 'Số thành viên dự kiến phải từ 2 đến 10.',
  INVALID_DEADLINE: 'Hạn tuyển thành viên phải là thời điểm trong tương lai.',
  INVALID_EXPECTED_OUTPUT: 'Thời gian hoàn thành dự kiến phải là thời điểm trong tương lai.',
  INVALID_ROLE_REQUIREMENTS_TOTAL: 'Tổng số lượng tuyển phải bằng số thành viên dự kiến trừ đi 1 (người tạo dự án).',
  INVALID_ROLE_NAME: 'Tên vai trò phải có từ 1 đến 100 ký tự.',
  INVALID_ROLE_QUANTITY: 'Số lượng tuyển cho mỗi vai trò phải lớn hơn 0.',
  INVALID_ROLE_REQUIREMENTS: 'Yêu cầu cho vai trò không được để trống.',
  PROFILE_NOT_FOUND: 'Không tìm thấy hồ sơ người dùng.',
  PROJECT_LIMIT_REACHED: 'Bạn đã đạt giới hạn số dự án có thể đồng thời làm trưởng nhóm.',
  PROJECT_NOT_FOUND: 'Không tìm thấy dự án.',
  MODERATION_IN_PROGRESS: 'Dự án đang được kiểm duyệt. Vui lòng thử lại sau.',
  MODERATION_ALREADY_EXISTS: 'Dự án đã có lần kiểm duyệt đầu tiên.',
  INVALID_RECRUITMENT_STATUS: 'Trạng thái tuyển thành viên không hợp lệ.',
  INVALID_PROJECT_STATUS: 'Trạng thái dự án không hợp lệ.',
  CANNOT_DELETE_PROJECT: 'Chỉ có thể xóa dự án đã hết hạn và chưa có thành viên.',
  INITIAL_MODERATION_REQUIRED: 'Dự án chưa có lần kiểm duyệt đầu tiên.',
  MODERATION_AWAITING_REVIEW: 'Dự án đang chờ người kiểm duyệt xem xét.',
  INVALID_RESUBMISSION: 'Vui lòng chỉnh sửa nội dung dự án trước khi gửi duyệt lại.',
  MODERATION_NOT_FOUND: 'Dự án chưa có kết quả kiểm duyệt.',
  INVALID_ROLE: 'Vai trò phải có từ 1 đến 150 ký tự.',
  INVITEE_NOT_FOUND: 'Không tìm thấy hồ sơ người được mời.',
  CANNOT_INVITE_SELF: 'Bạn không thể mời chính mình vào dự án.',
  RECRUITMENT_CLOSED: 'Dự án đã ngừng tuyển thành viên.',
  PROJECT_FULL: 'Dự án đã đủ số lượng thành viên.',
  ROLE_NOT_REQUIRED: 'Dự án không tuyển vị trí này.',
  PROJECT_ROLE_FULL: 'Vị trí này đã đủ số lượng thành viên.',
  ALREADY_PROJECT_MEMBER: 'Người dùng đã là thành viên của dự án.',
  INVITATION_EXISTS: 'Người được mời đã có lời mời tham gia dự án đang chờ phản hồi.',
  INVITATION_CONFLICT: 'Dữ liệu đã thay đổi. Vui lòng thử lại.',
  INVITATION_NOT_FOUND: 'Không tìm thấy lời mời tham gia dự án.',
  INVALID_INVITATION_STATE: 'Chỉ có thể xử lý lời mời đang chờ phản hồi.',
  CANNOT_JOIN_OWN_PROJECT: 'Bạn không thể gửi yêu cầu hoặc nhận lời mời tham gia dự án do mình tạo.',
  JOIN_REQUEST_EXISTS: 'Bạn đang có một yêu cầu tham gia chưa được xử lí',
  JOIN_REQUEST_CONFLICT: 'Dữ liệu đã thay đổi. Vui lòng thử lại.',
  JOIN_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu tham gia dự án.',
  INVALID_JOIN_REQUEST_STATE: 'Chỉ có thể xử lý yêu cầu tham gia đang chờ duyệt.',
  CANNOT_KICK_CREATOR: 'Không thể loại người tạo dự án khỏi nhóm.',
  CREATOR_CANNOT_LEAVE: 'Người tạo dự án không thể rời dự án.',
  MEMBER_NOT_FOUND: 'Không tìm thấy thành viên dự án.',
  INVALID_MEMBER_STATE: 'Chỉ thành viên đang hoạt động mới có thể rời hoặc bị loại khỏi dự án.',
  MEMBER_CONFLICT: 'Dữ liệu đã thay đổi. Vui lòng thử lại.',
  INVALID_PAGINATION: 'Số trang phải lớn hơn 0 và số mục mỗi trang phải từ 1 đến 100.',
  INVALID_MODERATION_STATE: 'Lần kiểm duyệt này không còn chờ xem xét, đã được xử lý hoặc đã được thay thế.',
  REVIEW_NOTE_REQUIRED: 'Vui lòng nhập ghi chú giải thích lý do từ chối dự án.',
};

/** Only localize project errors; user content and AI moderation reasons are untouched. */
export function localizeProjectError(path: string, method: string, status: number, code: string | undefined, message: string): string {
  const route = path.split('?')[0].replace(/^\/api(?=\/)/, '');
  if (!/^\/(?:moderator\/)?projects(?:\/|$)/.test(route)) return message;
  if (status === 401) return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
  // Support older responses that contain a message without a code.
  if (!code && /^you already have a pending request[.!]?$/i.test(message.trim())) code = 'JOIN_REQUEST_EXISTS';
  if (code === 'PROJECT_LIMIT_REACHED') {
    const limit = message.match(/maximum of (\d+) ongoing projects/i)?.[1];
    return limit ? `Bạn chỉ có thể đồng thời làm trưởng nhóm tối đa ${limit} dự án đang diễn ra.` : messages[code];
  }
  if (code === 'INVALID_ROLE_REQUIREMENTS_TOTAL') {
    const quantity = message.match(/must equal (\d+)/i)?.[1];
    return quantity ? `Tổng số lượng tuyển phải bằng ${quantity} (số thành viên dự kiến trừ đi người tạo dự án).` : messages[code];
  }
  if (code === 'INVALID_STATUS') return route.includes('invitations') ? 'Trạng thái lời mời không hợp lệ.' : 'Trạng thái yêu cầu tham gia không hợp lệ.';
  if (code === 'INVALID_PROJECT_STATE') {
    if (route.endsWith('/moderation') || (route === '/projects' && method === 'POST')) return 'Chỉ có thể gửi duyệt dự án đang chờ duyệt hoặc đã bị từ chối.';
    if (method === 'PUT') return 'Chỉ có thể cập nhật dự án đang chờ duyệt, đã bị từ chối hoặc đang hoạt động và còn tuyển thành viên.';
    if (route.endsWith('/leave') || route.endsWith('/kick')) return 'Chỉ có thể rời hoặc loại thành viên khi dự án đang hoạt động.';
    return route.includes('join-requests') ? 'Dự án phải công khai và đang hoạt động để thực hiện thao tác này.' : 'Dự án phải đang hoạt động để thực hiện thao tác này.';
  }
  if (code === 'FORBIDDEN') {
    if (/only active student accounts/i.test(message)) return 'Chỉ tài khoản sinh viên đang hoạt động mới có thể thực hiện thao tác này. Vui lòng kiểm tra tài khoản của bạn và người được mời hoặc người gửi yêu cầu.';
    if (route.endsWith('/recommended-members')) return 'Chỉ người tạo dự án mới có thể xem đề xuất thành viên.';
    if (route.endsWith('/kick')) return 'Chỉ người tạo dự án mới có thể loại thành viên.';
    if (route.includes('invitations')) return /\/(accept|reject)$/.test(route) ? 'Chỉ người được mời mới có thể chấp nhận hoặc từ chối lời mời này.' : 'Chỉ người tạo dự án mới có thể gửi, xem hoặc hủy lời mời.';
    if (route.includes('join-requests')) return route.endsWith('/cancel') ? 'Bạn chỉ có thể hủy yêu cầu tham gia của mình.' : 'Chỉ người tạo dự án mới có thể xem và xử lý yêu cầu tham gia.';
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (code === 'UNAUTHORIZED') {
    if (method === 'PUT') return 'Chỉ người tạo dự án mới có thể cập nhật dự án.';
    if (method === 'DELETE') return 'Chỉ người tạo dự án mới có thể xóa dự án.';
    return 'Chỉ trưởng nhóm hoặc người tạo dự án mới có thể thực hiện thao tác này.';
  }
  if (code === 'PROFILE_NOT_FOUND' && route.startsWith('/moderator/')) return 'Không tìm thấy hồ sơ người kiểm duyệt.';
  if (code === 'ALREADY_PROJECT_MEMBER') return route.endsWith('/invitations') && method === 'POST' ? 'Người được mời đã là thành viên của dự án.' : 'Bạn đã là thành viên của dự án.';
  if (code && messages[code]) return messages[code];
  // Preserve Vietnamese server messages, but never expose unknown English errors.
  return /[À-ỹĐđ]/.test(message) ? message : 'Không thể thực hiện thao tác với dự án. Vui lòng thử lại.';
}
