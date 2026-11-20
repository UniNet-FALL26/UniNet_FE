const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(name => { if (!(name in imports)) throw Error(name); return imports[name]; }, module, module.exports, ...Object.values(globals));
  return module.exports;
}
// Use the installed Expo encoder, which rejects the old RN {uri,name,type} parts.
const { convertFormDataAsync } = load('node_modules/expo/src/winter/fetch/convertFormData.ts', { '../../utils/blobUtils': { blobToArrayBufferAsync: blob => blob.arrayBuffer() } });
class NativeFormData {
  parts = [];
  append(name, value) { this.parts.push([name, value]); }
  entries() { return this.parts[Symbol.iterator](); }
}
class LocalFile {
  constructor(uri) { this.uri = uri; this.exists = !uri.includes('missing'); this.name = 'photo.png'; this.type = 'image/png'; }
  async bytes() { return new Uint8Array([137, 80, 78, 71]); }
}
for (const os of ['android', 'ios', 'web']) test(`${os}: attachment form contains readable file bytes and message metadata`, async () => {
  let request;
  const { messagingService } = load('src/services/messaging.service.ts', {
    'react-native': { Platform: { OS: os } }, 'expo-file-system': { File: LocalFile },
    '@/constants/config': { API_URL: 'https://example.test/api' }, '@/utils/storage': { tokenStorage: {} },
    './api': { apiRequest: async (url, options) => { request = { url, options }; } },
  }, { FormData: NativeFormData });
  const input = { clientMessageId: 'retry-id', content: '', deviceId: 'device', replyToMessageId: 'parent', files: [{ uri: 'file:///cache/photo.png', name: 'photo.png', mimeType: 'image/png', file: new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }) }] };
  await messagingService.send({ conversationId: 'room' }, input);
  assert.equal(request.url, '/messaging/conversations/room/messages');
  const { body, boundary } = await convertFormDataAsync(request.options.body);
  const encoded = new TextDecoder().decode(body);
  assert.ok(encoded.includes(boundary));
  for (const text of ['retry-id', 'device', 'parent', 'filename="photo.png"', 'image/png', 'PNG']) assert.ok(encoded.includes(text), text);
  assert.equal(request.options.headers, undefined);
});
test('unreadable native files fail locally before any upload', async () => {
  let called = false;
  const { messagingService } = load('src/services/messaging.service.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-file-system': { File: LocalFile },
    '@/constants/config': { API_URL: '' }, '@/utils/storage': { tokenStorage: {} },
    './api': { apiRequest: async () => { called = true; } },
  }, { FormData: NativeFormData });
  await assert.rejects(() => messagingService.send({ profileId: 'peer' }, { clientMessageId: 'id', content: '', deviceId: 'device', files: [{ uri: 'file:///missing.png', name: 'missing.png' }] }));
  assert.equal(called, false);
});
test('text-only direct messages keep the same payload and idempotency key', async () => {
  let request;
  const { messagingService } = load('src/services/messaging.service.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-file-system': { File: class { constructor() { assert.fail('no file to read'); } } },
    '@/constants/config': { API_URL: '' }, '@/utils/storage': { tokenStorage: {} },
    './api': { apiRequest: async (url, options) => { request = { url, options }; } },
  }, { FormData: NativeFormData });
  await messagingService.send({ profileId: 'peer' }, { clientMessageId: 'same-retry-id', content: 'Hello', deviceId: 'device', files: [] });
  assert.equal(request.url, '/messaging/direct/peer/messages');
  assert.deepEqual([...request.options.body.entries()], [['ClientMessageId', 'same-retry-id'], ['Content', 'Hello'], ['DeviceId', 'device']]);
});
