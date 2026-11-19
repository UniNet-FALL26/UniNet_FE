const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(result) {
  const calls = [], exports = {};
  const asset = { uri: 'blob:local-image', name: 'project.png', mimeType: 'image/png', size: 100 };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-hub-files.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name === 'expo-document-picker'
      ? { getDocumentAsync: async () => result ?? { canceled: false, assets: [asset] } }
      : { uploadReportFile: async file => { calls.push(file); return { imageUrl: 'https://res.cloudinary.com/test/image/upload/project.png' }; } },
  });
  return { api: exports, calls, asset };
}
test('selecting a local image does not upload it', async () => {
  const { api, calls, asset } = setup();
  assert.equal(await api.selectProjectImage(), asset);
  assert.equal(calls.length, 0);
});
test('canceling the picker does not upload or return an image', async () => {
  const { api, calls } = setup({ canceled: true, assets: null });
  assert.equal(await api.selectProjectImage(), null);
  assert.equal(calls.length, 0);
});
test('reselecting only replaces the local choice until upload is explicitly requested', async () => {
  const { api, calls, asset } = setup();
  await api.selectProjectImage();
  const next = await api.selectProjectImage();
  assert.equal(calls.length, 0);
  assert.equal(await api.uploadProjectImage(next), 'https://res.cloudinary.com/test/image/upload/project.png');
  assert.deepEqual(calls, [asset]);
});
test('invalid MIME type, unknown size, empty and oversized images never upload', async () => {
  for (const invalid of [{ mimeType: 'image/svg+xml', size: 100 }, { mimeType: 'image/png' }, { mimeType: 'image/png', size: 0 }, { mimeType: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }]) {
    const { api, calls } = setup({ canceled: false, assets: [{ uri: 'blob:invalid', name: 'invalid', ...invalid }] });
    await assert.rejects(api.selectProjectImage());
    assert.equal(calls.length, 0);
  }
});
test('upload validates the image again before sending data', async () => {
  const { api, calls, asset } = setup();
  await assert.rejects(api.uploadProjectImage({ ...asset, mimeType: 'text/plain' }));
  assert.equal(calls.length, 0);
});
test('existing document uploads retain their file contract', async () => {
  const { api, calls } = setup({ canceled: false, assets: [{ uri: 'blob:document', name: 'readme.pdf', mimeType: 'application/pdf', size: 100 }] });
  const file = await api.pickProjectAsset('document');
  assert.equal(file.type, 'document');
  assert.equal(file.name, 'readme.pdf');
  assert.equal(calls.length, 1);
});
