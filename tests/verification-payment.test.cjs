const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${path}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Intl, Date, URL, require: key => { if (key in dependencies) return dependencies[key]; throw Error(key); } });
  return exports;
}
const booking = load('utils/verification-booking');
const rules = load('utils/verification-payment', { '@/utils/verification-booking': booking });
const now = Date.parse('2026-10-21T01:00:00Z');
const until = '2026-10-21T01:30:00Z';
const detail = () => ({ verification: { id: 'v', status: 0, bookingStatus: 1, scheduledStartAt: '2026-10-22T02:00:00Z', reservedUntil: until }, assignments: [], payments: [], meetingEndAt: null });
const transaction = (overrides = {}) => ({ id: 'tx', verificationId: 'v', packageId: 'p', status: 0, amountVnd: 120000, currency: 'VND', checkoutUrl: 'https://pay.payos.vn/web/code', expiredAt: until, requiresReview: false, reconciliationRequired: false, ...overrides });
test('checkout can only be created for a live hold without pending, successful or review payments', () => {
  assert.equal(rules.canCreateCheckout(detail(), null, now), true);
  assert.equal(rules.canCreateCheckout(detail(), transaction({ status: 2 }), now), true);
  for (const tx of [transaction(), transaction({ status: 1 }), transaction({ status: 2, requiresReview: true }), transaction({ status: 2, reconciliationRequired: true })]) assert.equal(rules.canCreateCheckout(detail(), tx, now), false);
  for (const payment of [{ status: 0 }, { status: 1 }, { status: 2, requiresManualReview: true }]) { const d = detail(); d.payments = [payment]; assert.equal(rules.canCreateCheckout(d, null, now), false); }
  assert.equal(rules.canCreateCheckout(detail(), null, Date.parse(until)), false);
  const d = detail(); d.verification.status = 3; assert.equal(rules.canCreateCheckout(d, null, now), false);
});
test('PayOS links require HTTPS, matching live hold and pending clean server transaction', () => {
  assert.equal(rules.checkoutLink(transaction(), detail(), now), 'https://pay.payos.vn/web/code');
  for (const tx of [transaction({ checkoutUrl: 'javascript:alert(1)' }), transaction({ checkoutUrl: 'http://pay.test' }), transaction({ checkoutUrl: 'https://user:pass@pay.test' }), transaction({ expiredAt: 'invalid' }), transaction({ expiredAt: '2026-10-21T01:40:00Z' }), transaction({ requiresReview: true }), transaction({ reconciliationRequired: true }), transaction({ status: 1 }), transaction({ status: 2 })]) assert.equal(rules.checkoutLink(tx, detail(), now), null);
  assert.equal(rules.checkoutLink(transaction(), detail(), Date.parse(until)), null);
});
test('success comes only from backend payment state and confirmed booking', () => {
  const d = detail();
  assert.match(rules.paymentPresentation(d, transaction(), now).title, /Đang chờ/);
  assert.match(rules.paymentPresentation(d, transaction({ status: 1 }), now).title, /Đã ghi nhận/);
  d.verification.bookingStatus = 2;
  assert.equal(rules.paymentPresentation(d, transaction({ status: 1 }), now).title, 'Thanh toán thành công');
  assert.match(rules.paymentPresentation(d, transaction({ status: 1, requiresReview: true }), now).title, /đối soát/);
});

