const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');

function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (!(name in imports)) throw new Error(`Missing mock: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}
function nodes(node) {
  return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];
}

for (const width of [390, 599, 600, 1440]) test(`${width}px: Join uses a page only on phones`, () => {
  let stateIndex = 0;
  const navigation = [], selected = [];
  const { FindTeammatesScreen } = load('src/components/projects/hub/FindTeammatesScreen.tsx', {
    react: { useCallback: fn => fn, useState: initial => {
      const slot = stateIndex++;
      return [slot === 5 ? { key: 'viewer:1:', data: { items: [{ id: 'project' }], total: 1, pageSize: 15 } } : slot === 6 ? false : initial, value => { if (slot === 8) selected.push(value); }];
    } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'expo-router': { useFocusEffect() {}, router: { push: value => navigation.push(value) } },
    'expo-image': { Image: 'Image' },
    '../../../../assets/images/friends-banner-illustration.png': 'banner',
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])), StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width }) },
    '@/services/project-hub.service': {}, '@/services/skill.service': {}, '@/types/project-hub': {},
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'viewer' } }) },
    './ProjectHubUI': { HubAction: 'HubAction', HubIcon: 'HubIcon', hubColors: {}, ui: {} },
    './ProjectHubFields': {}, './RecruitmentPostCard': { RecruitmentPostCard: 'RecruitmentPostCard' },
    './RecruitmentPostDialog': { RecruitmentPostDialog: 'RecruitmentPostDialog' },
  });
  nodes(FindTeammatesScreen()).find(node => node.type === 'RecruitmentPostCard').props.onOpen();
  assert.deepEqual(navigation, width < 600 ? [{ pathname: '/recruitment/[id]', params: { id: 'project' } }] : []);
  assert.deepEqual(selected, width < 600 ? [] : ['project']);
});

for (const width of [390, 1440]) test(`${width}px: recruitment route presents responsively and returns to collaboration`, () => {
  let history = true;
  const calls = [];
  const { default: Screen } = load('src/app/recruitment/[id].tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    'expo-router': { Redirect: 'Redirect', useLocalSearchParams: () => ({ id: 'project' }), router: { canGoBack: () => history, back: () => calls.push('back'), replace: href => calls.push(href) } },
    'react-native': { useWindowDimensions: () => ({ width }) },
    '@/components/projects/hub/ProjectHubUI': { HubPagePresentation: { Provider: 'Provider' } },
    '@/components/projects/hub/RecruitmentPostDialog': { RecruitmentPostDialog: 'RecruitmentPostDialog' },
    '@/store/auth.store': { useAuthStore: () => ({ isAuthenticated: true, isLoading: false }) },
  });
  const tree = Screen();
  assert.equal(tree.props.value, width < 600);
  assert.equal(tree.props.children.props.projectId, 'project');
  tree.props.children.props.onClose();
  history = false;
  tree.props.children.props.onClose();
  assert.deepEqual(calls, ['back', '/(tabs)/find-teammates']);
});
