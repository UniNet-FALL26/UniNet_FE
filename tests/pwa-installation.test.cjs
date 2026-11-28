const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');

function setup({ standalone = false, ios = false, secure = true } = {}) {
  const events = new Map(), mediaEvents = new Map(), registrations = [];
  const media = { matches: standalone, addEventListener: (name, listener) => mediaEvents.set(name, listener), removeEventListener: name => mediaEvents.delete(name) };
  const browser = { isSecureContext: secure, matchMedia: () => media,
    addEventListener: (name, listener) => events.set(name, listener), removeEventListener: name => events.delete(name) };
  const navigator = { userAgent: ios ? 'iPhone' : 'Chrome', platform: ios ? 'iPhone' : 'Linux', maxTouchPoints: 0,
    serviceWorker: { register: async (...args) => { registrations.push(args); return {}; } } };
  const exports = {};
  const source = fs.readFileSync(path.join(root, 'src/store/pwa-install.web.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, window: browser, navigator, process: { env: { NODE_ENV: 'production' } } });
  const store = exports.pwaInstall;
  const cleanup = store.start();
  return { store, events, media, mediaEvents, registrations, cleanup };
}

test('root PWA worker registration preserves other service worker registrations', () => {
  const env = setup();
  assert.equal(env.registrations.length, 1);
  assert.equal(env.registrations[0][0], '/pwa-sw.js');
  assert.equal(env.registrations[0][1].scope, '/');
  assert.equal(env.store.getSnapshot().available, true);
  env.cleanup(); assert.equal(env.events.size, 0);
});

test('install prompt is used only after an action, consumed once and renewed after dismissal', async () => {
  const env = setup(); let prompted = 0, prevented = 0;
  const event = { preventDefault: () => prevented++, prompt: async () => prompted++, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
  env.events.get('beforeinstallprompt')(event);
  assert.equal(prompted, 0);
  assert.equal(prevented, 1);
  assert.equal(env.store.getSnapshot().canPrompt, true);
  assert.equal(await env.store.requestInstall(), 'dismissed');
  assert.equal(await env.store.requestInstall(), 'unavailable');
  assert.equal(prompted, 1);
  env.events.get('beforeinstallprompt')(event);
  assert.equal(env.store.getSnapshot().canPrompt, true);
});

test('accepting a prompt does not claim installation until appinstalled fires', async () => {
  const env = setup();
  env.events.get('beforeinstallprompt')({ preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  assert.equal(await env.store.requestInstall(), 'accepted');
  assert.equal(env.store.getSnapshot().installed, false);
  env.events.get('appinstalled')();
  assert.equal(env.store.getSnapshot().installed, true);
  assert.equal(env.store.getSnapshot().canPrompt, false);
});

test('standalone mode hides install action and iOS uses instructions', async () => {
  const installed = setup({ standalone: true });
  assert.equal(installed.store.getSnapshot().installed, true);
  assert.equal(await installed.store.requestInstall(), 'unavailable');
  const ios = setup({ ios: true });
  assert.equal(ios.store.getSnapshot().ios, true);
  assert.equal(await ios.store.requestInstall(), 'unavailable');
  installed.media.matches = false;
  installed.mediaEvents.get('change')();
  assert.equal(installed.store.getSnapshot().installed, false);
});

test('insecure origins do not register workers or advertise installation', () => {
  const env = setup({ secure: false });
  assert.equal(env.store.getSnapshot().available, false);
  assert.equal(env.registrations.length, 0);
});

test('a failed browser prompt clears busy state and permits a fresh event', async () => {
  const env = setup();
  env.events.get('beforeinstallprompt')({ preventDefault() {}, prompt: async () => { throw Error('blocked'); } });
  assert.equal(await env.store.requestInstall(), 'unavailable');
  assert.equal(env.store.getSnapshot().busy, false);
  assert.ok(env.store.getSnapshot().error);
});

test('worker never intercepts API, cross-origin or mutation requests; navigation falls back without caching pages', async () => {
  const events = new Map(), cacheCalls = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/pwa-sw.js'), 'utf8'), {
    self: { location: { origin: 'https://uninet.test' }, clients: { claim: async () => {} }, addEventListener: (name, callback) => events.set(name, callback) },
    URL, Response, fetch: async () => { throw Error('offline'); },
    caches: { open: async name => ({ addAll: async urls => cacheCalls.push({ name, urls }) }), match: async () => new Response('offline fallback'), keys: async () => [], delete: async () => {} },
  });
  let installation; events.get('install')({ waitUntil: promise => { installation = promise; } }); await installation;
  assert.deepEqual(Array.from(cacheCalls[0].urls), ['/offline.html']);
  for (const request of [
    { url: 'https://uninet.test/api/private', method: 'GET', mode: 'navigate' },
    { url: 'https://api.other.test/private', method: 'GET', mode: 'navigate' },
    { url: 'https://uninet.test/profile', method: 'POST', mode: 'navigate' },
    { url: 'https://uninet.test/api/private', method: 'GET', mode: 'cors' },
  ]) events.get('fetch')({ request, respondWith: () => assert.fail('private request intercepted') });
  let response;
  events.get('fetch')({ request: { url: 'https://uninet.test/profile', method: 'GET', mode: 'navigate' }, respondWith: value => { response = value; } });
  assert.equal(await (await response).text(), 'offline fallback');
  assert.equal(cacheCalls.length, 1);
});

test('manifest has stable identity, standalone launch and actual 192/512px icons', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    assert.ok(icon);
    const png = fs.readFileSync(path.join(root, 'public', icon.src));
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
});

test('worker activation removes only its own obsolete caches', async () => {
  const events = new Map(), deleted = [];
  let claimed = false;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/pwa-sw.js'), 'utf8'), {
    self: { clients: { claim: async () => { claimed = true; } }, addEventListener: (name, callback) => events.set(name, callback) },
    caches: { keys: async () => ['uninet-pwa-offline-v0', 'uninet-pwa-offline-v1', 'firebase-cache', 'another-app'], delete: async name => deleted.push(name) },
  });
  let activation; events.get('activate')({ waitUntil: promise => { activation = promise; } }); await activation;
  assert.deepEqual(deleted, ['uninet-pwa-offline-v0']); assert.equal(claimed, true);
});
