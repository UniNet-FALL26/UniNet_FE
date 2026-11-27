const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('interest picker and sample preview share 48 unique options with matching icons', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/profile-interests.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  const names = Array.from(exports.profileInterestOptions);
  const sample = require('../src/data/profile-sample.json').portfolio.interests;
  assert.equal(names.length, 48);
  assert.equal(new Set(names).size, 48);
  assert.deepEqual(names, sample);
  for (const name of names) {
    const symbol = exports.profileInterestSymbol(name);
    assert.ok(symbol.ios && symbol.android && symbol.web);
  }
});
