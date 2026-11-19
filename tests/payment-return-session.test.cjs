const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Date, ...globals, require: key => { if (key in imports) return imports[key]; throw Error(key); } });
  return exports;
}
const login = { accessToken: 'access', refreshToken: 'refresh', account: { id: 'owner' } };
test('credentials survive restart, exclude profile data, and logout removes the persisted pair', async () => {
  let saved = null;
  const persistence = { read: async () => saved, write: async value => { saved = value; } };
  const create = () => load('src/utils/storage.ts', { '@/utils/session-persistence': { sessionPersistence: persistence } }).tokenStorage;
  const first = create(); await first.setSession(login);
  assert.deepEqual(JSON.parse(saved), { accessToken: 'access', refreshToken: 'refresh' });
  const second = create(); await second.hydrate();
  assert.equal(second.getSession().accessToken, 'access');
  assert.equal(second.getSession().account, undefined); // /auth/me must validate the account.
  await second.clear(); assert.equal(saved, null);
});
test('a delayed storage read cannot overwrite a new login', async () => {
  let finish;
  const read = new Promise(resolve => { finish = resolve; });
  const storage = load('src/utils/storage.ts', { '@/utils/session-persistence': { sessionPersistence: { read: () => read, write: async () => {} } } }).tokenStorage;
  const hydrating = storage.hydrate(); await storage.setSession(login);
  finish(JSON.stringify({ accessToken: 'old', refreshToken: 'old' })); await hydrating;
  assert.equal(storage.getSession().accessToken, 'access');
});
test('web session is tab-scoped and survives a reload, clearing on logout', async () => {
  const data = new Map();
  const window = { sessionStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } };
  const create = () => load('src/utils/session-persistence.web.ts', {}, { window }).sessionPersistence;
  await create().write('credentials'); assert.equal(await create().read(), 'credentials');
  await create().write(null); assert.equal(await create().read(), null);
});
test('payment return context is account scoped, expires and contains routing data only', async () => {
  let saved;
  const helpers = load('src/utils/payment-return.ts', { '@/utils/payment-context-store': { paymentContextStore: { read: async () => saved, write: async value => { saved = value; } } } });
  await helpers.rememberPayment({ verificationId: 'verification', transactionId: 'tx', accountId: 'owner' });
  assert.equal((await helpers.recalledPayment('owner')).verificationId, 'verification');
  assert.equal(await helpers.recalledPayment('other'), null);
  saved = JSON.stringify({ ...JSON.parse(saved), savedAt: Date.now() - 86400001 });
  assert.equal(await helpers.recalledPayment('owner'), null);
  assert.equal(helpers.paymentAppUrl('v&status=PAID'), 'uninet:///payment/result?verificationId=v%26status%3DPAID');
});

test('result page waits for restored auth and passes only the verification ID to backend checkout', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  function render(auth, context, params) {
    let index = 0;
    const exports = {};
    const native = { SafeAreaView: 'main', View: 'div', Text: 'span', Platform: { OS: 'web' }, StyleSheet: { create: value => value } };
    const imports = {
      react: { ...React, useState: initial => React.useState(index++ === 0 ? context : initial) },
      'react/jsx-runtime': require('react/jsx-runtime'),
      'react-native': native, 'react-native-safe-area-context': native,
      'expo-router': { router: {}, useLocalSearchParams: () => params },
      '@/components/projects/VerificationCheckoutScreen': { VerificationCheckoutScreen: props => React.createElement('div', { 'data-verification': props.verificationId }, 'Backend checkout') },
      '@/components/ui/Button': { Button: props => React.createElement('button', null, props.title) },
      '@/components/ui/Loading': { Loading: () => React.createElement('div', null, 'Restoring') },
      '@/store/auth.store': { useAuthStore: () => auth },
      '@/utils/payment-return': {}, '@/constants/colors': { colors: {} },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/payment/result.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
      { exports, require: key => { if (key in imports) return imports[key]; throw Error(key); } });
    return renderToStaticMarkup(React.createElement(exports.default));
  }
  const context = { accountId: 'owner', id: 'saved-verification' };
  const params = { verificationId: 'actual-verification', id: 'payos-link', status: 'PAID' };
  let html = render({ isLoading: true }, context, params);
  assert.match(html, /Restoring/); assert.doesNotMatch(html, /Backend checkout/);
  html = render({ isLoading: false, isAuthenticated: false }, context, params);
  assert.match(html, /Đăng nhập để xem kết quả/); assert.doesNotMatch(html, /Backend checkout/);
  const auth = { isLoading: false, isAuthenticated: true, account: { id: 'owner' } };
  html = render(auth, context, params);
  assert.match(html, /data-verification="actual-verification"/); assert.doesNotMatch(html, /payos-link|Thanh toán thành công/);
  html = render(auth, context, { id: 'payos-link', status: 'PAID' });
  assert.match(html, /data-verification="saved-verification"/);
});
