const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(request) {
  const cache = new Map();
  const body = new FormData();
  const asset = { uri: 'file:///photo.png' };
  function load(name) {
    if (name === './api') return { apiRequest: request };
    if (name === '@/utils/image-picker') return { imageBody: async (input, signal) => {
      assert.equal(input, asset);
      signal?.throwIfAborted();
      return body;
    } };
    const file = `src/services/${name.replace('./', '')}.ts`;
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, require: load, encodeURIComponent });
    return exports;
  }
  return { asset, body, service: () => load('./background-removal.service').backgroundRemovalService,
    portrait: () => load('./portrait.service').portraitService };
}
const preview = { sessionId: 'session', previewUrl: 'data:image/png;base64,aW1hZ2U=', hasTransparentBackground: true, expiresAt: '2099-01-01T00:00:00Z' };
const imageUrl = 'https://res.cloudinary.com/fixture/image/upload/v1/uninet/portfolio/portraits/image.png';

test('reusable service previews first, confirms explicitly and releases with cancellation', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const env = setup(async (path, options) => {
    calls.push(path); assert.equal(options.signal, signal);
    if (path.endsWith('/remove-background')) {
      assert.equal(options.method, 'POST'); assert.equal(options.body, env.body);
      return { success: true, data: preview };
    }
    if (path.endsWith('/confirm')) {
      assert.equal(options.method, 'POST'); assert.equal(JSON.parse(options.body).sessionId, 'session');
      return { success: true, data: { imageUrl, hasTransparentBackground: true } };
    }
    assert.equal(options.method, 'DELETE');
  });
  assert.equal(await env.service().process(env.asset, signal), preview);
  assert.deepEqual(calls, ['/ai-images/remove-background']);
  assert.equal(await env.service().confirm(preview.sessionId, signal), imageUrl);
  await env.service().release('session/a b', signal);
  assert.equal(calls[2], '/ai-images/sessions/session%2Fa%20b');
});

test('portrait compatibility entry point shares the reusable service and signals are optional', async () => {
  const env = setup(async () => ({ success: true, data: preview }));
  assert.equal(env.portrait(), env.service());
  assert.equal(await env.service().process(env.asset), preview);
});

test('malformed preview responses fail with a useful error', async () => {
  for (const response of [null, {}, { success: false, data: preview },
    ...[{ sessionId: 12 }, { previewUrl: {} }, { previewUrl: 'data:image/png;base64,' },
      { hasTransparentBackground: 'true' }, { hasTransparentBackground: false }]
      .map(change => ({ success: true, data: { ...preview, ...change } }))]) {
    const env = setup(async () => response);
    await assert.rejects(env.service().process(env.asset), /ảnh tách nền hợp lệ/);
  }
});

test('confirmation rejects malformed, temporary and foreign image URLs', async () => {
  for (const response of [null, {}, { success: false }, ...[
    { imageUrl: 'blob:preview' }, { imageUrl: 'https://example.com/image.png' },
    { imageUrl: 'https://res.cloudinary.com/fixture' }, { imageUrl: {} },
    { imageUrl, hasTransparentBackground: false }, { imageUrl, hasTransparentBackground: 'true' },
  ].map(data => ({ success: true, data }))]) {
    await assert.rejects(setup(async () => response).service().confirm('session'), /ảnh Cloudinary hợp lệ/);
  }
});

test('server failures and cancellation propagate without retrying or confirming', async () => {
  const failure = new Error('Gemini unavailable');
  const env = setup(async () => { throw failure; });
  await assert.rejects(env.service().process(env.asset), error => error === failure);
  await assert.rejects(env.service().confirm('session'), error => error === failure);
  await assert.rejects(env.service().release('session'), error => error === failure);
  const controller = new AbortController(); controller.abort(failure);
  const cancelled = setup(() => { assert.fail('aborted image must not reach API'); });
  await assert.rejects(cancelled.service().process(cancelled.asset, controller.signal), error => error === failure);
});
