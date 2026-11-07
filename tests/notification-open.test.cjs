const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class ApiError extends Error { constructor(status) { super('Unavailable'); this.status = status; } }
function inbox(service) {
  const states = [], navigations = [];
  let synchronized = 0;
  const session = { generation: 1, account: { id: 'account' } };
  const mocks = {
    react: { useState: value => { const index = states.length; states.push(value); return [value, next => { states[index] = next; }]; }, useRef: value => ({ current: value }), useEffect: () => {}, useCallback: fn => fn },
    'expo-router': { router: { push: path => navigations.push(path) } },
    '@/components/notifications/NotificationsProvider': { useNotificationUpdates: () => ({ revision: 0, readStates: {}, read: item => service.read(item.id).then(() => synchronized++).catch(() => {}), readAll: async () => {} }) },
    '@/services/notifications.service': { notificationsService: service },
    '@/services/api': { ApiError },
    '@/store/auth.store': { useAuthStore: () => ({ account: session.account }) },
    '@/utils/storage': { tokenStorage: { getSession: () => session } },
    '@/utils/notifications': { safeNotificationTarget: value => value === '/settings' ? value : null },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useNotificationsInbox.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; }, AbortController });
  return { ...exports.useNotificationsInbox(), states, navigations, synchronized: () => synchronized, session };
}

test('navigation starts before marking read completes', async () => {
  let finishRead, targetRequested = false;
  const app = inbox({ read: () => new Promise(resolve => { finishRead = resolve; }), target: async () => { targetRequested = true; return '/settings'; } });
  const opening = app.open({ id: 'one', readAt: null, targetType: 'UserVerification' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(targetRequested, true);
  assert.deepEqual(app.navigations, ['/settings']);
  finishRead(); await opening; await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.synchronized(), 1);
});

test('a notification without a destination is marked read silently', async () => {
  let reads = 0;
  const app = inbox({ read: async () => { reads++; }, target: async () => null });
  await app.open({ id: 'one', readAt: null });
  assert.equal(reads, 1);
  assert.deepEqual(app.navigations, []);
  assert.equal(app.states[4], '');
});

test('unavailable destinations do not display an alert or prevent marking read', async () => {
  for (const status of [403, 404, 410]) {
    const app = inbox({ read: async () => {}, target: async () => { throw new ApiError(status); } });
    await app.open({ id: 'one', readAt: null, targetType: 'UserVerification' });
    assert.equal(app.states[4], '');
    assert.equal(app.synchronized(), 1);
  }
});

test('a failed read does not block a valid destination', async () => {
  const app = inbox({ read: async () => { throw new Error('Read failed'); }, target: async () => '/settings' });
  await app.open({ id: 'one', readAt: null, targetType: 'UserVerification' });
  assert.deepEqual(app.navigations, ['/settings']);
});

test('a changed account cannot navigate from an old notification request', async () => {
  let finishTarget;
  const app = inbox({ read: async () => {}, target: () => new Promise(resolve => { finishTarget = resolve; }) });
  const opening = app.open({ id: 'one', readAt: null, targetType: 'UserVerification' });
  app.session.generation++;
  await new Promise(resolve => setImmediate(resolve));
  finishTarget?.('/settings'); await opening;
  assert.deepEqual(app.navigations, []);
});

test('an embedded safe target opens synchronously without waiting for either API', async () => {
  let finishRead;
  const app = inbox({ read: () => new Promise(resolve => { finishRead = resolve; }), target: () => { throw new Error('Target lookup should not run'); } });
  const opening = app.open({ id: 'one', readAt: null, targetUrl: '/settings' });
  assert.deepEqual(app.navigations, ['/settings']);
  await opening;
  finishRead();
});
