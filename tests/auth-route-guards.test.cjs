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
    if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2 } };
    if (name === '@/utils/role-navigation') return { accountHome: role => role === 2 ? '/(assessor)/assessor-community' : role === 1 ? '/(company)' : '/(tabs)' };
    if (name === '@/components/assessor/AssessorShell') return { AssessorShell: 'AssessorShell' };
    if (name === '@/components/company/CompanyHeaderActions') return { CompanyHeaderActions: 'CompanyHeaderActions' };
    if (name === 'expo-router') return { Redirect: 'Redirect', Slot: 'Slot' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'react-native') return { StyleSheet: { create: value => value }, Text: 'Text', View: 'View', useWindowDimensions: () => ({ width: 390 }), Image: 'Image', Pressable: 'Pressable' };
    if (name === '@/components/notifications/NotificationBell') return { NotificationBell: 'NotificationBell' };
    if (name === '@/constants/colors') return { colors: {} };
    if (name === '@/components/company/company-ui') return { CompanyTabBar: 'CompanyTabBar' };
    if (name === '@/components/ui/Loading') return { Loading: 'Loading' };
    if (name === '@/components/app-tabs') return { __esModule: true, default: 'AppTabs' };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports.default();
}

for (const group of ['tabs', 'company', 'assessor']) {
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
  assert.equal(renderLayout('assessor', state(2)).type, 'AssessorShell');
  assert.equal(renderLayout('tabs', state(2)).props.href, '/(assessor)/assessor-community');
  assert.equal(renderLayout('company', state(2)).props.href, '/(assessor)/assessor-community');
  assert.equal(renderLayout('assessor', state(0)).props.href, '/(tabs)');
  assert.equal(renderLayout('company', state(1)).type, 'SafeAreaView');
  assert.equal(renderLayout('tabs', state(1)).props.href, '/(company)');
  assert.equal(renderLayout('company', state(0)).props.href, '/(tabs)');
});
