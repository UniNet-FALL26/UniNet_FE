const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = ts.transpileModule(fs.readFileSync('src/components/projects/ProjectDetailView.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const types = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/types/project.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: types });
function detail(overrides = {}) {
  return { id: 'project', title: 'CloudOps', projectField: 'Cloud', description: 'Monitoring', status: 1, recruitmentStatus: 0, visibility: 1, memberTarget: 3, currentMemberCount: 2, creator: { id: 'creator', fullName: 'Creator' }, roleRequirements: [{ id: 'role', roleName: 'DevOps', quantity: 1, requirements: 'Docker' }], skills: [], members: [{ userId: 'creator', fullName: 'Creator', role: 'Leader' }, { userId: 'member', fullName: 'Member', role: 'Dev' }], invitations: [], joinRequests: [], isCreator: false, isMember: false, ...overrides };
}
function harness(project, operations = {}) {
  let cursor = 0;
  const state = [project, [], false, false, 0, 'DevOps', '', null, null, false, null];
  const ref = { current: false };
  const calls = [];
  const buttons = [];
  const service = new Proxy({}, { get: (_, name) => async (...args) => { calls.push([name, args]); return operations[name] ? operations[name](...args) : { id: 'result', status: 1 }; } });
  const native = require('react-native-web');
  const exports = {};
  vm.runInNewContext(source, { exports, Error, require(name) {
    if (name === 'react') return { ...React, useState: (initial) => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; }, useEffect: () => {}, useMemo: fn => fn(), useRef: () => ref };
    if (name === 'react-native') return { ...native, Modal: ({ visible, children }) => visible ? React.createElement('div', null, children) : null };
    if (name === 'expo-router') return { router: { back() {}, replace() {} }, useLocalSearchParams: () => ({ id: 'project' }) };
    if (name === '@/store/auth.store') return { useAuthStore: () => ({ account: { id: 'viewer' } }) };
    if (name === '@/services/project.service') return { projectService: service };
    if (name === '@/types/project') return types;
    if (name === '@/constants/colors') return { colors: { navy: '#000', border: '#ddd', primary: '#123', surface: '#fff' } };
    if (name === '@/components/ui/Button') return { Button: props => { buttons.push(props); return React.createElement('button', { disabled: props.disabled || props.loading }, props.title); } };
    if (name === '@/components/ui/Input') return { Input: () => React.createElement('input') };
    if (name === '@/components/ui/Loading') return { Loading: () => React.createElement('span', null, 'Loading') };
    if (name === '@/components/projects/ProjectEditForm') return { ProjectEditForm: () => React.createElement('div', null, 'Edit form') };
    if (name === '@/components/projects/RecommendedMemberCard') return { RecommendedMemberCard: () => React.createElement('div', null, 'Recommendation') };
    return require(name);
  } });
  const render = () => { cursor = 0; buttons.length = 0; return renderToStaticMarkup(React.createElement(exports.ProjectDetailScreen)); };
  const click = title => { const button = buttons.find(item => item.title === title); assert.ok(button, `Missing ${title}`); assert.ok(!button.disabled && !button.loading); return button.onPress(); };
  return { render, click, calls, state, buttons };
}
test('active creator sees management and excludes the creator from kick controls', () => {
  const h = harness(detail({ isCreator: true, invitations: [{ id: 'invite', inviteeFullName: 'Invitee', status: 0 }], joinRequests: [{ id: 'request', fullName: 'Applicant', status: 0 }] }));
  const html = h.render();
  for (const label of ['Xóa thành viên', 'Hủy lời mời', 'Đồng ý', 'Từ chối', 'Gợi ý thành viên']) assert.ok(html.includes(label));
  assert.equal(h.buttons.filter(item => item.title === 'Xóa thành viên').length, 1);
  assert.ok(!html.includes('Gửi đơn ứng tuyển'));
});
test('member sees leave; invitee sees invitation decisions; applicant sees cancellation', () => {
  const member = harness(detail({ isMember: true })).render();
  assert.ok(member.includes('Rời dự án'));
  assert.ok(!member.includes('Gửi đơn ứng tuyển'));
  const invitee = harness(detail({ invitations: [{ id: 'invite', inviteeId: 'viewer', status: 0, role: 'Dev' }] })).render();
  assert.ok(invitee.includes('Chấp nhận lời mời') && invitee.includes('Từ chối lời mời'));
  assert.ok(!invitee.includes('Gửi đơn ứng tuyển'));
  const applicant = harness(detail({ joinRequests: [{ id: 'request', userId: 'viewer', status: 0 }] })).render();
  assert.ok(applicant.includes('Rút lại yêu cầu'));
  assert.ok(!applicant.includes('Gửi đơn ứng tuyển'));
  const guest = harness(detail()).render();
  assert.ok(guest.includes('Gửi đơn ứng tuyển'));
});
test('completed projects hide recruitment and only creator sees verification', () => {
  for (const isCreator of [false, true]) {
    const html = harness(detail({ status: 2, isCreator, isMember: !isCreator })).render();
    for (const label of ['Gửi đơn ứng tuyển', 'Rời dự án', 'Xóa thành viên', 'Gợi ý thành viên', 'Hủy lời mời']) assert.ok(!html.includes(label));
    assert.equal(html.includes('Gửi xác thực'), isCreator);
    assert.ok(html.includes('Thành viên trong nhóm'));
  }
});
test('pending and rejected projects expose no participation actions', () => {
  for (const status of [0, 3]) {
    const html = harness(detail({ status, isCreator: true })).render();
    for (const label of ['Xóa thành viên', 'Gợi ý thành viên', 'Gửi đơn ứng tuyển', 'Gửi xác thực']) assert.ok(!html.includes(label));
  }
});
test('all management actions wait for confirmation and cancelled modals never call API', async () => {
  const scenarios = [
    ['Xóa thành viên', detail({ isCreator: true }), 'kickMember', ['project', 'member']],
    ['Rời dự án', detail({ isMember: true }), 'leaveProject', ['project']],
    ['Hủy lời mời', detail({ isCreator: true, invitations: [{ id: 'invite', status: 0 }] }), 'cancelInvitation', ['invite']],
    ['Chấp nhận lời mời', detail({ invitations: [{ id: 'invite', status: 0, inviteeId: 'viewer' }] }), 'acceptInvitation', ['invite']],
    ['Từ chối lời mời', detail({ invitations: [{ id: 'invite', status: 0, inviteeId: 'viewer' }] }), 'rejectInvitation', ['invite']],
    ['Đồng ý', detail({ isCreator: true, joinRequests: [{ id: 'request', status: 0 }] }), 'acceptJoinRequest', ['request']],
    ['Từ chối', detail({ isCreator: true, joinRequests: [{ id: 'request', status: 0 }] }), 'rejectJoinRequest', ['request']],
    ['Rút lại yêu cầu', detail({ joinRequests: [{ id: 'request', status: 0, userId: 'viewer' }] }), 'cancelJoinRequest', ['request']],
    ['Gửi đơn ứng tuyển', detail(), 'submitJoinRequest', [{ projectId: 'project', role: 'DevOps', message: undefined }]],
  ];
  for (const [title, project, method, args] of scenarios) {
    const h = harness(project);
    h.render(); h.click(title); h.render();
    assert.equal(h.calls.length, 0);
    h.click('Quay lại'); h.render();
    assert.equal(h.calls.length, 0);
    h.click(title); h.render(); await h.click('Xác nhận');
    assert.equal(h.calls[0][0], method);
    assert.equal(JSON.stringify(h.calls[0][1]), JSON.stringify(args));
    assert.equal(h.state[4], 1, 'refreshes project after success');
  }
});
test('failed actions retain modal and error; duplicate confirmation is blocked', async () => {
  let reject;
  const h = harness(detail({ isMember: true }), { leaveProject: () => new Promise((_, rejectOperation) => { reject = rejectOperation; }) });
  h.render(); h.click('Rời dự án'); h.render();
  const confirm = h.buttons.find(item => item.title === 'Xác nhận').onPress;
  const pending = confirm(); await confirm();
  assert.equal(h.calls.length, 1);
  reject(new Error('Permission denied')); await pending;
  assert.ok(h.render().includes('Permission denied'));
  assert.ok(h.state[8]);
  assert.equal(h.state[4], 0);
});
test('verification preview confirms without any API call or false success', async () => {
  const h = harness(detail({ isCreator: true, status: 2 }));
  h.render(); h.click('Gửi xác thực'); h.render(); await h.click('Xác nhận');
  assert.equal(h.calls.length, 0);
  assert.ok(h.render().includes('Chưa có yêu cầu nào được gửi'));
});

test('pending projects show information and members without recruitment controls', () => {
  for (const isCreator of [true, false]) {
    const html = harness(detail({ status: 0, isCreator })).render();
    assert.ok(html.includes('Chờ duyệt'));
    assert.ok(html.includes('CloudOps') && html.includes('Thành viên trong nhóm'));
    assert.ok(!html.includes('Đang tuyển'));
    assert.ok(!html.includes('Chỉnh sửa dự án'));
  }
});
test('rejected projects show rejected badge and editing/deletion only for creator', async () => {
  const guest = harness(detail({ status: 3 })).render();
  assert.ok(guest.includes('Bị từ chối'));
  assert.ok(!guest.includes('Đang tuyển'));
  assert.ok(!guest.includes('Xóa dự án') && !guest.includes('Chỉnh sửa dự án'));
  const h = harness(detail({ status: 3, isCreator: true }));
  h.render(); h.click('Chỉnh sửa dự án'); assert.ok(h.render().includes('Edit form'));
  h.click('Xóa dự án'); h.render(); assert.equal(h.calls.length, 0);
  h.click('Quay lại'); h.render(); assert.equal(h.calls.length, 0);
  h.click('Xóa dự án'); h.render(); await h.click('Xác nhận');
  assert.equal(h.calls[0][0], 'deleteProject');
  assert.equal(h.calls[0][1][0], 'project');
});
