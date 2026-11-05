export type NavigationCrumb = { label: string; href?: string };
export type DetailRoute = { crumbs: NavigationCrumb[]; fallback: string };
const crumb = (label: string, href?: string): NavigationCrumb => ({ label, href });

export function detailNavigation(pathname: string, role = 0, params: { id?: string; projectId?: string; jobId?: string; template?: string; theme?: string } = {}): DetailRoute | null {
  const profile = role === 1 ? '/(company)/profile' : role === 2 ? '/(assessor)/assessor-profile' : '/(tabs)/profile';
  const personal = crumb(role === 0 ? 'Cá nhân' : 'Hồ sơ', profile);
  const projects = crumb('Dự án', '/(tabs)/groups');
  const verificationRecord = /^\/group\/(checkout|verification-dossier|verification-meeting|verification-result)\//.test(pathname);
  const projectId = params.projectId || (!verificationRecord ? params.id || pathname.split('/').pop() : undefined);
  const project = crumb('Chi tiết dự án', projectId ? `/group/${encodeURIComponent(projectId)}` : undefined);
  const make = (crumbs: NavigationCrumb[], fallback?: string): DetailRoute => ({ crumbs, fallback: fallback || crumbs.slice(0, -1).reverse().find(item => item.href)?.href || profile });
  if (pathname === '/settings') return make([personal, crumb('Cài đặt')]);
  if (pathname === '/company') return make([personal, crumb('Tổng quan đối tác')]);
  if (pathname === '/wallet') return make([personal, crumb('Ví thu nhập')]);
  if (pathname === '/job-detail') return make([crumb('Quản lý bài đăng', '/(company)/jobs'), crumb('Chi tiết')]);
  if (pathname === '/create') return make([crumb('Quản lý bài đăng', '/(company)/jobs'), crumb(params.id || params.jobId ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng')]);
  if (pathname === '/verification') return make([personal, crumb('Xác minh tổ chức')]);
  if (pathname === '/advertisement') return make([personal, crumb('Quảng cáo')]);
  if (pathname === '/assessor-availability') return make([crumb('Danh sách thẩm định', '/(assessor)/assessor-assessments'), crumb('Lịch nhận thẩm định')]);
  if (pathname.startsWith('/assessor-assessments/')) return make([crumb('Danh sách thẩm định', '/(assessor)/assessor-assessments'), crumb('Chi tiết thẩm định')]);
  if (pathname.startsWith('/workspace/')) return make([crumb('Không gian làm việc', '/(tabs)/workspace'), crumb('Công việc dự án')]);
  if (pathname.startsWith('/post/')) return make([crumb('Cộng đồng', role === 1 ? '/(company)/company-community' : role === 2 ? '/(assessor)/assessor-community' : '/(tabs)'), crumb('Bài viết')]);
  if (pathname.startsWith('/profile/view/')) return make([crumb('Cộng đồng', '/(tabs)'), crumb('Hồ sơ sinh viên')]);
  if (pathname.startsWith('/profile/')) {
    const appearance = new URLSearchParams();
    if (params.template) appearance.set('template', params.template);
    if (params.theme) appearance.set('theme', params.theme);
    const preview = '/profile/preview' + (appearance.size ? `?${appearance}` : '');
    const crumbs = [personal, crumb('Mẫu hồ sơ', '/profile/templates')];
    if (pathname === '/profile/templates') return make([personal, crumb('Mẫu hồ sơ')]);
    if (pathname === '/profile/preview') return make([...crumbs, crumb('Xem trước')]);
    if (pathname === '/profile/editor') return make([...crumbs, crumb('Xem trước', preview), crumb('Chỉnh sửa hồ sơ')]);
  }
  if (pathname === '/cv' || pathname.startsWith('/cv/')) {
    const label = pathname === '/cv/templates' ? 'Mẫu CV' : pathname === '/cv/manage' ? 'Quản lý CV' : 'Chi tiết CV';
    return make(pathname === '/cv' ? [personal, crumb('CV')] : [personal, crumb('CV', '/cv'), crumb(label)]);
  }
  if (pathname === '/payment/result') return make([projects, crumb('Kết quả thanh toán')], '/(tabs)/groups');
  if (pathname.startsWith('/group/')) {
    const section = pathname.split('/')[2];
    if (section === 'create') return make([projects, crumb('Tạo dự án')]);
    if (section === 'recommendations') return make([projects, crumb('Tạo dự án', '/group/create'), crumb('Gợi ý thành viên')]);
    if (section === 'import') return make([projects, crumb('Thêm dự án có sẵn')]);
    if (section === 'external-draft') return make([projects, crumb('Thêm dự án có sẵn', '/group/import'), crumb('Xem lại hồ sơ')]);
    const labels: Record<string, string> = { level1: 'Kết quả kiểm tra cấp 1', verification: 'Chọn lịch xác minh', checkout: 'Thanh toán xác minh', 'verification-dossier': 'Hồ sơ thẩm định', 'verification-meeting': 'Phòng thẩm định', 'verification-result': 'Kết quả thẩm định' };
    if (labels[section]) {
      const parent = crumb('Hồ sơ thẩm định', `/group/verification-dossier/${encodeURIComponent(params.id || pathname.split('/')[3] || '')}`);
      return make([projects, project, ...(['verification-meeting', 'verification-result'].includes(section) ? [parent] : []), crumb(labels[section])]);
    }
    return make([projects, crumb('Chi tiết dự án')]);
  }
  const secondary: Record<string, string> = { '/groups': 'Nhóm dự án', '/skills': 'Kỹ năng', '/learning': 'Học tập', '/documents': 'Tài liệu', '/events': 'Sự kiện', '/explore': 'Khám phá', '/more': 'Tiện ích' };
  return secondary[pathname] ? make([crumb('Cộng đồng', '/(tabs)'), crumb(secondary[pathname])]) : null;
}
