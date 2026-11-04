const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, Date, require: name => dependencies[name] });
  return exports;
}
const types = load('src/types/partner-introduction.ts');
const { introductionDraft, introductionInput } = load('src/utils/partner-introduction.ts', { '@/types/partner-introduction': types });
const profile = () => ({ companyName: 'Partner', description: 'Before', address: 'HCM', industry: 'Software', websites: ['https://partner.test'], avatarUrl: 'avatar', introduction: { imageUrl: 'https://partner.test/intro.png', foundedOn: '2019-03-15', employeeRange: '51–200', branches: ['HCM'], galleryUrls: ['https://partner.test/office.png'] } });
test('about saves a single image URL and preserves latest business, gallery, contacts and identity', () => {
  const latest = profile(), draft = introductionDraft(latest); draft.description = 'Updated'; draft.imageUrl = ' https://partner.test/new.png ';
  latest.introduction.employeeRange = '201–500'; latest.address = 'Ha Noi';
  const result = introductionInput(latest, 'about', draft);
  assert.equal(result.introduction.imageUrl, 'https://partner.test/new.png'); assert.equal(result.description, 'Updated');
  assert.equal(result.introduction.employeeRange, '201–500'); assert.equal(result.address, 'Ha Noi'); assert.equal(result.avatarUrl, 'avatar');
  assert.equal(result.introduction.galleryUrls[0], 'https://partner.test/office.png'); assert.equal(result.websites[0], 'https://partner.test');
});
test('gallery deduplicates URLs and empty inputs clear without changing introduction', () => {
  const latest = profile(), draft = introductionDraft(latest); draft.galleryUrls = ['https://partner.test/a.png', 'https://partner.test/a.png', ''];
  let result = introductionInput(latest, 'gallery', draft); assert.equal(result.introduction.galleryUrls.length, 1); assert.equal(result.introduction.imageUrl, latest.introduction.imageUrl);
  draft.galleryUrls = []; result = introductionInput(latest, 'gallery', draft); assert.equal(result.introduction.galleryUrls.length, 0);
});
test('unsafe image URLs and invalid business inputs are rejected', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,abc', 'https://user:pass@partner.test/a.png', 'not-a-url']) {
    const latest = profile(), draft = introductionDraft(latest); draft.imageUrl = url; assert.throws(() => introductionInput(latest, 'about', draft));
    draft.galleryUrls = [url]; assert.throws(() => introductionInput(latest, 'gallery', draft));
  }
  for (const date of ['2026-02-30', '2999-01-01', '15/03/2019']) { const latest = profile(), draft = introductionDraft(latest); draft.foundedOn = date; assert.throws(() => introductionInput(latest, 'business', draft)); }
  const latest = profile(), draft = introductionDraft(latest); draft.galleryUrls = Array(21).fill('https://partner.test/a.png'); assert.throws(() => introductionInput(latest, 'gallery', draft));
});
