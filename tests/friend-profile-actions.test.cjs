const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render(viewerRole, profileRole, self = false) {
  const exports = {}, effects = [], requests = [], routes = [];
  const account = viewerRole == null ? null : { id: 'viewer', role: viewerRole, profile: { id: self ? 'target' : 'viewer-profile' } };
  const code = ts.transpileModule(fs.readFileSync('src/components/friends/FriendProfileActions.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, AbortController, require: name => {
    if (name === 'react') return { useCallback: fn => fn, useEffect: fn => effects.push(fn), useState: value => [value, () => {}] };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'expo-router') return { router: { push: value => routes.push(value) }, useFocusEffect: () => {} };
    if (name === 'react-native') return { View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator' };
    if (name === '@/store/auth.store') return { useAuthStore: () => ({ account }) };
    if (name.endsWith('/NotificationsProvider')) return { useNotificationUpdates: () => ({ revision: 0 }) };
    if (name === '@/services/friendship.service') return { friendshipService: { relationship: profileId => { requests.push(profileId); return Promise.resolve({ profileId }); } } };
    if (name.endsWith('/ProjectHubUI')) return { HubAction: 'HubAction', hubColors: {}, ui: {} };
    if (name.endsWith('/FriendActions')) return { FriendActions: 'FriendActions' };
    if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2 } };
    if (name === '@/messaging/device') return { messageRoute: () => '/messages' };
    throw new Error(name);
  } });
  const node = exports.FriendProfileActions({ profileId: 'target', profileRole });
  effects.forEach(effect => effect());
  return { node, requests, routes };
}

test('student viewing assessor or partner can message without calling student friendship API', () => {
  for (const profileRole of [1, 2]) {
    const { node, requests, routes } = render(0, profileRole);
    assert.deepEqual(requests, []);
    assert.equal(node.type, 'HubAction');
    node.props.onPress();
    assert.equal(routes[0].params.profileId, 'target');
  }
});

test('friendship lookup remains limited to two different student profiles', () => {
  assert.deepEqual(render(0, 0).requests, ['target']);
  for (const role of [1, 2]) {
    const result = render(role, 0);
    assert.deepEqual(result.requests, []);
    assert.equal(result.node.type, 'HubAction');
  }
  for (const result of [render(null, 2), render(0, 0, true), render(2, 2, true)]) {
    assert.deepEqual(result.requests, []);
    assert.equal(result.node, null);
  }
});
