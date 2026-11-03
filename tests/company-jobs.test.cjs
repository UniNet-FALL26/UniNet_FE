const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const web = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server');

const sampleJob = { id: 'job-1', title: 'IT Fullstack developer', workType: 0, employmentType: 0, jobField: 'IT', location: 'HCM', status: 1, applicantCount: 4, minSalaryVnd: 4000000, maxSalaryVnd: 6000000, deadline: '2026-11-10', updatedAt: '2026-10-27' };

function setup(width = 1440, reply = {}, detail = false) {
  const state = [], requests = [], routes = [], actions = [];
  let cursor = 0, effect, timer;
  const box = ({ children, style }) => React.createElement(web.View, { style }, children);
  const services = {
    companyService: {
      listJobs: async params => { requests.push(params); return { totalItems: 21, totalPages: 3, jobs: [sampleJob], ...reply }; },
      deleteJob: async id => actions.push(['delete', id]),
      updateJobStatus: async (...args) => actions.push(args),
      getJob: async () => ({ ...sampleJob, description: 'Phát triển ứng dụng web.', skills: [], benefits: [], requiredQualifications: [], preferredQualifications: [], projectAreas: [], ...reply }),
      listApplicants: async () => reply.applicants ?? [],
      getProfile: async () => ({ avatarUrl: null }),
    },
    companyJobWorkTypeLabel: { 0: 'Tại văn phòng' }, companyJobStatusLabel: { 0: 'Bản nháp', 1: 'Đã đăng', 2: 'Đã đóng' }, companyJobEmploymentTypeLabel: { 0: 'Toàn thời gian' },
    companyJobApplicationStatusLabel: { 0: 'Chờ xem', 1: 'Đã xem', 2: 'Phỏng vấn', 3: 'Đã nhận', 4: 'Từ chối' },
    formatCompanyDate: value => value === '2026-11-10' ? '10/11/2026' : '27/10/2026',
    formatCompanySalary: () => '4 – 6 triệu VND/tháng',
  };
  const exports = {};
  if (detail) services.companyService.updateJobStatus = async (id, status) => { actions.push([id, status]); return { ...await services.companyService.getJob(), status }; };
  services.companyService.updateApplicantStatus = async (jobId, applicantId, status) => {
    actions.push(['applicant', jobId, applicantId, status]);
    if (reply.failApplicantUpdate) throw new Error('Không cập nhật được hồ sơ.');
    return { ...reply.applicants.find(applicant => applicant.id === applicantId), status };
  };
  const source = ts.transpileModule(fs.readFileSync(`src/app/(company)/${detail ? 'job-detail' : 'jobs'}.tsx`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, AbortController, Error, setTimeout: fn => { timer = fn; return 1; }, clearTimeout() {}, require: name => {
    if (name === 'react') return { ...React, useCallback: fn => fn, useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } };
    if (name === 'react-native') return { ...web, useWindowDimensions: () => ({ width, height: 800 }), Platform: { OS: 'web' } };
    if (name === 'expo-router') return { router: { push: route => routes.push(route), replace: route => routes.push(route), back: () => routes.push('back') }, useLocalSearchParams: () => ({ jobId: sampleJob.id }), useFocusEffect: fn => { effect = fn; } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: box };
    if (name === '@/components/profile/ProfileTemplateRenderer') return { ProfileTemplateRenderer: box };
    if (name === '@/data/profile-templates') return { getProfileTemplate: () => ({ id: 'default' }), getProfileTheme: () => ({}) };
    if (name === '@/services/company.service') return services;
    if (name === '@/constants/job-applicant-icons') return { jobApplicationIcons: new Proxy({}, { get: () => ({ web: 'work' }) }) };
    if (name === '@/components/company/company-ui') return {
      CompanyPage: ({ children }) => React.createElement(web.View, { style: { flex: 1, minHeight: 0 } }, children),
      PageTitle: ({ title, subtitle }) => React.createElement(web.View, null, React.createElement(web.Text, null, title), React.createElement(web.Text, null, subtitle)),
      PageScroll: ({ children, contentStyle }) => React.createElement(web.View, { style: contentStyle }, children),
      Card: ({ children, style }) => React.createElement(web.View, { style: [{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2eaf3', padding: 14, borderRadius: 16 }, style] }, children),
      Tag: ({ children }) => React.createElement(web.Text, null, children),
      CompanyIcon: () => React.createElement(web.View, { style: { width: 18, height: 18, borderWidth: 1, borderColor: '#7c90aa', borderRadius: 4 } }),
      ActionButton: ({ title, onPress }) => React.createElement(web.Pressable, { onPress }, React.createElement(web.Text, null, title)),
      companyColors: { ink: '#15243b', muted: '#74859e', line: '#e2eaf3', blue: '#0866ef', purpleSoft: '#eaf3ff', rose: '#e34c55' },
    };
    return require(name);
  } });
  const render = () => { cursor = 0; return exports.default(); };
  function find(tree, predicate) {
    if (!tree || typeof tree !== 'object' || tree.props?.visible === false) return;
    if (predicate(tree.props ?? {})) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const match = find(child, predicate); if (match) return match; }
  }
  const textContent = children => React.Children.toArray(children).map(child => typeof child === 'object' ? textContent(child.props?.children) : child).join('');
  return { state, requests, routes, actions, render, html: () => renderToStaticMarkup(render()),
    control: label => find(render(), props => props.accessibilityLabel === label),
    click: label => { const node = find(render(), props => props.onPress && (props.accessibilityLabel === label || props.title === label || textContent(props.children) === label)); assert.ok(node, label); assert.ok(!node.props.disabled, label); return node.props.onPress(); },
    search: value => find(render(), props => props.accessibilityLabel === 'Tìm bài đăng tuyển dụng').props.onChangeText(value),
    load: async () => { render(); effect(); if (timer) timer(); await new Promise(resolve => setImmediate(resolve)); },
  };
}

test('desktop shows reference columns, real job values and pagination', async () => {
  const app = setup(); await app.load();
  const html = app.html();
  for (const text of ['Quản lý bài đăng tuyển dụng', 'Bộ lọc nâng cao', 'IT Fullstack developer', 'Tại văn phòng', '4 hồ sơ', 'Hiển thị 1 – 10 trong tổng số 21 bài đăng']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Sắp hết hạn'));
  assert.equal(app.requests[0].pageSize, 10);
  app.click(`Xem ${sampleJob.applicantCount} hồ sơ của ${sampleJob.title}`);
  assert.equal(app.routes.at(-1).pathname, '/(company)/job-detail');
  assert.equal(app.routes.at(-1).params.jobId, sampleJob.id);
  app.click('Trang sau'); await app.load();
  assert.equal(app.requests.at(-1).page, 2);
  app.search('Fullstack'); await app.load();
  assert.equal(app.requests.at(-1).page, 1);
  assert.equal(app.requests.at(-1).keyword, 'Fullstack');
});

test('advanced status and page size reset pagination and reach the service', async () => {
  const app = setup(); await app.load(); app.click('Trang sau'); await app.load();
  assert.ok(!app.html().includes('Trạng thái bài đăng'));
  app.click('Bộ lọc nâng cao');
  assert.ok(app.html().includes('role="menu"'));
  app.click('Bản nháp'); await app.load();
  assert.ok(!app.html().includes('Trạng thái bài đăng'));
  assert.equal(app.requests.at(-1).status, 0); assert.equal(app.requests.at(-1).page, 1);
  app.click('Số bài đăng mỗi trang'); app.click('20 bài đăng mỗi trang'); await app.load();
  assert.equal(app.requests.at(-1).pageSize, 20); assert.equal(app.requests.at(-1).page, 1);
  app.click('Bộ lọc nâng cao (1)'); app.click('Bản nháp');
  app.click('Số bài đăng mỗi trang'); app.click('20 bài đăng mỗi trang');
  assert.ok(!app.html().includes('Đang tải bài đăng…'));
});

test('empty results disable paging and mobile preserves cards', async () => {
  const empty = setup(1440, { totalItems: 0, totalPages: 0, jobs: [] }); await empty.load();
  assert.ok(empty.html().includes('Hiển thị 0 – 0 trong tổng số 0 bài đăng'));
  assert.ok(empty.html().includes('Chưa có bài đăng phù hợp'));
  const mobile = setup(390); await mobile.load();
  for (const text of ['IT Fullstack developer', 'Toàn thời gian', 'Ứng viên']) assert.ok(mobile.html().includes(text));
  assert.ok(!mobile.html().includes('>Chi tiết<'));
  assert.ok(!mobile.html().includes('>Sửa<'));
  mobile.click('Bộ lọc nâng cao');
  assert.ok(mobile.html().includes('role="menu"'));
  mobile.click('Tất cả');
  for (const label of ['Xem chi tiết bài đăng', 'Chỉnh sửa bài đăng', 'Đóng bài đăng', 'Xóa bài đăng']) assert.ok(!mobile.html().includes(`aria-label="${label}"`));
  mobile.click(`Xem chi tiết ${sampleJob.title}`);
  assert.equal(mobile.routes.at(-1).params.jobId, sampleJob.id);
  assert.equal(mobile.routes.at(-1).pathname, '/(company)/job-detail');
  assert.equal(mobile.actions.length, 0);
});

test('delete is confirmed and missing last page moves to the previous page', async () => {
  const reply = {};
  const app = setup(1440, reply); await app.load(); app.click('Trang sau'); await app.load();
  app.click('Xóa bài đăng'); assert.equal(app.actions.length, 0);
  assert.ok(app.html().includes('Xóa bài tuyển dụng?'));
  app.click('Hủy'); assert.equal(app.actions.length, 0);
  app.click('Xóa bài đăng'); await app.click('Xóa bài');
  assert.equal(app.actions[0][0], 'delete'); assert.equal(app.actions[0][1], sampleJob.id);
  Object.assign(reply, { totalPages: 1, totalItems: 10, jobs: [] });
  await app.load(); await app.load();
  assert.equal(app.requests.at(-1).page, 1);
});

test('detail header actions edit and confirm close/reopen/delete', async () => {
  const app = setup(1440, {}, true); await app.load();
  app.click('Chỉnh sửa bài đăng');
  assert.equal(app.routes.at(-1).params.jobId, sampleJob.id);
  app.click('Đóng bài đăng'); assert.equal(app.actions.length, 0);
  app.click('Hủy thao tác bài đăng'); assert.equal(app.actions.length, 0);
  app.click('Đóng bài đăng'); await app.click('Xác nhận thao tác bài đăng');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.actions.at(-1)[1], 2);
  app.click('Mở lại bài đăng'); await app.click('Xác nhận thao tác bài đăng');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.actions.at(-1)[1], 1);
  app.click('Xóa bài đăng'); assert.equal(app.actions.length, 2);
  await app.click('Xác nhận thao tác bài đăng');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.actions.at(-1)[0], 'delete');
  assert.equal(app.routes.at(-1), '/(company)/jobs');
});

