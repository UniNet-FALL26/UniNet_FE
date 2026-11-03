const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === '@/constants/roles') return { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2, VERIFIER: 3, MODERATOR: 4, ACCOUNTANT: 5, ADMIN: 6 } };
    throw Error(name);
  } }); return exports;
}
test('Assessor has an independent app home without changing existing user homes', () => {
  const { accountHome } = load('src/utils/role-navigation.ts');
  assert.equal(accountHome(0), '/(tabs)'); assert.equal(accountHome(1), '/(company)');
  assert.equal(accountHome(2), '/(assessor)/assessor-community');
});
test('five Assessor destinations keep their order and detail pages select assessments', () => {
  const { assessorTabs, assessorTabActive } = load('src/constants/assessor-navigation.ts');
  assert.equal(assessorTabs.map(t => t.key).join(','), 'community,messages,assessments,notifications,profile');
  assert.equal(assessorTabActive('assessments', '/assessor-assessments/assigned-work'), true);
  assert.equal(assessorTabActive('assessments', '/assessor-availability'), true);
  assert.equal(assessorTabActive('profile', '/assessor-assessments/assigned-work'), false);
});
