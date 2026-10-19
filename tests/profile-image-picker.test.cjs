const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(os, picker, request) {
  const exports = {};
  class NativeFormData { entries = []; append(...entry) { this.entries.push(entry); } }
  const load = name => {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === 'expo-image-picker') return picker;
    if (name === 'expo-file-system') return { File: class {
      constructor(uri) { this.uri = uri; this.size = 100; this.type = uri.endsWith('.webp') ? 'image/webp' : uri.endsWith('.png') ? 'image/png' : 'image/jpeg'; }
      async bytes() { return Uint8Array.from([7, 8, 9]); }
    } };
    if (name === '@/services/api') return { apiRequest: request };
    const module = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${name.replace('@/', '')}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports: module, FormData: os === 'web' ? FormData : NativeFormData, fetch, require: load,
    });
    return module;
  };
  Object.assign(exports, load('@/utils/profile-image-picker'));
  return exports;
}
test('web opens the picker directly during the gesture and cancellation returns no image', async () => {
  let launched = false;
  const env = setup('web', { launchImageLibraryAsync: async () => { launched = true; return { canceled: true }; } });
  const pending = env.pickProfileImage(); assert.equal(launched, true); assert.equal(await pending, null);
});
test('native permission denial never opens the picker', async () => {
  const env = setup('ios', { requestMediaLibraryPermissionsAsync: async () => ({ granted: false }), launchImageLibraryAsync: () => { throw Error('must not open'); } });
  await assert.rejects(env.pickProfileImage(), /cho phép/);
});
test('web sends the selected file as multipart and returns the persistent URL', async () => {
  const file = new File(['image bytes'], 'photo.png', { type: 'image/png' });
  const signal = new AbortController().signal;
  const env = setup('web', {}, async (path, options) => {
    assert.equal(path, '/profile/images'); assert.equal(options.signal, signal);
    assert.equal(options.body.get('file').name, 'photo.png'); assert.equal(await options.body.get('file').text(), 'image bytes');
    return { url: 'https://api.example.test/api/profile/images/photo.png' };
  });
  assert.equal(await env.uploadProfileImage({ uri: 'blob:photo', file, fileName: file.name }, signal), 'https://api.example.test/api/profile/images/photo.png');
});
test('unsupported or oversized files fail before any upload', async () => {
  const env = setup('web', {}, () => { throw Error('must not upload'); });
  for (const file of [new File(['svg'], 'image.svg', { type: 'image/svg+xml' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
    await assert.rejects(env.uploadProfileImage({ uri: 'blob:photo', file }, new AbortController().signal), /JPG|5 MB/);
  }
});
test('native multipart retains the local URI and rejects temporary response URLs', async () => {
  const env = setup('android', {}, async (_, options) => {
    assert.equal(options.body.entries[0][1].uri, 'file:///device/photo.jpg');
    assert.equal(options.body.entries[0][1].type, 'image/jpeg');
    return { url: 'blob:temporary' };
  });
  await assert.rejects(env.uploadProfileImage({ uri: 'file:///device/photo.jpg', mimeType: 'image/jpeg', fileSize: 100 }, new AbortController().signal), /thử lại/);
});
test('native image multipart is readable by the installed Expo fetch converter', async () => {
  const converter = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('node_modules/expo/src/winter/fetch/convertFormData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: converter, Blob, TextEncoder, Uint8Array, require: () => ({ blobToArrayBufferAsync: blob => blob.arrayBuffer() }),
  });
  const env = setup('android', {}, async (_, options) => {
    const result = await converter.convertFormDataAsync({ entries: () => options.body.entries }, 'test-boundary');
    const encoded = new TextDecoder().decode(result.body);
    assert.match(encoded, /name="file"/); assert.match(encoded, /image\/png/);
    assert.ok(result.body.includes(7));
    return { url: 'https://api.example.test/photo.png' };
  });
  await env.uploadProfileImage({ uri: 'file:///device/photo.png', mimeType: 'image/png', fileSize: 100 }, new AbortController().signal);
});
