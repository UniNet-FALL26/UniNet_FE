const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, deps) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => deps[name] ?? new Proxy({}, { get: (_, key) => key }) });
  return exports;
}
const react = { useState: value => [value, () => {}] };
test('successful student registration never establishes a session; manual login does', async () => {
  const response = { account: { role: 0 }, accessToken: 'fixture-only' }; let sessions = 0, registrations = 0;
  const { useAuth } = load('src/hooks/useAuth.ts', { react,
    '@/services/auth.service': { authService: { registerStudent: async () => { registrations++; return response; }, login: async () => response } },
    '@/store/auth.store': { authStore: { setAuth: async () => { sessions++; } } },
  });
  const auth = useAuth(); assert.equal(await auth.register({}), true); assert.equal(registrations, 1); assert.equal(sessions, 0);
  assert.equal(await auth.login({}), true); assert.equal(sessions, 1);
});
test('failed student registration does not authenticate', async () => {
  let sessions = 0;
  const { useAuth } = load('src/hooks/useAuth.ts', { react, '@/services/auth.service': { authService: { registerStudent: async () => { throw Error('Duplicate email'); } } }, '@/store/auth.store': { authStore: { setAuth: async () => { sessions++; } } } });
  assert.equal(await useAuth().register({}), false); assert.equal(sessions, 0);
});
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : []; }
for (const success of [true, false]) test(`student form routes to login only on success=${success}`, async () => {
  let state = 0; const routes = [];
  const { RegisterForm } = load('src/components/auth/RegisterForm.tsx', {
    react: { useState: initial => [state++ === 0 ? { fullName: 'Nguyễn An', email: 'an@fixture.test', password: 'Fixture123', confirm: 'Fixture123' } : state === 2 ? true : initial, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { StyleSheet: { create: v => v }, Text: 'Text', View: 'View' },
    'expo-router': { router: { replace: route => routes.push(route) } },
    './AuthScreen': { AuthScreen: 'AuthScreen', authStyles: {} }, '@/constants/colors': { colors: {} },
    '@/hooks/useAuth': { useAuth: () => ({ register: async () => success, clearError() {} }) },
    '@/utils/validation': { normalizeEmail: v => v, passwordRules: () => ({ length: true, letter: true, number: true }), validEmail: () => true },
  });
  await nodes(RegisterForm()).find(node => node.type === 'Button' && node.props.title === 'Tạo tài khoản').props.onPress();
  assert.equal(routes.length, success ? 1 : 0);
  if (success) { assert.equal(routes[0].pathname, '/(auth)/login'); assert.equal(routes[0].params.registered, '1'); }
});
