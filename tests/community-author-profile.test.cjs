const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function card({ targetRole = 0, ownRole = null, lookup } = {}) {
  const exports = {}, routes = [], requests = [], effects = [];
  const post = { id: 'post', authorUserId: 'author', authorName: 'Author', createdAt: '2026-11-04', description: '', mediaUrls: [] };
  const code = ts.transpileModule(fs.readFileSync('src/components/community/CommunityPostCard.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, AbortController, require: name => {
    if (name === 'react') return { useState: value => [value, () => {}], useRef: value => ({ current: value }), useEffect: fn => effects.push(fn) };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', Image: 'Image', StyleSheet: { create: value => value } };
    if (name === 'expo-router') return { router: { push: value => routes.push(value) } };
    if (name === '@/constants/colors') return { colors: {} };
    if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2 } };
    if (name === '@/store/auth.store') return { useAuthStore: () => ({ account: { role: ownRole ?? 0, profile: { id: ownRole == null ? 'viewer' : 'author' } } }) };
    if (name === '@/services/public-profile.service') return { publicProfileService: { getById: id => { requests.push(id); return lookup ? lookup() : Promise.resolve({ id, role: targetRole }); } } };
    if (name === '@/services/api') return { reportApiFailure: error => { throw error; } };
    return {};
  } });
  const node = exports.CommunityPostCard({ post, menuOpen: false });
  const author = node.props.children[0].props.children[0];
  const cleanups = effects.map(effect => effect());
  return { author, routes, requests, dispose: () => cleanups.forEach(cleanup => cleanup?.()) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('other assessor authors do not open public profiles; students and partners still do', async () => {
  for (const targetRole of [0, 1, 2]) {
    const value = card({ targetRole });
    value.author.props.onPress(); await settle();
    assert.deepEqual(value.requests, ['author']);
    assert.equal(value.routes.length, targetRole === 2 ? 0 : 1);
    if (value.routes.length) assert.equal(value.routes[0].params.id, 'author');
  }
});

test('own assessor author opens the existing private profile without public lookup', async () => {
  const value = card({ ownRole: 2 });
  value.author.props.onPress(); await settle();
  assert.deepEqual(value.requests, []);
  assert.deepEqual(value.routes, ['/(assessor)/assessor-profile']);
});

test('an author lookup canceled on unmount cannot navigate later', async () => {
  let finish;
  const value = card({ lookup: () => new Promise(resolve => { finish = resolve; }) });
  value.author.props.onPress(); value.dispose(); finish({ role: 0 }); await settle();
  assert.deepEqual(value.routes, []);
});