test('phone detail header stays outside scrolling content with back and job actions', async () => {
  const app = setup(390, {}, true); await app.load();
  const children = React.Children.toArray(app.render().props.children);
  assert.equal(children[0].props.testID, 'job-detail-mobile-header');
  assert.equal(children[1].type, web.ScrollView);
  assert.ok(!app.html().includes('Quản lý bài đăng'));
  app.click('Quay lại'); assert.equal(app.routes.at(-1), 'back');
  app.click('Chỉnh sửa bài đăng'); assert.equal(app.routes.at(-1).params.jobId, sampleJob.id);
  app.click('Đóng bài đăng'); assert.equal(app.actions.length, 0);
});

const sampleApplicant = { id: 'applicant-1', fullName: 'Trịnh Trọng Quyền', nickname: 'Quyền', universityName: 'Đại học FPT HCM', appliedAt: '2026-10-27', applicationRound: 1, status: 0, submittedPortfolio: { portfolio: { appearance: { profile: {} } } } };

test('compact applicant cards open submitted CV and confirm status transitions', async () => {
  const app = setup(390, { applicants: [sampleApplicant] }, true); await app.load();
  for (const text of [sampleApplicant.fullName, sampleApplicant.universityName, 'Lần 1', 'Xem hồ sơ đã nộp', 'CẬP NHẬT TRẠNG THÁI']) assert.ok(app.html().includes(text), text);
  assert.ok(!app.html().includes('Quản lý hồ sơ'));
  app.click(`Xem hồ sơ đã nộp của ${sampleApplicant.fullName}`); app.click('Đóng CV');
  const viewed = `Chuyển ${sampleApplicant.fullName} sang Đã xem`;
  app.click(viewed); assert.equal(app.actions.length, 0);
  app.click('Hủy cập nhật trạng thái'); assert.equal(app.actions.length, 0);
  app.click(viewed); app.click('Xác nhận cập nhật trạng thái');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.stringify(app.actions[0]), JSON.stringify(['applicant', sampleJob.id, sampleApplicant.id, 1]));
  assert.equal(app.control(`Chuyển ${sampleApplicant.fullName} sang Chờ xem`).props.disabled, true);
  app.click(`Chuyển ${sampleApplicant.fullName} sang Đã nhận`); app.click('Xác nhận cập nhật trạng thái');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.control(`Chuyển ${sampleApplicant.fullName} sang Từ chối`).props.disabled, true);
});

