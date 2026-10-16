const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const id = 'uninet/images/11111111111111111111111111111111/22222222222222222222222222222222';
const result = format => ({ imageUrl: `https://res.cloudinary.com/fixture/image/upload/v1/${id}.${format}`, publicId: id, format });

function setup(os, request, picker = {}, fetchFile = fetch) {
  const cache = new Map();
  class NativeFormData { entries = []; append(...entry) { this.entries.push(entry); } }
  function load(name) {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === 'expo-image-picker') return picker;
    if (name === 'expo-file-system') return { File: class {
      constructor(uri) { this.uri = uri; this.size = 100; this.type = uri.endsWith('.webp') ? 'image/webp' : uri.endsWith('.png') ? 'image/png' : 'image/jpeg'; }
      async bytes() { return Uint8Array.from([7, 8, 9]); }
    } };
    if (name === './api' || name === '@/services/api') return { apiRequest: request };
    if (name.startsWith('./')) name = `@/services/${name.slice(2)}`;
    if (cache.has(name)) return cache.get(name);
    const exports = {}; cache.set(name, exports);
    const source = fs.readFileSync(`src/${name.replace('@/', '')}.ts`, 'utf8');
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, require: load, FormData: os === 'web' ? FormData : NativeFormData, fetch: fetchFile,
    });
    return exports;
  }
  return { service: () => load('@/services/image.service').imageService, picker: () => load('@/utils/image-picker'), portrait: () => load('@/services/portrait.service').portraitService };
}
test('any screen can upload a web image without portrait processing', async () => {
  const signal = new AbortController().signal;
  for (const [format, mime] of [['png', 'image/png'], ['jpg', 'image/jpeg'], ['webp', 'image/webp']]) {
    const file = new File(['original bytes'], `image.${format}`, { type: mime });
    const env = setup('web', async (path, options) => {
      assert.equal(path, '/images'); assert.equal(options.method, 'POST'); assert.equal(options.signal, signal);
      assert.equal(await options.body.get('file').text(), 'original bytes');
      return result(format);
    });
    assert.equal((await env.service().upload({ uri: 'blob:image', file }, signal)).imageUrl, result(format).imageUrl);
  }
});
test('native upload sends local URI and optional cancellation signal', async () => {
  const env = setup('android', async (_, options) => {
    const file = options.body.entries[0][1];
    assert.equal(file.uri, 'file:///device/photo.webp'); assert.equal(file.type, 'image/webp');
    return result('webp');
  });
  assert.equal((await env.service().upload({ uri: 'file:///device/photo.webp', mimeType: 'image/webp', fileSize: 100 })).format, 'webp');
});
test('invalid or oversized images never reach the API', async () => {
  const env = setup('web', () => { throw Error('must not upload'); });
  for (const file of [new File(['svg'], 'x.svg', { type: 'image/svg+xml' }), new File([], 'empty.png', { type: 'image/png' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
    await assert.rejects(env.service().upload({ uri: 'blob:image', file }), /JPG|5 MB/);
  }
});
test('temporary, foreign or malformed upload results are rejected', async () => {
  const file = new File(['image'], 'x.png', { type: 'image/png' });
  for (const response of [null, {}, { ...result('png'), imageUrl: 'blob:temporary' }, { ...result('png'), imageUrl: 'https://example.org/photo.png' }, { ...result('png'), publicId: 'wrong' }, { ...result('svg') }]) {
    await assert.rejects(setup('web', async () => response).service().upload({ uri: 'blob:image', file }), /hợp lệ/);
  }
});
test('API and aborted file-reading errors propagate to the caller', async () => {
  const failure = new Error('Upload unavailable');
  const file = new File(['image'], 'x.png', { type: 'image/png' });
  await assert.rejects(setup('web', async () => { throw failure; }).service().upload({ uri: 'blob:image', file }), error => error === failure);
  const signal = new AbortController().signal;
  const aborted = new Error('aborted');
  await assert.rejects(setup('web', () => { throw Error('must not upload'); }, {}, async (_, options) => {
    assert.equal(options.signal, signal); throw aborted;
  }).service().upload({ uri: 'blob:image' }, signal), error => error === aborted);
});
test('generic picker can be called outside profile and respects native permissions', async () => {
  const env = setup('ios', null, { requestMediaLibraryPermissionsAsync: async () => ({ granted: false }), launchImageLibraryAsync: () => { throw Error('must not open'); } });
  await assert.rejects(env.picker().pickImage(), /cho phép/);
});
test('portrait processing still previews first and uploads only at confirmation', async () => {
  const paths = [];
  const signal = new AbortController().signal;
  const file = new File(['portrait bytes'], 'portrait.png', { type: 'image/png' });
  const portraitUrl = 'https://res.cloudinary.com/fixture/image/upload/v1/uninet/portfolio/portraits/11111111111111111111111111111111.png';
  const env = setup('web', async (path, options) => {
    paths.push(path); assert.equal(options.signal, signal);
    if (path === '/ai-images/remove-background') {
      assert.equal(await options.body.get('file').text(), 'portrait bytes');
      return { success: true, data: { sessionId: 'session', previewUrl: 'data:image/png;base64,fixture', hasTransparentBackground: true } };
    }
    assert.equal(path, '/ai-images/confirm'); assert.equal(JSON.parse(options.body).sessionId, 'session');
    return { success: true, data: { imageUrl: portraitUrl, hasTransparentBackground: true } };
  });
  const preview = await env.portrait().process({ uri: 'blob:portrait', file }, signal);
  assert.deepEqual(paths, ['/ai-images/remove-background']);
  assert.equal(await env.portrait().confirm(preview.sessionId, signal), portraitUrl);
});
