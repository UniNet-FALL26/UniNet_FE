const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-updated-at.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const format = exportsObject.formatProjectUpdatedAt;

test('recent update uses Vietnam time including date and minute', () => {
  assert.equal(format('2026-11-17T09:21:15Z'), '16:21 17/11/2026');
  assert.equal(format('2026-11-17T18:30:00Z'), '01:30 18/11/2026');
});
test('missing or invalid updates are not invented', () => {
  for (const value of [null, undefined, '', 'invalid']) assert.equal(format(value), 'Chưa cập nhật');
});
