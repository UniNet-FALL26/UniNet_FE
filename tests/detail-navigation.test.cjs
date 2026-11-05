const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/detail-navigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, URLSearchParams });
const { detailNavigation } = exportsObject;
test('main role tabs do not receive secondary navigation', () => {
  for (const path of ['/', '/messages', '/opportunities', '/profile', '/company-community', '/jobs', '/assessor-assessments', '/assessor-profile']) assert.equal(detailNavigation(path), null, path);
});
test('nested project and profile pages retain ordered ancestry', () => {
  assert.equal(detailNavigation('/group/verification-result/project-1').crumbs.map(c => c.label).join(' > '), 'Dự án > Chi tiết dự án > Hồ sơ thẩm định > Kết quả thẩm định');
  assert.equal(detailNavigation('/profile/editor').crumbs.map(c => c.label).join(' > '), 'Cá nhân > Mẫu hồ sơ > Xem trước > Chỉnh sửa hồ sơ');
  assert.equal(detailNavigation('/workspace/project-1').fallback, '/(tabs)/workspace');
});
test('role subpages and standalone pages have safe parent routes', () => {
  assert.equal(detailNavigation('/job-detail').fallback, '/(company)/jobs');
  assert.equal(detailNavigation('/assessor-assessments/assignment-1').fallback, '/(assessor)/assessor-assessments');
  for (const path of ['/settings', '/wallet', '/cv', '/cv/templates', '/cv/manage', '/cv/cv-1', '/post/post-1', '/profile/view/student-1', '/group/create', '/group/import', '/group/external-draft/draft-1', '/group/recommendations', '/group/level1/project-1', '/group/checkout/verification-1', '/payment/result']) assert.ok(detailNavigation(path)?.fallback, path);
});
test('verification record IDs cannot become project links', () => {
  assert.equal(detailNavigation('/group/verification-dossier/verification-1').crumbs[1].href, undefined);
  assert.equal(detailNavigation('/group/verification-dossier/verification-1').fallback, '/(tabs)/groups');
  assert.equal(detailNavigation('/group/verification-dossier/verification-1', 0, { projectId: 'project-1' }).crumbs[1].href, '/group/project-1');
  assert.equal(detailNavigation('/settings', 2).fallback, '/(assessor)/assessor-profile');
});
