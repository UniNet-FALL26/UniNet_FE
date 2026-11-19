const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function feed() {
  const state = [], requests = [];
  let cursor = 0, focus;
  const exports = {};
  const fallback = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : String(name) });
  const mocks = {
    react: { ...React, useState: initial => { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }]; }, useRef: initial => { const slot = cursor++; return state[slot] ??= { current: initial }; }, useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn },
    'react-native': { ...fallback, FlatList: 'FlatList', View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', RefreshControl: 'RefreshControl', StyleSheet: { create: value => value, hairlineWidth: 1, absoluteFill: {} }, useWindowDimensions: () => ({ width: 390 }) },
    'expo-router': { useLocalSearchParams: () => ({}), useFocusEffect: fn => { focus = fn; } },
    '@/constants/colors': { colors: new Proxy({}, { get: () => '#000' }) },
    '@/store/auth.store': { useAuthStore: () => ({ isAuthenticated: true, account: { id: 'account', profile: { id: 'profile' } } }) },
    '@/services/community.service': { communityService: { getAdFeed: async () => [], getPosts: (params, signal) => new Promise((resolve, reject) => requests.push({ params, signal, resolve, reject })) } },
  };
  const code = ts.transpileModule(fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, AbortController, console: { error() {}, log() {} }, require: name => mocks[name] || (name === 'react/jsx-runtime' ? require(name) : fallback) });
  const render = () => { cursor = 0; return exports.default(); };
  const find = node => node?.type === 'FlatList' ? node : React.Children.toArray(node?.props?.children).map(find).find(Boolean);
  const list = () => find(render());
  const posts = () => list().props.data.filter(item => item.type === 'POST').map(item => item.data);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  render(); focus();
  return { requests, list, posts, flush };
}
const row = (id, description = id) => ({ id, description, mediaUrls: [] });
const firstPage = () => Array.from({ length: 10 }, (_, i) => row('post-' + i));

test('repeated end-reached events issue only one request for the next page', async () => {
  const app = feed(); app.requests[0].resolve(firstPage()); await app.flush();
  const reached = app.list().props.onEndReached;
  reached(); reached(); reached();
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].params.page, 2);
});
test('overlapping pages and repeated rows produce one current post per id', async () => {
  const app = feed(); app.requests[0].resolve(firstPage()); await app.flush();
  app.list().props.onEndReached();
  app.requests[1].resolve([row('post-0', 'updated'), row('post-new'), row('post-new')]); await app.flush();
  const posts = app.posts();
  assert.equal(posts.length, 11);
  assert.equal(new Set(posts.map(post => post.id)).size, posts.length);
  assert.equal(posts.find(post => post.id === 'post-0').description, 'updated');
});
test('refresh replaces results and ignores an older load-more response', async () => {
  const app = feed(); app.requests[0].resolve(firstPage()); await app.flush();
  app.list().props.onEndReached();
  const oldRequest = app.requests[1];
  app.list().props.refreshControl.props.onRefresh();
  assert.equal(oldRequest.signal.aborted, true);
  app.requests[2].resolve([row('fresh'), row('fresh')]); await app.flush();
  oldRequest.resolve([row('stale')]); await app.flush();
  assert.deepEqual(Array.from(app.posts(), post => post.id), ['fresh']);
});
