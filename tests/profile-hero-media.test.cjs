const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/profile/profile-media.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject, require: asset => asset });
const { profileHeroCover, profileMobileDecoration, profileMedia } = exportsObject;

test('missing covers keep the template artwork for both colors and screen sizes', () => {
  for (const theme of ['blue', 'amber']) for (const compact of [false, true]) {
    const sampleCover = 'https://example.com/uninet-samples/developer-cover.svg';
    assert.equal(profileHeroCover(null, theme, compact), profileHeroCover(sampleCover, theme, compact));
    assert.equal(profileMobileDecoration(null, theme), profileMobileDecoration(sampleCover, theme));
  }
});

test('personal covers take precedence and missing portraits remain empty', () => {
  const custom = 'https://user.invalid/cover.png';
  assert.equal(profileHeroCover(custom, 'amber', true).uri, custom);
  assert.equal(profileMobileDecoration(custom, 'amber'), undefined);
  assert.equal(profileMedia(null), undefined);
});
