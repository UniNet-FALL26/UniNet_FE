const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.join(__dirname, '../src', relative);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => /\.svg$/.test(name) ? name : load(name.replace('@/', '') + '.ts'),
  });
  return exports;
}
test('landscape registers once with three themes and a safe blue fallback', () => {
  const { profileTemplates, getProfileTheme } = load('data/profile-templates.ts');
  assert.equal(profileTemplates.filter(t => t.id === 'developer-landscape').length, 1);
  assert.deepEqual(Array.from(profileTemplates.find(t => t.id === 'developer-landscape').themes, t => t.id), ['blue', 'pink', 'mint']);
  assert.equal(getProfileTheme('developer-landscape', 'invalid').id, 'blue');
  assert.equal(getProfileTheme('developer-showcase').id, 'mint');
});
test('metrics never invent zero experience, GPA, or learning percentages', () => {
  const { landscapeMetrics } = load('components/profile/templates/developer-landscape/landscape-data.ts');
  const portfolio = { skills: [], projects: [], education: [] };
  assert.equal(landscapeMetrics(portfolio).length, 0);
  portfolio.skills = [{ name: 'React', yearsOfExperience: 2 }, { name: '.NET', yearsOfExperience: null }];
  portfolio.education = [{ gpa: '7.1/10' }];
  assert.deepEqual(Array.from(landscapeMetrics(portfolio), m => m.value), ['2+', '2', '7.1/10']);
  assert.ok(!landscapeMetrics(portfolio).some(m => m.value === '100%'));
});
