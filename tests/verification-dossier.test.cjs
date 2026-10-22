const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, Date, Intl, AbortController, setTimeout, clearTimeout, require: name => name in imports ? imports[name] : require(name) });
  return exports;
}
const helper = load('src/utils/verification-dossier.ts');
const detail = changes => ({ verification: { id: 'v', projectId: 'project', status: 0, bookingStatus: 0 }, assignments: [], payments: [], meetingEndAt: null, ...changes });
test('cancellation matches backend assignment, meeting, schedule and finalization locks', () => {
  const now = Date.parse('2026-10-22T10:00:00Z');
  assert.equal(helper.canCancelVerification(detail(), now), true);
  for (const patch of [{ assignments: [{ status: 3 }] }, { meetingStartAt: '2026-10-22' }, { meetingEndAt: '2026-10-22' }, { finalResult: { finalizedAt: '2026-10-22' } }, { verification: { status: 1 } }, { verification: { status: 0, bookingStatus: 2, scheduledStartAt: '2026-10-21' } }]) {
    assert.equal(helper.canCancelVerification(detail(patch), now), false);
  }
  assert.equal(helper.canCancelVerification(detail({ verification: { status: 0, bookingStatus: 3, scheduledStartAt: '2026-10-21' } }), now), true);
  // Cancel and refund are separate policies: a paid future, unassigned booking can still be cancelled.
  assert.equal(helper.canCancelVerification(detail({ payments: [{ status: 1 }] }), now), true);
});
test('payment success and a cancelled assignment never fabricate completed verification', () => {
  const steps = helper.dossierSteps(detail({ verification: { status: 0, bookingStatus: 2 }, payments: [{ status: 1 }], assignments: [{ status: 3 }] }));
  assert.equal(steps[1].done, true);
  assert.equal(steps[2].done, false);
  assert.equal(steps[4].done, false);
});
test('result and cancellation use actual backend routes, body and abort signal', async () => {
  const calls = [];
  const api = load('src/services/project-verification.service.ts', {
    '@/constants/config': { API_URL: 'https://test/api' },
    '@/services/api': { apiRequest: async (...args) => { calls.push(args); return { status: 2, reports: [] }; } },
  }).projectVerificationService;
  const controller = new AbortController();
  await api.result('v/1', controller.signal);
  await api.cancel('v/1', '  Không còn nhu cầu  ');
  assert.equal(calls[0][0], '/projects/verifications/v%2F1/result');
  assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[1][0], '/projects/verifications/v%2F1/cancel');
  assert.equal(calls[1][1].method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1][1].body), { reason: 'Không còn nhu cầu' });
});
test('history requests the selected page without discarding server pagination', async () => {
  const api = load('src/services/verification-payment.service.ts', {
    '@/constants/config': { API_URL: 'https://test/api' },
    '@/services/api': { apiRequest: async url => { assert.equal(url, '/project-verifications/v/payments?page=3&pageSize=10'); return { page: 3, totalPages: 5, transactions: [] }; } },
  }).verificationPaymentService;
  assert.equal((await api.history('v', undefined, 3)).totalPages, 5);
});
function renderResult(snapshot) {
  const box = ({ children }) => React.createElement('div', null, children);
  const screen = load('src/components/projects/VerificationResultScreen.tsx', {
    'react-native': { Text: box, View: box },
    'expo-router': { useLocalSearchParams: () => ({ id: 'v' }) },
    '@/components/ui/Button': { Button: ({ title }) => React.createElement('button', null, title) },
    '@/hooks/useVerificationDossier': { useVerificationDossier: () => ({ loading: false, refresh() {}, ...snapshot }) },
    './VerificationDossierUI': { DossierLayout: box, DossierCard: ({ title, children }) => React.createElement('section', null, title, children), ds: {}, verificationDate: value => value || 'Chưa có' },
  });
  return renderToStaticMarkup(React.createElement(screen.VerificationResultScreen));
}
test('S09 separates failed, passed, waiting and unavailable result reports', () => {
  const report = { id: 'r', summary: 'Tóm tắt thật', findings: 'Phát hiện thật', recommendations: 'Khuyến nghị thật', submittedAt: '2026-10-22' };
  const failed = renderResult({ detail: detail({ verification: { status: 2 } }), result: { status: 2, reports: [report], finalizedAt: '2026-10-22' } });
  for (const text of ['Không đạt xác minh cấp 2', 'Tóm tắt thật', 'Phát hiện thật', 'Khuyến nghị thật', 'hai trạng thái độc lập']) assert.ok(failed.includes(text));
  const waiting = renderResult({ detail: detail({ payments: [{ status: 1 }] }), result: null });
  assert.ok(waiting.includes('Đang chờ kết luận cấp 2'));
  assert.ok(!waiting.includes('✓ Đạt xác minh cấp 2'));
  const partial = renderResult({ detail: detail(), result: { status: 0, reports: [report] } });
  assert.ok(partial.includes('chưa phải kết luận cuối cùng'));
  const denied = renderResult({ detail: null, result: null, error: 'Không có quyền' });
  assert.ok(!denied.includes('Tóm tắt thật'));
});
test('S07 resumes existing dossier, hides locked cancellation and exposes final results', () => {
  const box = ({ children }) => React.createElement('div', null, children);
  function render(value) {
    const screen = load('src/components/projects/VerificationDossierScreen.tsx', {
      'react-native': { Text: box, View: box, ScrollView: box, KeyboardAvoidingView: box, TextInput: () => null, Modal: ({ visible, children }) => visible ? box({ children }) : null, Platform: { OS: 'web' } },
      'react-native-safe-area-context': { SafeAreaView: box },
      'expo-router': { useLocalSearchParams: () => ({ id: 'v' }), useFocusEffect() {}, router: {} },
      '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'owner' } }) },
      '@/components/ui/Button': { Button: ({ title }) => React.createElement('button', null, title) },
      '@/hooks/useVerificationDossier': { useVerificationDossier: () => ({ detail: value, loading: false, error: null, refresh() {} }) },
      '@/services/project-verification.service': { projectVerificationService: {} },
      '@/services/verification-payment.service': { verificationPaymentService: {} },
      '@/services/api': { ApiError: Error },
      '@/utils/verification-dossier': helper,
      '@/utils/verification-booking': load('src/utils/verification-booking.ts'),
      '@/utils/project-verification': load('src/utils/project-verification.ts'),
      './VerificationDossierUI': { DossierLayout: box, DossierCard: ({ title, children }) => React.createElement('section', null, title, children), ds: {}, verificationDate: value => value || 'Chưa có' },
    });
    return renderToStaticMarkup(React.createElement(screen.VerificationDossierScreen));
  }
  const pending = render(detail());
  assert.ok(pending.includes('Chưa chọn lịch') && pending.includes('Chọn lịch xác minh') && pending.includes('Hủy hồ sơ'));
  assert.ok(!pending.includes('Chọn gói cấp 2'));
  const assigned = render(detail({ assignments: [{ id: 'a', status: 0, assignedAt: '2026-10-22' }] }));
  assert.ok(assigned.includes('Đã phân công'));
  assert.ok(!assigned.includes('Hủy hồ sơ'));
  const final = render(detail({ verification: { status: 2 } }));
  assert.ok(final.includes('Không đạt cấp 2') && final.includes('Xem kết quả cấp 2'));
  assert.ok(!final.includes('Hủy hồ sơ') && !final.includes('Chọn lịch xác minh'));
});

