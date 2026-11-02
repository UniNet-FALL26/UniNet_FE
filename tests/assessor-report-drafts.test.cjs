const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/store/assessor-report-drafts.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsForTest });
test('report drafts survive page remounts, stay account-scoped and clear on sign-out', () => {
  const store = exportsForTest.assessorReportDrafts;
  store.set('expert-a:assignment', { summary: 'Work in progress', findings: 'Findings', recommendations: '', outcome: 2 });
  assert.equal(store.get('expert-a:assignment').summary, 'Work in progress');
  assert.equal(store.get('expert-b:assignment').summary, '');
  store.remove('expert-a:assignment'); assert.equal(store.get('expert-a:assignment').summary, '');
  store.set('expert-a:assignment', { summary: 'Private draft' }); store.clear(); assert.equal(store.get('expert-a:assignment').summary, '');
});
