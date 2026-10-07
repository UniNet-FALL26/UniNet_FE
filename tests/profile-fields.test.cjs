const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/profile-fields.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, URL });
const { profileFieldValue, updateProfileField, updateProfileImage, portfolioMetrics } = exportsObject;
const fixture = () => JSON.parse(fs.readFileSync('src/data/profile-sample.json', 'utf8'));
test('presentation edits are immutable and preserve private/content/appearance data', () => {
  const data = fixture(); const before = JSON.stringify(data);
  const next = updateProfileField(data, 'fullName', '  Nguyễn An ');
  assert.equal(next.profile.fullName, 'Nguyễn An'); assert.equal(next.portfolio, data.portfolio); assert.equal(JSON.stringify(data), before);
  const photo = updateProfileField(next, 'avatarUrl', 'https://images.example.org/avatar.png');
  assert.equal(photo.profile.avatarUrl, 'https://images.example.org/avatar.png');
  assert.equal(updateProfileField(photo, 'avatarUrl', '').profile.avatarUrl, null);
});
test('invalid required names, unsafe photos, emails and manual experience are rejected', () => {
  const data = fixture();
  for (const [field, value] of [['fullName', ''], ['nickname', ''], ['avatarUrl', 'javascript:alert(1)'], ['coverUrl', 'https://user:pass@example.org/a.png'], ['contactEmail', 'invalid'], ['yearsOfExperience', '-1'], ['yearsOfExperience', '81'], ['yearsOfExperience', 'NaN'], ['gpa', 'a'.repeat(21)]]) assert.throws(() => updateProfileField(data, field, value));
});
test('manual metrics are independent of catalog skills and derived counts update on data changes', () => {
  let data = fixture(); data.portfolio.skills = []; data.portfolio.projects = [];
  data = updateProfileField(data, 'yearsOfExperience', '5.5'); data = updateProfileField(data, 'gpa', '8.5/10');
  let metrics = portfolioMetrics(data.portfolio);
  assert.equal(metrics.years, 5.5); assert.equal(metrics.gpa, '8.5/10'); assert.equal(metrics.projects, 0); assert.equal(metrics.technologies, 0);
  data.portfolio.projects.push({ title: 'New', featured: false, technologies: [] });
  data.portfolio.skills.push({ skillId: '1', name: 'React', category: 'Frontend', yearsOfExperience: 1 });
  metrics = portfolioMetrics(data.portfolio);
  assert.equal(metrics.projects, 1); assert.equal(metrics.technologies, 1); assert.equal(metrics.years, 5.5); assert.equal(metrics.gpa, '8.5/10');
});
test('derived technology count deduplicates canonical skills; legacy years/GPA remain usable', () => {
  const portfolio = fixture().portfolio;
  delete portfolio.yearsOfExperience; delete portfolio.gpa;
  portfolio.skills = [{ skillId: '1', name: 'React', yearsOfExperience: 2 }, { skillId: '1', name: 'React' }];
  portfolio.education = [{ title: 'School', gpa: '7.1/10' }];
  assert.equal(portfolioMetrics(portfolio).technologies, 1); assert.equal(portfolioMetrics(portfolio).years, 2); assert.equal(portfolioMetrics(portfolio).gpa, '7.1/10');
  const data = fixture(); data.portfolio = portfolio;
  assert.equal(profileFieldValue(data, 'yearsOfExperience'), '2'); assert.equal(profileFieldValue(data, 'gpa'), '7.1/10');
});
test('editor API whitelists presentation fields and saves them with content', async () => {
  const exports = {}; let captured;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/portfolio.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({ apiRequest: async (url, options) => { captured = { url, options }; return fixture(); } }) });
  const data = fixture(); data.profile.studentCode = 'private'; data.profile.isVerified = true;
  await exports.portfolioService.saveEditor(data);
  const body = JSON.parse(captured.options.body);
  assert.equal(captured.url, '/profile/portfolio/editor/me'); assert.equal(captured.options.method, 'PUT');
  assert.equal(body.profile.studentCode, undefined); assert.equal(body.profile.isVerified, undefined); assert.equal(body.profile.id, undefined);
  assert.equal(body.profile.fullName, data.profile.fullName); assert.deepEqual(body.portfolio, data.portfolio);
});
test('entry photo updates target the correct JSON item and leave identity/other items unchanged', () => {
  const data = fixture(); const before = JSON.stringify(data);
  const next = updateProfileImage(data, { section: 'projects', index: 1 }, 'https://images.example.org/project.png');
  assert.equal(next.portfolio.projects[1].coverUrl, 'https://images.example.org/project.png');
  assert.equal(next.portfolio.projects[0], data.portfolio.projects[0]); assert.equal(next.profile, data.profile); assert.equal(JSON.stringify(data), before);
  assert.throws(() => updateProfileImage(data, { section: 'projects', index: -1 }, 'https://images.example.org/a.png'));
  assert.throws(() => updateProfileImage(data, { section: 'articles', index: 0 }, 'javascript:alert(1)'));
  const certificate = updateProfileImage(data, { section: 'certificates', index: 0 }, 'https://images.example.org/logo.png');
  assert.equal(certificate.portfolio.certificates[0].logoUrl, 'https://images.example.org/logo.png');
});
