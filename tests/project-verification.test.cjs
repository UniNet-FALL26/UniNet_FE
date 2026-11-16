const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, AbortController, setTimeout, clearTimeout, require: name => name in imports ? imports[name] : name === '@/utils/verification-date' ? load('src/utils/verification-date.ts') : require(name) });
  return exports;
}
const helpers = load('src/utils/project-verification.ts');
const review = (changes = {}) => ({ id: 'review', projectId: 'project', version: 3, status: 2, isCurrent: true, createdAt: '2026-10-20T03:00:00Z', completedAt: null, summary: 'Kiểm tra thành công', policy: { version: 'v1' }, source: { tasks: [{ projectTaskId: 'task', reports: [] }] }, attempts: [], ...changes });
const detail = (changes = {}) => ({ verification: { id: 'application', status: 0, bookingStatus: 0 }, assignments: [], payments: [], meetingEndAt: null, ...changes });
const service = request => load('src/services/project-verification.service.ts', { '@/constants/config': { API_URL: 'https://example.test/api' }, '@/services/api': { apiRequest: request } }).projectVerificationService;

test('level 1 uses public enum values and distinguishes stale, missing, rejected and service failures', () => {
  assert.match(helpers.level1Message(null), /Chưa có/);
  assert.match(helpers.level1Message(review()), /vượt qua/);
  assert.match(helpers.level1Message(review({ isCurrent: false })), /đã thay đổi/);
  assert.match(helpers.level1Message(review({ status: 3 })), /không đạt chính sách/);
  assert.match(helpers.level1Message(review({ status: 4 })), /bổ sung/);
  assert.match(helpers.level1Message(review({ status: 5, attempts: [{ number: 1, transient: true }] })), /tạm thời/);
  assert.match(helpers.level1Message(review({ status: 5, attempts: [{ number: 5, transient: true }] })), /hỗ trợ vận hành/);
  assert.match(helpers.level2Label(detail({ verification: { status: 2 } }), true), /Không đạt thẩm định/);
});

test('level 2 resumes booking/payment/assignment states and never treats a payment as a final result', () => {
  assert.match(helpers.level2Label(detail(), true), /Chưa chọn lịch/);
  assert.match(helpers.level2Label(detail({ verification: { status: 0, bookingStatus: 1, reservedUntil: '2000-01-01' } }), true), /Hết thời gian/);
  assert.match(helpers.level2Label(detail({ payments: [{ status: 0 }] }), true), /chờ thanh toán/);
  assert.match(helpers.level2Label(detail({ verification: { status: 0, bookingStatus: 2 }, payments: [{ status: 1 }] }), true), /chờ phân công/);
  assert.match(helpers.level2Label(detail({ payments: [{ status: 1 }] }), true), /hỗ trợ/);
  assert.match(helpers.level2Label(detail({ assignments: [{ status: 0 }] }), true), /Đã phân công/);
  assert.match(helpers.level2Label(detail({ meetingEndAt: '2026-10-20' }), true), /chờ kết luận/);
});

test('real level 1 requests preserve cancellation and retry posts no body', async () => {
  const calls = [];
  const api = service(async (...args) => { calls.push(args); return review(); });
  const controller = new AbortController();
  await api.getLevel1('project', controller.signal);
  await api.retryLevel1('project');
  assert.equal(calls[0][0], '/projects/project/evidence-moderation');
  assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[1][0], '/projects/project/evidence-moderation/retry');
  assert.equal(calls[1][1].method, 'POST');
  assert.equal(calls[1][1].body, undefined);
  await assert.rejects(service(async () => review({ status: 6 })).getLevel1('project'), /không hợp lệ/);
  const unchanged = Object.assign(new Error('unchanged'), { code: 'LEVEL1_UNCHANGED' });
  await assert.rejects(service(async () => { throw unchanged; }).retryLevel1('project'), error => error === unchanged);
});

test('verification list requests pending separately and preserves server pagination', async () => {
  const response = { page: 1, pageSize: 1, totalPages: 12, totalItems: 12, verifications: [{ id: 'old-pending', status: 0 }] };
  const api = service(async url => { assert.equal(url, '/projects/project/verifications?page=1&pageSize=1&status=0'); return response; });
  assert.equal(await api.list('project', true), response);
});

test('members and outsiders never request creator-only APIs', () => {
  for (const creator of [false]) {
    const calls = [];
    load('src/hooks/useProjectVerification.ts', {
      react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn },
      'expo-router': { useFocusEffect: fn => fn() },
      'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
      '@/services/api': { ApiError: Error },
      '@/services/project-verification.service': { projectVerificationService: new Proxy({}, { get: (_, method) => () => { calls.push(method); return Promise.resolve(null); } }) },
    }).useProjectVerification('project', creator);
    assert.equal(calls.length, 0);
  }
});

test('unchanged retry reconciles with GET and never reports a fabricated success', async () => {
  const states = [];
  let cursor = 0;
  let focus;
  let posts = 0;
  class ApiError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  const hook = load('src/hooks/useProjectVerification.ts', {
    react: { useState: initial => { const index = cursor++; states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef: value => ({ current: value }), useCallback: fn => fn },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '@/services/api': { ApiError },
    '@/services/project-verification.service': { projectVerificationService: {
      getLevel1: async () => review(),
      list: async () => ({ verifications: [] }),
      contribution: async () => ({ status: 0 }),
      retryLevel1: async () => { posts++; throw new ApiError('unchanged', 409, 'LEVEL1_UNCHANGED'); },
    } },
  }).useProjectVerification('project', true);
  const cleanup = focus();
  await new Promise(resolve => setImmediate(resolve));
  await hook.retry();
  assert.equal(posts, 1);
  assert.match(states[4], /Chưa có thay đổi/);
  assert.ok(!states[4].includes('thành công'));
  assert.equal(states[3], 1, 'refreshes GET state after the POST conflict');
  cleanup();
});
