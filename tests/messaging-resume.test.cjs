const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('returning to the Android app renews push registration without prompting again', async () => {
  const effects = [], appListeners = new Set();
  const owner = { id: 'fixture-account', role: 0 };
  const session = { account: owner, generation: 1, accessToken: 'fixture-only' };
  let registrations = 0, permissionRequests = 0, stateIndex = 0, currentToken = 'fixture-token';
  const pushStates = [];
  const hub = { state: 'Connected', on() {}, onreconnecting() {}, onreconnected() {}, onclose() {}, start: async () => {}, stop: async () => {}, invoke: async () => {} };
  const builder = { withUrl() { return this; }, withAutomaticReconnect() { return this; }, configureLogging() { return this; }, build() { return hub; } };
  const mocks = {
    react: { createContext: () => ({}), useContext() {}, useCallback: fn => fn, useEffect: effect => effects.push(effect), useRef: current => ({ current }), useState: value => { const index = stateIndex++; return [value === '' ? 'fixture-device' : value, next => { if (index === 4) pushStates.push(next); }]; } },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: (_, callback) => { appListeners.add(callback); return { remove: () => appListeners.delete(callback) }; } }, StyleSheet: { create: x => x } },
    '@microsoft/signalr': { HubConnectionBuilder: function () { return builder; }, HubConnectionState: { Connected: 'Connected' }, LogLevel: { None: 0 } },
    'expo-router': { router: { push() {} } },
    'react-native-safe-area-context': {}, 'expo-symbols': {},
    '@/constants/config': { API_URL: 'http://localhost:5169/api' },
    '@/store/auth.store': { useAuthStore: () => ({ account: owner, isAuthenticated: true }) },
    '@/utils/storage': { tokenStorage: { getSession: () => session } },
    '@/services/api': {},
    '@/services/messaging.service': { messagingService: { unread: async () => ({ count: 0 }), registerDevice: async () => { registrations++; } } },
    '@/messaging/device': { chatDeviceId: async () => 'fixture-device', chatPushPreference: async () => true, chatPreviewPreference: async () => true, takeChatTarget: async () => null },
    '@/messaging/push': { pushPlatform: 'Android', initializePush: async () => () => {}, existingPushToken: async () => currentToken, requestPushToken: async () => { permissionRequests++; } },
    '@/components/projects/hub/PersonAvatar': {},
  };
  const output = ts.transpileModule(fs.readFileSync('src/components/messaging/ChatProvider.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => { if (!(name in mocks)) throw new Error('Missing mock: ' + name); return mocks[name]; }, setTimeout, clearTimeout, setInterval, clearInterval, AbortController });
  exports.ChatProvider({ children: null });
  const cleanups = effects.map(effect => effect());
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  try {
    await settle(); assert.equal(registrations, 1);
    for (const listener of appListeners) listener('background');
    await settle(); assert.equal(registrations, 1);
    for (const listener of appListeners) listener('active');
    await settle(); assert.equal(registrations, 2);
    assert.equal(permissionRequests, 0);
    currentToken = null;
    for (const listener of appListeners) listener('active');
    await settle(); assert.equal(registrations, 2);
    assert.equal(pushStates.at(-1), false);
  } finally { cleanups.forEach(cleanup => cleanup?.()); }
  for (const listener of appListeners) listener('active');
  await settle(); assert.equal(registrations, 2);
});
