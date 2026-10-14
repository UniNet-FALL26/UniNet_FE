const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/student-profile.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { hasStudentPortfolioContent } = exportsObject;
const sample = require('../src/data/profile-sample.json');
const empty = () => ({ ...structuredClone(sample), profile: { ...sample.profile, bio: null }, portfolio: { ...sample.portfolio, headline: null, careerObjective: null, location: null, availability: null, contactEmail: null, cvUrl: null, yearsOfExperience: null, gpa: null, skills: [], projects: [], education: [], experience: [], certificates: [], articles: [], socialLinks: [], activities: [], languages: [] } });

test('identity, photos and default appearance still show the student starter', () => {
  const data = empty(); const before = JSON.stringify(data);
  assert.equal(hasStudentPortfolioContent(data), false);
  assert.equal(JSON.stringify(data), before);
});
test('saved introduction, manual metrics or a portfolio section replace onboarding', () => {
  const bio = empty(); bio.profile.bio = 'My introduction'; assert.equal(hasStudentPortfolioContent(bio), true);
  const metrics = empty(); metrics.portfolio.yearsOfExperience = 0; assert.equal(hasStudentPortfolioContent(metrics), true);
  for (const section of ['skills','projects','education','experience','certificates','articles','socialLinks','activities','languages']) {
    const data = empty(); data.portfolio[section] = [{ title: 'Existing content' }]; assert.equal(hasStudentPortfolioContent(data), true, section);
  }
});
test('whitespace and nullable optional groups do not create a portfolio', () => {
  const data = empty(); data.profile.bio = ' '; data.portfolio.headline = ' '; data.portfolio.activities = null; data.portfolio.languages = null;
  assert.equal(hasStudentPortfolioContent(data), false);
});
