const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function moduleAt(path, globals = {}) {
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: output, ...globals });
  return output;
}
const feedback = () => moduleAt('src/utils/api-feedback.ts');
test('specific business errors remain readable while raw codes and diagnostics never escape', () => {
  const f = feedback();
  assert.equal(f.apiErrorMessage('/profile/partner', 400, { code: 'INVALID_PROFILE', message: 'Email liên hệ không đúng định dạng.' }), 'Email liên hệ không đúng định dạng.');
  assert.match(f.apiErrorMessage('/auth/login', 401, {}), /Email hoặc mật khẩu/);
  assert.match(f.apiErrorMessage('/auth/register/student', 409, { code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already in use.' }), /Email này đã được sử dụng/);
  for (const message of ['INVALID_PROFILE', 'System.NullReferenceException at ProfileService.cs:42', '<html>Bad Gateway</html>', 'SQLSTATE 23505 duplicate key', 'Request failed with status code 500', 'Lỗi máy chủ: invalid column name Email']) {
    const result = f.apiErrorMessage('/profile/partner', 500, { message });
    assert.match(result, /hồ sơ đối tác/); assert.ok(!result.includes(message));
  }
});
test('validation dictionaries and HTTP statuses give concrete user-facing reasons', () => {
  const f = feedback();
  const message = f.apiErrorMessage('/profile/partner', 400, { errors: { ContactEmail: ['Email liên hệ không hợp lệ.'], Phone: ['The Phone field is required.'] } });
  assert.match(message, /Email liên hệ không hợp lệ/); assert.match(message, /Số điện thoại/); assert.ok(!message.includes('The Phone'));
  assert.match(f.apiErrorMessage('/images', 413, null), /5 MB/);
  assert.match(f.apiErrorMessage('/partner/jobs', 403, null), /quyền/);
  assert.match(f.apiErrorMessage('/community/posts', 429, null), /quá nhiều/);
  assert.match(f.apiErrorMessage('/profile/partner', 503, { detail: 'upstream timeout' }), /thử lại/);
});
test('success labels describe actions and API policy keeps reads/background/intermediate uploads quiet', () => {
  const f = feedback();
  assert.match(f.apiSuccessMessage('/profile/partner', 'PUT'), /hồ sơ đối tác/);
  assert.match(f.apiSuccessMessage('/community/posts/one/comments', 'POST'), /bình luận/);
  assert.match(f.apiSuccessMessage('/partner/jobs/one', 'DELETE'), /xóa.*tuyển dụng/);
  assert.equal(f.apiFeedbackPolicy('/profile/me', 'GET').success, false);
  assert.equal(f.apiFeedbackPolicy('/images', 'POST').success, false);
  assert.equal(f.apiFeedbackPolicy('/auth/refresh', 'POST').error, false);
  assert.equal(f.apiFeedbackPolicy('/notifications/unread-count', 'GET').error, false);
  assert.equal(f.apiFeedbackPolicy('/profile/partner', 'PUT').success, true);
});
test('toast replaces current feedback, resets 3-second timer and ignores outdated dismissal', () => {
  let now = 0, next = 0;
  const timers = new Map();
  const s = moduleAt('src/store/toast.store.ts', { setTimeout: (fn, delay) => { const id = ++next; timers.set(id, { at: now + delay, fn }); return id; }, clearTimeout: id => timers.delete(id) });
  const advance = ms => { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } };
  s.toast.success('Đã lưu hồ sơ.');
  const oldId = s.toastStore.getSnapshot().toast.id;
  advance(2000); assert.ok(s.toastStore.getSnapshot().toast);
  s.toast.error('Email liên hệ không hợp lệ.');
  advance(1000); assert.equal(s.toastStore.getSnapshot().toast.type, 'error');
  s.toastStore.dismiss(oldId); assert.ok(s.toastStore.getSnapshot().toast);
  advance(1999); assert.ok(s.toastStore.getSnapshot().toast);
  advance(1); assert.equal(s.toastStore.getSnapshot().toast, null);
});

function apiHarness(fetch, session = () => null) {
  const notices = [];
  const api = moduleAt('src/services/api.ts', {
    Headers, FormData, Response, fetch,
    require: id => {
      if (id.endsWith('/config')) return { API_URL: 'https://fixture.test/api' };
      if (id.endsWith('/project-errors')) return moduleAt('src/services/project-errors.ts');
      if (id.endsWith('/api-feedback')) return feedback();
      if (id.endsWith('/toast.store')) return { toast: { success: message => notices.push(['success', message]), error: message => notices.push(['error', message]) } };
      if (id.endsWith('/storage')) return { tokenStorage: { getSession: session } };
      throw new Error('Unexpected import ' + id);
    },
  });
  return { api, notices };
}
test('both API clients keep response contracts and multipart data while publishing write results once', async () => {
  let request;
  const { api, notices } = apiHarness(async (_url, options) => { request = options; return new Response(JSON.stringify({ id: 'saved' }), { status: 200 }); });
  const result = await api.apiRequest('/profile/partner', { method: 'PUT', body: '{}', feedback: { success: 'Đã cập nhật ảnh.' } });
  assert.equal(result.id, 'saved'); assert.equal(notices.length, 1); assert.equal(notices[0][1], 'Đã cập nhật ảnh.'); assert.equal(request.feedback, undefined);
  const body = new FormData(); body.append('description', 'post');
  await api.apiMultipartRequest('/community/posts', { method: 'POST', body });
  assert.equal(request.body, body); assert.equal(new Headers(request.headers).has('Content-Type'), false); assert.equal(notices.length, 2);
  await api.apiRequest('/profile/me'); assert.equal(notices.length, 2);
});
test('HTTP and logical failures publish safe messages but preserve internal error codes', async () => {
  const first = apiHarness(async () => new Response(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'System.NullReferenceException' }), { status: 500 }));
  await assert.rejects(first.api.apiRequest('/profile/partner', { method: 'PUT' }), error => error.code === 'INTERNAL_ERROR' && !error.message.includes('Exception'));
  assert.equal(first.notices.length, 1); assert.equal(first.notices[0][0], 'error');
  const second = apiHarness(async () => new Response(JSON.stringify({ success: false, code: 'INVALID_PROFILE', message: 'Email liên hệ không hợp lệ.' }), { status: 200 }));
  await assert.rejects(second.api.apiRequest('/profile/partner', { method: 'PUT' }), error => error.message === 'Email liên hệ không hợp lệ.');
  assert.equal(second.notices.length, 1); assert.equal(second.notices[0][0], 'error');
});
test('cancelled requests and stale sessions never publish a success result', async () => {
  const controller = new AbortController();
  const first = apiHarness(async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError'); });
  await assert.rejects(first.api.apiRequest('/profile/partner', { method: 'PUT', signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(first.notices.length, 0);
  let session = { generation: 'old', accessToken: 'fixture-access' };
  const second = apiHarness(async () => { session = { generation: 'new', accessToken: 'new-access' }; return new Response('{}'); }, () => session);
  await assert.rejects(second.api.apiRequest('/profile/partner', { method: 'PUT' }));
  assert.equal(second.notices.filter(([type]) => type === 'success').length, 0);
});
test('existing project error translation retains concrete business limits', async () => {
  const { api } = apiHarness(async () => new Response(JSON.stringify({ code: 'PROJECT_LIMIT_REACHED', message: 'You may lead a maximum of 3 ongoing projects.' }), { status: 400 }));
  await assert.rejects(api.apiRequest('/projects', { method: 'POST' }), error => /tối đa 3 dự án/.test(error.message));
});