test('QR uses the backend payload only while checkout remains payable', () => {
  const tx = transaction({ qrCode: '000201-bank-payment-payload' });
  assert.equal(rules.paymentQrPayload(tx, detail(), now), tx.qrCode);
  for (const overrides of [{ qrCode: null }, { qrCode: '' }, { qrCode: '  ' }, { qrCode: 'x'.repeat(4097) }, { status: 1 }, { status: 2 }, { requiresReview: true }, { reconciliationRequired: true }]) {
    assert.equal(rules.paymentQrPayload({ ...tx, ...overrides }, detail(), now), null);
  }
  assert.equal(rules.paymentQrPayload(tx, detail(), Date.parse(until)), null);
});
test('failed and expired pending payments cannot lead to reusing an old checkout', () => {
  assert.match(rules.paymentPresentation(detail(), transaction({ status: 2 }), now).title, /chưa thành công/);
  assert.match(rules.paymentPresentation(detail(), transaction(), Date.parse(until)).title, /Đang chờ/);
  assert.equal(rules.canCreateCheckout(detail(), transaction(), Date.parse(until)), false);
  assert.match(rules.paymentPresentation(detail(), transaction({ status: 2 }), Date.parse(until)).title, /Chưa có lịch/);
});
test('payment service POST has no client amount/body and status GET stays scoped to verification', async () => {
  const calls = [];
  const service = load('services/verification-payment.service', { '@/constants/config': { API_URL: 'https://example.test/api' }, '@/services/api': { apiRequest: async (path, options) => { calls.push({ path, options }); return transaction(); } } }).verificationPaymentService;
  await service.create('v'); await service.get('v', 'tx');
  assert.equal(calls[0].path, '/project-verifications/v/payments');
  assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[1].path, '/project-verifications/v/payments/tx');
  await assert.rejects(service.get('another-v', 'tx'), /chưa hợp lệ/);
});
test('resume finds an older pending payment even when it is absent from first history page', async () => {
  const calls = [];
  const d = detail(); d.payments = [{ transactionId: 'older-pending', status: 0 }];
  const service = load('services/verification-checkout', {
    '@/services/project-verification.service': { projectVerificationService: { detail: async () => d } },
    '@/services/verification-payment.service': { verificationPaymentService: {
      history: async () => ({ transactions: [transaction({ id: 'latest-failed', status: 2 })], totalPages: 5 }),
      get: async (v, tx) => { calls.push([v, tx]); return transaction({ id: tx }); },
      package: async () => { throw Error('Should not require an active package to resume pending payment'); },
    } },
  });
  const result = await service.loadVerificationCheckout('v');
  assert.equal(result.transaction.id, 'older-pending');
  assert.deepEqual(calls, [['v', 'older-pending']]);
});
test('screen ignores payment redirect flags and polls via backend GET only', () => {
  const source = fs.readFileSync('src/components/projects/VerificationCheckoutScreen.tsx', 'utf8');
  assert.match(source, /const \{ id, projectId \} = useLocalSearchParams/);
  assert.match(source, /setTimeout\(\(\) => \{ void load\(\); \}, 12000\)/);
  assert.match(source, /document\.removeEventListener\('visibilitychange'/);
  assert.match(source, /failures < 3/);
});

function renderCheckout(snapshot) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let stateIndex = 0;
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/projects/VerificationCheckoutScreen.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const imports = {
    react: { ...React, useState: initial => { const index = stateIndex++; return React.useState(index === 0 ? snapshot : index === 1 ? false : initial); } },
    'react-native': require('react-native-web'),
    'react-native-safe-area-context': { SafeAreaView: ({ children }) => React.createElement('div', null, children) },
    'expo-router': { router: {}, useFocusEffect() {}, useLocalSearchParams: () => ({ id: 'v', projectId: 'project', status: 'PAID', cancel: 'false' }) },
    'expo-web-browser': { openBrowserAsync() {} },
    '@/components/ui/Button': { Button: props => React.createElement('button', { disabled: props.disabled }, props.title) },
    '@/components/projects/PaymentQrCode': { PaymentQrCode: props => React.createElement('div', { 'data-qr': props.value }, 'QR thanh toán') },
    '@/constants/colors': { colors: {} },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'account' } }) },
    '@/services/api': { ApiError: class extends Error {} },
    '@/services/verification-checkout': { loadVerificationCheckout() {} },
    '@/services/verification-payment.service': { verificationPaymentService: {} },
    '@/utils/verification-payment': rules,
    '@/utils/verification-booking': booking,
  };
  vm.runInNewContext(source, { exports, Intl, Date, require: key => key in imports ? imports[key] : require(key) });
  return renderToStaticMarkup(React.createElement(exports.VerificationCheckoutScreen));
}
test('checkout screen renders ready, pending, successful and expired states without trusting redirect PAID', () => {
  const d = detail(); d.verification.reservedUntil = '2099-10-21T02:00:00Z'; d.verification.scheduledStartAt = '2099-10-22T02:00:00Z';
  let html = renderCheckout({ detail: d, transaction: null, packageData: { name: 'Gói sinh viên', price: 120000 } });
  assert.match(html, /Tạo mã QR thanh toán/); assert.doesNotMatch(html, />Thanh toán thành công</);
  html = renderCheckout({ detail: d, transaction: transaction({ expiredAt: d.verification.reservedUntil }), packageData: null });
  assert.match(html, /Mở PayOS để thanh toán/); assert.match(html, /Đang chờ xác nhận/); assert.doesNotMatch(html, />Thanh toán thành công</);
  assert.match(html, /chưa có dữ liệu QR/);
  html = renderCheckout({ detail: d, transaction: transaction({ expiredAt: d.verification.reservedUntil, qrCode: 'bank-qr-payload' }), packageData: null });
  assert.match(html, /data-qr="bank-qr-payload"/);
  d.verification.bookingStatus = 2;
  html = renderCheckout({ detail: d, transaction: transaction({ status: 1, qrCode: 'bank-qr-payload' }), packageData: null });
  assert.doesNotMatch(html, /data-qr/);
  assert.match(html, /Thanh toán thành công/); assert.ok(!html.includes('Mở PayOS để thanh toán'));
  d.verification.bookingStatus = 3;
  html = renderCheckout({ detail: d, transaction: transaction({ status: 2 }), packageData: null });
  assert.match(html, /Chưa có lịch giữ còn hiệu lực/); assert.ok(!html.includes('Tạo checkout để thử lại'));
});

