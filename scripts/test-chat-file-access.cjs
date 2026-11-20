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
const file = { id: '12345678-abcd-abcd-abcd-123456789abc', fileUrl: '/messaging/attachments/12345678-abcd-abcd-abcd-123456789abc/content', fileType: 0, fileName: 'photo.png', mimeType: 'image/png' };
function service(responses, options = {}) {
  let session = { generation: 'session', accessToken: 'old' }, refreshed = 0;
  const requests = [];
  const { messagingService } = load('src/services/messaging.service.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-file-system': { File: class {} },
    '@/constants/config': { API_URL: 'https://example.test/api' },
    '@/utils/storage': { tokenStorage: { getSession: () => session } },
    './api': { ApiError: class extends Error { constructor(message, status) { super(message); this.status = status; } }, refreshSession: async () => { refreshed++; session = { ...session, accessToken: 'fresh' }; } },
  }, { fetch: async (url, init) => { requests.push({ url, init }); const response = responses.shift(); if (options.onFetch) session = options.onFetch(session); return response; } });
  return { messagingService, requests, refreshed: () => refreshed };
}
test('protected file reads refresh once after a 401 then use the current token', async () => {
  const blob = new Blob(['image-bytes'], { type: 'image/png' });
  const h = service([{ ok: false, status: 401 }, { ok: true, status: 200, blob: async () => blob }]);
  assert.equal(await h.messagingService.attachmentBlob(file), blob);
  assert.equal(h.refreshed(), 1);
  assert.equal(h.requests[1].init.headers.Authorization, 'Bearer fresh');
});
test('403 does not refresh and rejected paths never send tokens', async () => {
  const h = service([{ ok: false, status: 403 }]);
  await assert.rejects(() => h.messagingService.attachmentBlob(file), error => error.status === 403);
  assert.equal(h.refreshed(), 0);
  await assert.rejects(() => h.messagingService.attachmentBlob({ ...file, fileUrl: 'https://other.test/file' }));
  assert.equal(h.requests.length, 1);
});
test('session changes during a download reject its result', async () => {
  const h = service([{ ok: true, status: 200, blob: async () => new Blob(['private']) }], { onFetch: session => ({ ...session, generation: 'other' }) });
  await assert.rejects(() => h.messagingService.attachmentBlob(file));
});
for (const [type, mime, extension] of [[0, 'image/png', 'png'], [1, 'video/mp4', 'mp4'], [2, 'application/pdf', 'pdf']]) test(`native file type ${type} uses authenticated bytes and a private local file`, async () => {
  let requested = 0, saved;
  class LocalFile { constructor(...parts) { this.uri = parts.join('/'); this.exists = false; saved = this; } write(bytes) { this.bytes = bytes; this.exists = true; } delete() { this.exists = false; } }
  const { loadChatAttachment } = load('src/utils/load-chat-attachment.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-crypto': { randomUUID: () => 'random' },
    'expo-file-system': { File: LocalFile, Paths: { cache: 'file:///private/cache' } },
    '@/services/messaging.service': { messagingService: { attachmentBytes: async () => { requested++; return new TextEncoder().encode('file-content'); } } },
  });
  const resource = await loadChatAttachment({ ...file, fileType: type, mimeType: mime });
  assert.equal(requested, 1);
  assert.ok(resource.uri.startsWith('file:///private/cache/'));
  assert.ok(resource.uri.endsWith('.' + extension));
  assert.equal(new TextDecoder().decode(saved.bytes), 'file-content');
  resource.dispose(); assert.equal(saved.exists, false);
});
test('native byte downloads retry 401 without requiring Blob.arrayBuffer or modern AbortSignal methods', async () => {
  const data = new TextEncoder().encode('video-content');
  const h = service([{ ok: false, status: 401 }, { ok: true, status: 200, arrayBuffer: async () => data.buffer }]);
  const bytes = await h.messagingService.attachmentBytes({ ...file, fileType: 1 }, { aborted: false });
  assert.deepEqual(bytes, data);
  assert.equal(h.refreshed(), 1);
});
test('a concurrent token refresh is reused instead of refreshing the new token again', async () => {
  const h = service([{ ok: false, status: 401 }, { ok: true, status: 200, blob: async () => new Blob(['data']) }], { onFetch: session => ({ ...session, accessToken: 'fresh' }) });
  await h.messagingService.attachmentBlob(file);
  assert.equal(h.refreshed(), 0);
  assert.equal(h.requests[1].init.headers.Authorization, 'Bearer fresh');
});
test('cancelled native reads do not create a cached file', async () => {
  let created = false;
  const signal = { aborted: false };
  const { loadChatAttachment } = load('src/utils/load-chat-attachment.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-crypto': { randomUUID: () => 'random' },
    'expo-file-system': { File: class { constructor() { created = true; } }, Paths: {} },
    '@/services/messaging.service': { messagingService: { attachmentBytes: async () => { signal.aborted = true; return new Uint8Array([1]); } } },
  });
  await assert.rejects(() => loadChatAttachment(file, signal), error => error.name === 'AbortError');
  assert.equal(created, false);
});
test('document downloads share the authenticated local file with the correct MIME type', async () => {
  let shared, disposed = false;
  const { downloadChatAttachment } = load('src/utils/download-chat-attachment.ts', {
    'react-native': { Platform: { OS: 'android' } },
    '@/utils/load-chat-attachment': { loadChatAttachment: async () => ({ uri: 'file:///private/cache/report.pdf', dispose: () => disposed = true }) },
    'expo-sharing': { shareAsync: async (...args) => shared = args },
  });
  await downloadChatAttachment({ ...file, fileType: 2, fileName: 'report.pdf', mimeType: 'application/pdf' });
  assert.deepEqual(shared, ['file:///private/cache/report.pdf', { mimeType: 'application/pdf', dialogTitle: 'report.pdf' }]);
  assert.equal(disposed, false, 'the receiving app must still be able to read the shared file');
});