test('dossier polling performs GET only, pauses in background and aborts on blur', async () => {
  let focus, appChange, timer, abortedSignal;
  const timers = new Map();
  const states = [];
  let cursor = 0;
  let calls = 0;
  const app = { currentState: 'active', addEventListener: (_, fn) => { appChange = fn; return { remove() {} }; } };
  const exports = {};
  const imports = {
    react: { useCallback: fn => fn, useRef: value => ({ current: value }), useState: value => { const index = cursor++; states[index] = typeof value === 'function' ? value() : value; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; } },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    'react-native': { AppState: app, Platform: { OS: 'android' } },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'owner' } }) },
    '@/services/api': { ApiError: Error },
    '@/services/project-verification.service': { projectVerificationService: { detail: async (_, signal) => { calls++; abortedSignal = signal; return detail(); } } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useVerificationDossier.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, AbortController, require: name => imports[name], setTimeout: (fn, ms) => { assert.equal(ms, 12000); timer = fn; timers.set(fn, ms); return fn; }, clearTimeout: fn => timers.delete(fn) });
  exports.useVerificationDossier('v');
  const cleanup = focus();
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  await settle();
  assert.equal(calls, 1);
  assert.equal(timers.size, 1);
  app.currentState = 'background'; appChange('background');
  await timer();
  assert.equal(calls, 1);
  app.currentState = 'active'; appChange('active'); await settle();
  assert.equal(calls, 2);
  cleanup();
  assert.equal(abortedSignal.aborted, true);
  assert.equal(timers.size, 0);
});
