const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function screen(file, params = {}) {
  const navigation = [];
  const router = Object.fromEntries(['push', 'replace', 'setParams'].map(method => [method, value => { navigation.push({ method, value }); if (method === 'setParams') Object.assign(params, value); }]));
  const state = []; let cursor = 0;
  const imports = {
    react: { useCallback: value => value, useEffect() {}, useRef: value => ({ current: value }), useState(value) { const index = cursor++; if (!(index in state)) state[index] = typeof value === 'function' ? value() : value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 1000 }) },
    'expo-router': { router, useFocusEffect() {}, useLocalSearchParams: () => params, Redirect: 'Redirect' },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'student-1', role: 0, profile: {} }, isAuthenticated: true, isLoading: false }) },
    '@/hooks/useScreenSafeAreaEdges': { useScreenSafeAreaEdges: () => [] },
    '@/constants/roles': { ACCOUNT_ROLE: { STUDENT: 0 } },
    '@/constants/colors': { colors: {} },
    '@/data/profile-templates': { getProfileTemplate: () => ({ id: 'template' }), getProfileTheme: () => ({ id: 'theme' }) },
    '@/utils/verification-reminder': { verificationReminder: () => null },
    '@/hooks/useStudentVerification': { useStudentVerification: () => ({}) },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name] || new Proxy({}, { get: (_, key) => key }), module, module.exports);
  return { params, navigation, render() { cursor = 0; return module.exports.default(); } };
}
function find(node, predicate) {
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => find(child, predicate))];
}
const profile = 'src/app/(tabs)/profile.tsx';
const labels = { profile: 'Hồ sơ', posts: 'Bài viết', projects: 'Dự án', friends: 'Bạn bè' };
for (const [tab, label] of Object.entries(labels)) {
  test(`${tab} loads directly and switches using parameters without pushing another screen`, () => {
    const app = screen(profile, { tab });
    const tabs = () => find(app.render(), node => node.props.role === 'tab');
    assert.equal(tabs().find(node => node.props['aria-selected']).props['aria-label'], label);
    for (const [next, nextLabel] of Object.entries(labels)) {
      tabs().find(node => node.props['aria-label'] === nextLabel).props.onPress();
      assert.equal(app.navigation.at(-1).method, 'setParams');
      assert.equal(app.navigation.at(-1).value.tab, next);
      assert.equal(tabs().find(node => node.props['aria-selected']).props['aria-label'], nextLabel);
    }
  });
}
test('URL changes and removal of the tab parameter update the active tab immediately', () => {
  const app = screen(profile, { tab: 'friends' });
  const active = () => find(app.render(), node => node.props.role === 'tab' && node.props['aria-selected'])[0].props['aria-label'];
  assert.equal(active(), 'Bạn bè');
  app.params.tab = 'projects'; assert.equal(active(), 'Dự án');
  delete app.params.tab; assert.equal(active(), 'Hồ sơ');
  app.params.tab = 'invalid'; assert.equal(active(), 'Hồ sơ');
});
for (const tab of ['projects', 'friends']) {
  test(`legacy ${tab} URL redirects to the profile tab and preserves query parameters`, () => {
    const tree = screen(`src/app/profile/${tab}.tsx`, { new: '1', view: 'received' }).render();
    assert.equal(tree.type, 'Redirect');
    assert.equal(tree.props.href.pathname, '/(tabs)/profile');
    assert.equal(tree.props.href.params.tab, tab);
    assert.equal(tree.props.href.params.new, '1');
    assert.equal(tree.props.href.params.view, 'received');
  });
}
