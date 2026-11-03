const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const sample = require('../src/data/profile-sample.json');
function render(file, data, role = 0) {
  let state = 0; const exports = {};
  const account = { id: 'student-owner', role, email: 'student@fixture.test', profile: data.profile };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Date, setInterval, clearInterval, AbortController,
    require(name) {
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'react') return { useState: initial => [state++ === (file.includes('(tabs)') ? 0 : 1) ? { accountId: account.id, data } : typeof initial === 'function' ? initial() : initial, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect() {} };
      if (name === 'react-native') return new Proxy({ StyleSheet: { create: v => v, hairlineWidth: 1 }, Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 1440 }) }, { get: (obj, key) => obj[key] ?? key });
      if (name === 'expo-router') return { useFocusEffect() {}, useLocalSearchParams: () => ({}), useNavigation: () => ({}), router: {} };
      if (name === 'expo-router/react-navigation') return { usePreventRemove() {} };
      if (name === '@/store/auth.store') return { useAuthStore: () => ({ account, isAuthenticated: true, isLoading: false }) };
      if (name === '@/hooks/useAuth') return { useAuth: () => ({ logout() {}, clearError() {}, loading: false }) };
      if (name === '@/hooks/useStudentVerification') return { useStudentVerification: () => ({}) };
      if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2 } };
      if (name === '@/constants/colors') return { colors: {} };
      if (name === '@/utils/student-profile') return { shouldShowPortfolio: value => value.portfolio.appearance.profile.showPortfolio !== false && !!value.portfolio.headline, hasStudentPortfolioContent: () => false };
      if (name === '@/utils/verification-reminder') return { verificationReminder: () => null };
      if (name === '@/data/profile-templates') return { getProfileTemplate: id => ({ id: id || 'developer-modern' }), getProfileTheme: (_, id) => ({ id: id || 'blue' }) };
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  return file.includes('(tabs)') ? exports.default() : exports.SettingsPanel({ embedded: true });
}
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : []; }
function empty() {
  const data = structuredClone(sample); data.isOwner = true; data.profile.bio = null;
  for (const field of ['headline','careerObjective','location','availability','contactEmail','cvUrl','gpa','yearsOfExperience']) data.portfolio[field] = null;
  for (const field of ['skills','projects','education','experience','certificates','articles','socialLinks','activities','languages']) data.portfolio[field] = [];
  data.portfolio.appearance.profile = {}; return data;
}
for (const disabled of [undefined, false]) test(`new student renders first template without a starter, legacy display=${disabled}`, () => {
  const data = empty(); data.portfolio.appearance.profile.showPortfolio = disabled;
  const tree = nodes(render('src/app/(tabs)/profile.tsx', data));
  const template = tree.find(node => node.type === 'ProfileTemplateRenderer');
  assert.ok(template); assert.equal(template.props.templateId, 'developer-modern'); assert.equal(template.props.theme.id, 'blue');
  assert.equal(tree.some(node => node.type === 'StudentProfileStarter'), false);
});
test('saved template selection is preserved', () => {
  const data = empty(); data.portfolio.appearance.profile = { template: 'developer-landscape', theme: 'mint' };
  const template = nodes(render('src/app/(tabs)/profile.tsx', data)).find(node => node.type === 'ProfileTemplateRenderer');
  assert.ok(template); assert.equal(template.props.templateId, 'developer-landscape'); assert.equal(template.props.theme.id, 'mint');
});
test('student settings keeps template selection without a display switch', () => {
  const tree = nodes(render('src/components/settings/SettingsPanel.tsx', empty()));
  assert.equal(tree.some(node => node.type === 'Switch'), false);
  assert.ok(tree.some(node => node.props?.title === 'Đổi mẫu hồ sơ'));
});
for (const role of [0, 1, 2, 3, 4, 5, 6]) test(`income wallet settings entry is Assessor-only, role=${role}`, () => {
  const tree = nodes(render('src/components/settings/SettingsPanel.tsx', empty(), role));
  assert.equal(tree.some(node => node.props?.title === 'Ví thu nhập'), role === 2);
});
