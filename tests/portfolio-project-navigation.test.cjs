const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderCard({ projectId = 'project / 123', thumbnail = false, editing = null, onNavigate } = {}) {
  const exports = {}, navigations = [];
  const code = ts.transpileModule(fs.readFileSync('src/components/profile/PortfolioProjectCard.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react-native') return { StyleSheet: { create: value => value }, Text: 'Text', View: 'View' };
    if (name === 'expo-router') return { router: { push: value => navigations.push(value) } };
    if (name.endsWith('/ProfileEditContext')) return { EditPhoto: 'EditPhoto', useProfileEditing: () => editing };
    if (name.endsWith('/profile-media')) return { profileMedia: () => null, isSampleLink: () => true };
    if (name.endsWith('/ProjectHubUI')) return { HubIcon: 'HubIcon', hubColors: {} };
    return {};
  } });
  const card = exports.PortfolioProjectCard({ project: { projectId, title: 'Profile project', technologies: [] }, width: 300, theme: {}, thumbnail, onNavigate });
  return { card, navigations };
}

test('any profile viewer can open a linked project using its identity', () => {
  const { card, navigations } = renderCard();
  assert.equal(typeof card.props.onOpen, 'function');
  card.props.onOpen();
  assert.deepEqual(JSON.parse(JSON.stringify(navigations)), [{ pathname: '/group/[id]', params: { id: 'project / 123' } }]);
});

test('unlinked historical entries, thumbnails and profile editing do not navigate', () => {
  for (const options of [{ projectId: null }, { projectId: '' }, { thumbnail: true }, { editing: {} }]) {
    assert.equal(renderCard(options).card.props.onOpen, undefined);
  }
});

test('project popup closes before detail navigation', () => {
  let closed = false;
  const { card, navigations } = renderCard({ onNavigate: () => { assert.equal(navigations.length, 0); closed = true; } });
  card.props.onOpen();
  assert.equal(closed, true);
  assert.equal(navigations.length, 1);
});
