const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.join(__dirname, '../src', relative);
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, require: name => /\.svg$/.test(name) ? name : load(name.replace('@/', '') + (name.endsWith('.json') ? '' : '.ts')),
  });
  return exports;
}
test('empty preview uses sample identity and sections without mutating JSON', () => {
  const { resolveProfilePreview } = load('utils/profile-preview.ts');
  const result = resolveProfilePreview(null);
  assert.ok(result.sampleSections.length > 0);
  assert.equal(result.data.profile.fullName, 'Trịnh Trọng Quyền');
  assert.equal(result.data.profile.nickname, 'Quyền Dev');
  assert.ok(result.data.portfolio.projects.length > 0);
  result.data.portfolio.projects[0].title = 'Changed';
  assert.notEqual(resolveProfilePreview(null).data.portfolio.projects[0].title, 'Changed');
});
test('preview always uses bundled sample data even if a caller supplies user data', () => {
  const { resolveProfilePreview } = load('utils/profile-preview.ts');
  const data = load('data/profile-sample.json');
  data.profile.fullName = 'Nguyễn An'; data.profile.nickname = 'An'; data.profile.bio = 'Bio thật';
  data.portfolio.projects = [{ title: 'Real project', technologies: [], featured: false }];
  data.portfolio.skills = []; data.portfolio.contactEmail = null;
  const before = JSON.stringify(data);
  const result = resolveProfilePreview(data);
  assert.equal(result.data.profile.fullName, 'Trịnh Trọng Quyền');
  assert.equal(result.data.profile.nickname, 'Quyền Dev');
  assert.notEqual(result.data.portfolio.projects[0].title, 'Real project');
  assert.ok(result.data.portfolio.skills.length > 0);
  assert.ok(result.sampleSections.includes('skills'));
  assert.ok(result.sampleSections.includes('projects'));
  assert.equal(JSON.stringify(data), before);
});
test('preview remains explicitly sample data for every caller', () => {
  const { resolveProfilePreview } = load('utils/profile-preview.ts');
  assert.ok(resolveProfilePreview(load('data/profile-sample.json')).sampleSections.length > 0);
});
test('theme deep links select requested tokens and reject unknown identifiers', () => {
  const { getProfileTemplate, getProfileTheme } = load('data/profile-templates.ts');
  assert.equal(getProfileTheme('developer-modern', 'amber').id, 'amber');
  assert.equal(getProfileTheme('developer-modern', 'blue').id, 'blue');
  assert.equal(getProfileTheme('unknown', 'unknown').id, 'blue');
  assert.equal(getProfileTemplate('unknown').id, 'developer-modern');
});
test('showcase deep links use one template with mint and orange and preserve modern defaults', () => {
  const { getProfileTemplate, getProfileTheme } = load('data/profile-templates.ts');
  assert.equal(getProfileTemplate('developer-showcase').id, 'developer-showcase');
  assert.equal(getProfileTheme('developer-showcase').id, 'mint');
  assert.equal(getProfileTheme('developer-showcase', 'orange').id, 'orange');
  assert.equal(getProfileTheme('developer-showcase', 'blue').id, 'mint');
  assert.equal(getProfileTheme('developer-modern').id, 'blue');
  assert.equal(getProfileTemplate('developer-showcase').themes.length, 2);
});