test('missing submitted CV is disabled and failed status update keeps confirmation open', async () => {
  const app = setup(768, { applicants: [{ ...sampleApplicant, submittedPortfolio: null }], failApplicantUpdate: true }, true); await app.load();
  assert.equal(app.control(`Xem hồ sơ đã nộp của ${sampleApplicant.fullName}`).props.disabled, true);
  app.click(`Chuyển ${sampleApplicant.fullName} sang Phỏng vấn`); app.click('Xác nhận cập nhật trạng thái');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(app.control('Xác nhận cập nhật trạng thái'));
  assert.ok(app.state.includes('Không cập nhật được hồ sơ.'));
  const desktop = setup(1440, { applicants: [sampleApplicant] }, true); await desktop.load();
  assert.ok(desktop.html().includes('Ngày ứng tuyển'));
  assert.ok(!desktop.html().includes('CẬP NHẬT TRẠNG THÁI'));
});

if (process.env.JOBS_PREVIEW_PATH) {
  (async () => {
    const app = setup(Number(process.env.JOBS_PREVIEW_WIDTH) || 1440, { totalItems: 1, totalPages: 1, applicants: [sampleApplicant] }, !!process.env.JOBS_PREVIEW_DETAIL); await app.load();
    if (process.env.JOBS_PREVIEW_FILTERS) app.click('Bộ lọc nâng cao');
    const html = app.html(); const sheet = web.StyleSheet.getSheet();
    fs.writeFileSync(process.env.JOBS_PREVIEW_PATH, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${sheet.textContent}body{margin:0;background:#f5f9ff;font-family:Arial,sans-serif;display:flex;flex-direction:column;height:100vh}*{box-sizing:border-box}</style>${html}`);
  })();
}
