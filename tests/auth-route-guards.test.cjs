const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderLayout(group, state) {
  const exports = {};
  const source = fs.readFileSync(`src/app/(${group})/_layout.tsx`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(output, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === '@/store/auth.store') return { useAuthStore: () => state };
    if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1 } };
    if (name === 'expo-router') return { Redirect: 'Redirect', Slot: 'Slot' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@/components/company/company-ui') return { CompanyTabBar: 'CompanyTabBar' };
    if (name === '@/components/ui/Loading') return { Loading: 'Loading' };
    if (name === '@/components/app-tabs') return { __esModule: true, default: 'AppTabs' };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports.default();
}

for (const group of ['tabs', 'company']) {
  test(`${group}: wait for session restoration before mounting protected screens`, () => {
    assert.equal(renderLayout(group, { isLoading: true, isAuthenticated: false, account: null }).type, 'Loading');
  });
  test(`${group}: reload without a session redirects before mounting protected screens`, () => {
    const view = renderLayout(group, { isLoading: false, isAuthenticated: false, account: null });
    assert.equal(view.type, 'Redirect');
    assert.equal(view.props.href, '/(auth)/login');
  });
}

test('signed-in users reach the layout for their own role', () => {
  const state = role => ({ isLoading: false, isAuthenticated: true, account: { id: 'owner', role } });
  assert.equal(renderLayout('tabs', state(0)).type, 'AppTabs');
  assert.equal(renderLayout('company', state(1)).type, 'SafeAreaView');
  assert.equal(renderLayout('tabs', state(1)).props.href, '/(company)');
  assert.equal(renderLayout('company', state(0)).props.href, '/(tabs)');
});