test('checkout polling only reads, pauses in background, stops after three failures and cleans up', async () => {
  let focus, appChange, timer;
  let reads = 0, posts = 0, failed = false, removed = 0;
  let signal;
  const appState = { currentState: 'active', addEventListener: (_, cb) => { appChange = cb; return { remove() { removed++; } }; } };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/projects/VerificationCheckoutScreen.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const imports = {
    react: { useState: initial => [initial, () => {}], useRef: current => ({ current }), useCallback: fn => fn },
    'react-native': { Platform: { OS: 'android' }, AppState: appState, Linking: { addEventListener: () => ({ remove() { removed++; } }) }, StyleSheet: { create: v => v } },
    'react-native-safe-area-context': {},
    'expo-router': { router: {}, useFocusEffect: cb => { focus = cb; }, useLocalSearchParams: () => ({ id: 'v' }) },
    'expo-web-browser': {}, '@/components/ui/Button': {}, '@/components/projects/PaymentQrCode': {}, '@/constants/colors': { colors: {} },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'a' } }) }, '@/services/api': { ApiError: class extends Error {} },
    '@/services/verification-checkout': { loadVerificationCheckout: async (_, s) => { reads++; signal = s; if (failed) throw Error('Offline'); return { detail: detail(), transaction: transaction(), packageData: null }; } },
    '@/services/verification-payment.service': { verificationPaymentService: { create: () => { posts++; } } },
    '@/utils/verification-payment': rules, '@/utils/verification-booking': booking,
  };
  vm.runInNewContext(source, { exports, Intl, Date, AbortController, setInterval: () => 1, clearInterval() {}, setTimeout: cb => { timer = cb; return 1; }, clearTimeout: () => { timer = null; }, require: key => key in imports ? imports[key] : require(key) });
  exports.VerificationCheckoutScreen();
  const cleanup = focus();
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush(); assert.equal(reads, 1); assert.equal(posts, 0); assert.ok(timer);
  appState.currentState = 'background'; appChange(); assert.equal(timer, null);
  await flush(); assert.equal(reads, 1);
  appState.currentState = 'active'; appChange(); await flush(); assert.equal(reads, 2);
  failed = true;
  for (let i = 0; i < 3; i++) { assert.ok(timer); const tick = timer; timer = null; tick(); await flush(); }
  assert.equal(timer, null); assert.equal(posts, 0);
  cleanup(); assert.equal(signal.aborted, true); assert.equal(removed, 2);
});
