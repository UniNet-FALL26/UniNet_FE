const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/partner-introduction-images.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exports_ });
const { resolvePartnerImages } = exports_;
test('existing URLs stay unchanged; selected files upload before their URLs can be persisted', async () => {
  const file = { uri: 'blob:local' }, calls = [], cache = new Map();
  const result = await resolvePartnerImages([{ uri: 'https://existing.test/a.png' }, { uri: file.uri, asset: file }], async asset => { calls.push(asset); return 'https://res.cloudinary.com/test/image/upload/a.png'; }, cache, new AbortController().signal);
  assert.equal(result[0], 'https://existing.test/a.png'); assert.equal(result[1], 'https://res.cloudinary.com/test/image/upload/a.png'); assert.equal(calls.length, 1);
  await resolvePartnerImages([{ uri: file.uri, asset: file }], async () => { throw new Error('should reuse upload'); }, cache, new AbortController().signal);
});
test('partial upload failure preserves successful uploads for retry; failed batch never produces save payload', async () => {
  const a = { uri: 'a' }, b = { uri: 'b' }, images = [{ uri: 'a', asset: a }, { uri: 'b', asset: b }], cache = new Map();
  await assert.rejects(() => resolvePartnerImages(images, async asset => { if (asset === b) throw new Error('upload failed'); return 'cloud:a'; }, cache, new AbortController().signal));
  const calls = [];
  const result = await resolvePartnerImages(images, async asset => { calls.push(asset); return 'cloud:b'; }, cache, new AbortController().signal);
  assert.equal(calls.length, 1); assert.equal(calls[0], b); assert.equal(result.join(','), 'cloud:a,cloud:b');
});
test('aborted confirmation cannot continue uploading or return image URLs', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(() => resolvePartnerImages([{ uri: 'local', asset: {} }], async () => { calls++; return 'url'; }, new Map(), controller.signal));
  assert.equal(calls, 0);
});
