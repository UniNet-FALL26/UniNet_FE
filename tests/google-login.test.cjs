const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, Error, process: { env: {} }, ...globals });
  return exports;
}

class ApiError extends Error {}
const session = { account: { id: 'student', role: 0 }, accessToken: 'fixture-access', refreshToken: 'fixture-refresh' };
function service(apiRequest) {
  return load('src/services/auth.service.ts', {
    '@/services/api': { apiRequest, ApiError }, '@/utils/storage': {},
    '@/messaging/device': { chatDeviceId: async () => 'fixture-device' }, './messaging.service': {},
  }).authService;
}
function hook(loginWithGoogle) {
  const saved = [];
  const errors = [];
  const { useAuth } = load('src/hooks/useAuth.ts', {
    react: { useState: () => [false, value => errors.push(value)] },
    '@/services/auth.service': { authService: { loginWithGoogle } },
    '@/store/auth.store': { authStore: { setAuth: async value => saved.push(value) } },
  });
  return { auth: useAuth(), saved, errors };
}

test('Google ID token is exchanged for a Student session with this device', async () => {
  const calls = [];
  const auth = service(async (url, options) => { calls.push({ url, options }); return session; });
  assert.equal(await auth.loginWithGoogle('google-id-token'), session);
  assert.equal(calls[0].url, '/auth/google');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { idToken: 'google-id-token', role: 0, deviceId: 'fixture-device' });
  assert.equal(calls[0].options.feedback.success, false);
});

test('blank Google credentials never reach the API', async () => {
  let calls = 0;
  const auth = service(async () => { calls++; });
  for (const token of ['', '  ', null, undefined]) await assert.rejects(() => auth.loginWithGoogle(token));
  assert.equal(calls, 0);
});

test('a non-Student response from an older server is never accepted', async () => {
  const auth = service(async () => ({ ...session, account: { ...session.account, role: 1 } }));
  await assert.rejects(() => auth.loginWithGoogle('google-id-token'), /chỉ dành cho sinh viên/);
});

test('Google success saves the UniNet session and permits navigation', async () => {
  const env = hook(async token => { assert.equal(token, 'google-id-token'); return session; });
  assert.equal(await env.auth.google(async () => 'google-id-token'), true);
  assert.deepEqual(env.saved, [session]);
});

test('cancelling Google selection does not exchange credentials, save a session or navigate', async () => {
  const env = hook(async () => { throw Error('must not call API'); });
  assert.equal(await env.auth.google(async () => null), false);
  assert.equal(env.saved.length, 0);
  assert.equal(env.errors.some(value => typeof value === 'string'), false);
});

test('Google provider and backend errors leave the user signed out', async () => {
  for (const failureAt of ['provider', 'backend']) {
    const env = hook(async () => { if (failureAt === 'backend') throw Error('Chỉ dành cho sinh viên.'); return session; });
    assert.equal(await env.auth.google(async () => { if (failureAt === 'provider') throw Error('Không mở được Google.'); return 'token'; }), false);
    assert.equal(env.saved.length, 0);
    assert.equal(env.errors.some(value => typeof value === 'string'), true);
  }
});

test('Android uses explicit account selection and handles cancellation without credentials', async () => {
  for (const type of ['success', 'cancelled']) {
    let selection = 0;
    const sdk = {
      GoogleOneTapSignIn: {
        configure: options => { assert.equal(options.webClientId, 'fixture.apps.googleusercontent.com'); assert.equal(options.offlineAccess, false); },
        checkPlayServices: async () => {},
        presentExplicitSignIn: async () => { selection++; return { type, data: { idToken: 'google-token' } }; },
      },
      isCancelledResponse: response => response.type === 'cancelled',
      isSuccessResponse: response => response.type === 'success',
      isErrorWithCode: () => false,
    };
    const { getGoogleIdToken } = load('src/services/google-native.ts', {
      'react-native': { Platform: { OS: 'android' } }, 'react-native-nitro-google-signin': sdk,
    }, { process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'fixture.apps.googleusercontent.com' } } });
    assert.equal(await getGoogleIdToken(), type === 'success' ? 'google-token' : null);
    assert.equal(selection, 1);
  }
});

test('Android rejects missing configuration before importing native code', async () => {
  const { getGoogleIdToken } = load('src/services/google-native.ts', { 'react-native': { Platform: { OS: 'android' } } });
  await assert.rejects(getGoogleIdToken, /chưa được cấu hình/);
});

test('web initializes GIS once and only routes credentials to the mounted form', async () => {
  let init, initialized = 0, renders = 0;
  const identity = {
    initialize: options => { init = options; initialized++; },
    renderButton: (element, options) => { renders++; assert.equal(options.width, 375); assert.equal(options.locale, 'vi'); },
  };
  const { renderGoogleButton } = load('src/services/google-identity.ts', {}, {
    window: { google: { accounts: { id: identity } } },
    process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'fixture.apps.googleusercontent.com' } },
  });
  const element = { clientWidth: 375, replaceChildren() {} };
  const credentials = [];
  const disposeFirst = await renderGoogleButton(element, token => credentials.push('old:' + token), () => {});
  const disposeCurrent = await renderGoogleButton(element, token => credentials.push(token), () => {});
  disposeFirst();
  init.callback({ credential: 'google-token' });
  disposeCurrent();
  init.callback({ credential: 'stale-token' });
  assert.deepEqual(credentials, ['google-token']);
  assert.equal(initialized, 1);
  assert.equal(renders, 2);
  assert.equal(init.auto_select, false);
});
