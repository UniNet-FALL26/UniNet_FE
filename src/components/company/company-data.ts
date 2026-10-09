export type CompanyJob = {
  id: string;
  title: string;
  department: string;
  workplace: string;
  location: string;
  deadline: string;
  applicants: number;
  status: 'Đã đăng' | 'Bản nháp' | 'Đã đóng' | 'Hết hạn';
  updated: string;
  salary: string;
};

export const companyJobs: CompanyJob[] = [
  { id: 'job-1', title: 'Thực tập sinh Data Analyst', department: 'Phân tích dữ liệu', workplace: 'Kết hợp', location: 'TP. Hồ Chí Minh', deadline: '10/10/2026', applicants: 12, status: 'Đã đăng', updated: '05/10/2026', salary: '5–7 triệu đ/tháng' },
  { id: 'job-2', title: 'Thực tập sinh Frontend React', department: 'Sản phẩm & Kỹ thuật', workplace: 'Kết hợp', location: 'TP. Hồ Chí Minh', deadline: '20/10/2026', applicants: 18, status: 'Đã đăng', updated: '06/10/2026', salary: '4–6 triệu đ/tháng' },
  { id: 'job-3', title: 'UI/UX Designer Fresher', department: 'Thiết kế sản phẩm', workplace: 'Từ xa', location: 'Việt Nam', deadline: '25/10/2026', applicants: 6, status: 'Đã đăng', updated: '04/10/2026', salary: '10–14 triệu đ/tháng' },
  { id: 'job-4', title: 'Thực tập sinh Backend Node.js', department: 'Sản phẩm & Kỹ thuật', workplace: 'Văn phòng', location: 'TP. Hồ Chí Minh', deadline: '30/10/2026', applicants: 0, status: 'Bản nháp', updated: '06/10/2026', salary: '4–6 triệu đ/tháng' },
  { id: 'job-5', title: 'Thực tập sinh Marketing', department: 'Truyền thông', workplace: 'Văn phòng', location: 'TP. Hồ Chí Minh', deadline: '30/09/2026', applicants: 3, status: 'Đã đóng', updated: '29/09/2026', salary: 'Thỏa thuận' },
  { id: 'job-6', title: 'Thực tập sinh QA Tester', department: 'Đảm bảo chất lượng', workplace: 'Kết hợp', location: 'TP. Hồ Chí Minh', deadline: '01/10/2026', applicants: 1, status: 'Hết hạn', updated: '02/10/2026', salary: '4–6 triệu đ/tháng' },
];

export const companyApplicants = [
  { initials: 'TL', name: 'Trần Thảo Linh', school: 'ĐH Công nghệ Thông tin', date: '06/10 · 10:15', job: 'Thực tập sinh Frontend React', skills: ['React', 'TypeScript'], project: 'BookNest · trao đổi sách', note: 'Giao diện tìm kiếm và chi tiết sách', status: 'Chờ xem' },
  { initials: 'GH', name: 'Phạm Gia Hoàng', school: 'ĐH Bách khoa TP.HCM', date: '06/10 · 08:30', job: 'Thực tập sinh Frontend React', skills: ['React', 'JavaScript'], project: 'GreenCart · mua sắm bền vững', note: 'Giỏ hàng và luồng thanh toán', status: 'Chờ xem' },
  { initials: 'MA', name: 'Nguyễn Minh Anh', school: 'ĐH Công nghệ Thông tin', date: '04/10 · 09:20', job: 'Thực tập sinh Data Analyst', skills: ['React', 'TypeScript', 'Git'], project: 'UniTask · quản lý công việc', note: 'Xây dựng bảng Kanban và bộ lọc', status: 'Phỏng vấn' },
  { initials: 'QB', name: 'Lê Quốc Bảo', school: 'ĐH Sư phạm Kỹ thuật TP.HCM', date: '03/10 · 15:10', job: 'UI/UX Designer Fresher', skills: ['React', 'CSS', 'Git'], project: 'CampusGo · hoạt động sinh viên', note: 'Lịch sự kiện và trang đăng ký', status: 'Đã xem' },
  { initials: 'BN', name: 'Võ Bảo Ngọc', school: 'ĐH Khoa học Tự nhiên', date: '02/10 · 11:45', job: 'Thực tập sinh Data Analyst', skills: ['Python', 'SQL'], project: 'StudySpace · học nhóm', note: 'Phòng học và trạng thái trực tuyến', status: 'Chấp nhận' },
  { initials: 'TD', name: 'Đỗ Tiến Dũng', school: 'ĐH Văn Lang', date: '01/10 · 16:30', job: 'Thực tập sinh Backend Node.js', skills: ['JavaScript', 'CSS'], project: 'LocalTrip · khám phá địa phương', note: 'Trang địa điểm và bản đồ', status: 'Từ chối' },
];
