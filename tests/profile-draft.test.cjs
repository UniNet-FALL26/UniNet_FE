const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve('src', relative);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => /\.svg$/.test(name) ? name : load(name.startsWith('@/') ? name.slice(2) + '.ts' : path.relative(path.resolve('src'), path.resolve(path.dirname(filename), name + '.ts'))),
  });
  return exports;
}
const original = () => ({ profile: { id: 'owner', fullName: 'Owner', nickname: 'Owner', avatarUrl: null, coverUrl: null, bio: null, isVerified: true }, isOwner: true,
  portfolio: { headline: 'Developer', careerObjective: null, location: null, availability: null, contactEmail: null, cvUrl: null, isPublic: false,
    appearance: { profile: { template: 'developer-modern', theme: 'blue', font: 'Inter', sectionOrder: ['skills'], hiddenSections: ['languages'], showPortfolio: false } },
    skills: [], projects: [{ title: 'Keep', technologies: [] }], experience: [], education: [], certificates: [], articles: [], socialLinks: [], activities: [{ title: 'Keep activity' }], languages: [{ name: 'Vietnamese', level: 'Native' }] } });

test('appearance-only changes dirty the full save payload and reverting clears dirty', () => {
  const { createProfileDraft, updateProfileAppearance, isProfileDraftDirty } = load('utils/profile-draft.ts');
  const baseline = original();
  for (const [template, theme] of [['developer-modern', 'amber'], ['developer-showcase', 'mint'], ['developer-landscape', 'pink']]) {
    const draft = createProfileDraft(baseline, template, theme);
    assert.equal(isProfileDraftDirty(draft, baseline), true);
    assert.equal(draft.portfolio.appearance.profile.template, template);
    assert.equal(draft.portfolio.appearance.profile.theme, theme);
    assert.equal(isProfileDraftDirty(updateProfileAppearance(draft, 'developer-modern', 'blue'), baseline), false);
    assert.equal(draft.portfolio.projects[0].title, 'Keep');
    assert.equal(draft.portfolio.languages[0].name, 'Vietnamese');
    assert.equal(draft.portfolio.appearance.profile.showPortfolio, false);
  }
  assert.equal(baseline.portfolio.appearance.profile.theme, 'blue');
});

test('content and identity participate in dirty comparisons; successful reread becomes baseline', () => {
  const { createProfileDraft, isProfileDraftDirty, profileEditorPayload } = load('utils/profile-draft.ts');
  const baseline = original(); const draft = createProfileDraft(baseline, 'developer-showcase', 'orange');
  draft.profile = { ...draft.profile, fullName: 'Changed' };
  draft.portfolio = { ...draft.portfolio, headline: 'Changed' };
  assert.equal(isProfileDraftDirty(draft, baseline), true);
  assert.equal(isProfileDraftDirty(draft, structuredClone(draft)), false);
  const payload = profileEditorPayload(draft);
  assert.equal(payload.profile.isVerified, undefined); assert.equal(payload.profile.id, undefined);
  const same = structuredClone(baseline); same.profile.isVerified = false;
  assert.equal(isProfileDraftDirty(same, baseline), false);
});

test('automatic display requires contents and explicit disable overrides contents', () => {
  const { shouldShowPortfolio } = load('utils/student-profile.ts');
  const data = original(); assert.equal(shouldShowPortfolio(data), false);
  data.portfolio.appearance.profile.showPortfolio = true; assert.equal(shouldShowPortfolio(data), true);
  delete data.portfolio.appearance.profile.showPortfolio; assert.equal(shouldShowPortfolio(data), true);
  data.portfolio.headline = null; data.portfolio.projects = []; data.portfolio.activities = []; data.portfolio.languages = [];
  assert.equal(shouldShowPortfolio(data), false);
  data.portfolio.appearance.profile.showPortfolio = true; assert.equal(shouldShowPortfolio(data), false);
});

test('missing route appearance keeps saved selection; legacy orange maps to amber', () => {
  const { createProfileDraft, isProfileDraftDirty } = load('utils/profile-draft.ts');
  const baseline = original(); baseline.portfolio.appearance.profile.template = 'developer-landscape'; baseline.portfolio.appearance.profile.theme = 'pink';
  assert.equal(isProfileDraftDirty(createProfileDraft(baseline), baseline), false);
  const legacy = original(); legacy.portfolio.appearance.profile.theme = 'orange';
  assert.equal(createProfileDraft(legacy).portfolio.appearance.profile.theme, 'amber');
  assert.equal(isProfileDraftDirty(createProfileDraft(legacy), legacy), false);
});
