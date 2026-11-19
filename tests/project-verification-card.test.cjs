const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {}, navigations = [];
const jsx = (type, props) => ({ type, props });
const imports = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'expo-router': { router: { push: value => navigations.push(value) } },
  'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
  './ProjectHubUI': { HubPanel: 'Panel', HubAction: 'Action', HubIcon: 'Icon', hubColors: {} },
};
const source = fs.readFileSync('src/components/projects/hub/ProjectVerificationCard.tsx', 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: api, require: name => imports[name] });
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function render(status, isOwner) { return flatten(api.ProjectVerificationCard({ project: { id: 'project-id', status, isOwner } })); }

test('introduces expert feedback before completion without a verification action', () => {
  for (const status of [0, 1, 3]) {
    const nodes = render(status, true);
    assert.ok(nodes.some(node => node.type === 'Panel' && node.props.title === 'Thẩm định dự án'));
    assert.equal(nodes.filter(node => node.type === 'Action').length, 0);
  }
});
test('completed owner can enter the existing booking flow with the project ID', () => {
  const action = render(2, true).find(node => node.type === 'Action');
  assert.equal(action.props.title, 'Thẩm định dự án');
  action.props.onPress();
  assert.equal(navigations.at(-1).pathname, '/group/verification/[id]');
  assert.equal(navigations.at(-1).params.id, 'project-id');
});
test('members and visitors do not receive the owner-only action', () => {
  assert.equal(render(2, false).filter(node => node.type === 'Action').length, 0);
});
