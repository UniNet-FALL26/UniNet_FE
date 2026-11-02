const test = require('node:test');
test('saved skills can be removed while retaining metadata, inactive catalog entries and unrelated profile content', () => {
  const { updateProfileSkills, profileSkillSelection } = editor(); const data = real().portfolio;
  const original = { ...data, skills: [{ skillId: 'a', name: 'React', level: 2, yearsOfExperience: 3 }, { name: 'Legacy', level: 1 }] };
  const catalog = [{ id: 'a', name: 'React', category: 'Frontend', iconUrl: null }, { id: 'b', name: 'Python', category: 'Backend', iconUrl: null }];
  const selection = profileSkillSelection(original, catalog);
  const changed = updateProfileSkills(original, [selection[1].id, 'b'], catalog);
  assert.equal(changed.skills.length, 2); assert.equal(changed.skills[0], original.skills[1]);
  assert.equal(changed.skills[1].name, 'Python'); assert.equal(original.skills.length, 2);
  assert.equal(updateProfileSkills(original, ['a'], catalog).skills[0], original.skills[0]);
  assert.equal(updateProfileSkills(original, [], catalog).skills.length, 0);
  assert.throws(() => updateProfileSkills(original, ['unknown'], catalog));
});
test('multiple catalog skills are added atomically without level/years input', () => {
  const { addProfileSkills } = editor(); const data = real().portfolio;
  const catalog = [{ id: 'a', name: 'React', category: 'Frontend', iconUrl: 'https://example.test/react.png' }, { id: 'b', name: 'Python', category: 'Backend', iconUrl: null }];
  const next = addProfileSkills(data, ['a', 'b', 'a'], catalog);
  assert.equal(next.skills.length, 2); assert.equal(data.skills.length, 0);
  assert.equal(next.skills[0].iconUrl, catalog[0].iconUrl);
  assert.equal(next.skills[0].level, null); assert.equal(next.skills[0].yearsOfExperience, null);
  assert.throws(() => addProfileSkills(data, ['a', 'unknown'], catalog));
  assert.equal(data.skills.length, 0);
  assert.throws(() => addProfileSkills(next, ['a'], catalog));
  assert.throws(() => addProfileSkills(data, [], catalog));
  const nearLimit = { ...data, skills: Array.from({ length: 99 }, (_, index) => ({ skillId: 'existing-' + index, name: 'Existing ' + index })) };
  assert.throws(() => addProfileSkills(nearLimit, ['a', 'b'], catalog));
  assert.equal(nearLimit.skills.length, 99);
});

test('skill options search and sorting preserve the original catalog', () => {
  const { profileSkillOptions } = editor();
  const catalog = [{ id: 'b', name: 'Zustand', category: 'Frontend', iconUrl: null }, { id: 'a', name: 'Python', category: 'Backend', iconUrl: null }];
  assert.deepEqual(Array.from(profileSkillOptions(catalog, '', 'name'), s => s.id), ['a', 'b']);
  assert.deepEqual(Array.from(profileSkillOptions(catalog, '', 'name-desc'), s => s.id), ['b', 'a']);
  assert.deepEqual(Array.from(profileSkillOptions(catalog, 'back', 'category'), s => s.id), ['a']);
  assert.equal(catalog[0].id, 'b');
});
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function editor() {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/profile-editor.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL });
  return exports;
}
function real() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/profile-sample.json'), 'utf8'));
  data.profile.fullName = 'Nguyễn An';
  for (const key of ['skills', 'projects', 'education', 'experience', 'certificates', 'activities', 'languages', 'articles', 'socialLinks']) data.portfolio[key] = [];
  data.portfolio.headline = null;
  return data;
}
test('all persisted JSON content sections have form definitions', () => {
  const { profileEditorSections } = editor();
  assert.deepEqual(Array.from(profileEditorSections, x => x.id), ['basic', 'skills', 'projects', 'education', 'experience', 'certificates', 'activities', 'languages', 'articles', 'socialLinks']);
});
test('adding project appends real content, preserves privacy/appearance/empty sections, never mutates input', () => {
  const { addProfileEntry } = editor();
  const data = real();
  const before = JSON.stringify(data);
  const content = addProfileEntry(data.portfolio, 'projects', { title: '  Ứng dụng của tôi ', technologies: 'React, TypeScript', featured: 'true' }, []);
  assert.equal(content.projects[0].title, 'Ứng dụng của tôi');
  assert.deepEqual(Array.from(content.projects[0].technologies), ['React', 'TypeScript']);
  assert.equal(content.projects[0].featured, true);
  assert.equal(content.isPublic, data.portfolio.isPublic);
  assert.equal(content.appearance, data.portfolio.appearance);
  assert.equal(content.skills.length, 0);
  assert.equal(content.headline, null);
  assert.equal(JSON.stringify(data), before);
});
test('basic form initializes real values and updates only basic fields', () => {
  const { addProfileEntry, profileFormValues } = editor();
  const data = real(); data.portfolio.location = 'Huế';
  const values = profileFormValues(data.portfolio, 'basic');
  assert.equal(values.location, 'Huế'); assert.equal(values.headline, '');
  const next = addProfileEntry(data.portfolio, 'basic', { ...values, headline: 'Lập trình viên' }, []);
  assert.equal(next.headline, 'Lập trình viên'); assert.equal(next.location, 'Huế');
  assert.equal(next.projects, data.portfolio.projects);
});
test('required fields, field lengths, unsafe URLs, email and numeric ranges are rejected', () => {
  const { addProfileEntry } = editor(); const data = real().portfolio;
  for (const values of [{}, { title: 'x'.repeat(256) }, { title: 'A', url: 'javascript:alert(1)' }, { title: 'A', url: 'https://user:pass@example.org' }, { title: 'A', technologies: Array(21).fill('React').join(',') }])
    assert.throws(() => addProfileEntry(data, 'projects', values, []));
  assert.throws(() => addProfileEntry(data, 'basic', { contactEmail: 'bad' }, []));
  assert.throws(() => addProfileEntry(data, 'articles', { title: 'Bài viết' }, []));
  assert.throws(() => addProfileEntry(data, 'certificates', { title: 'Chứng chỉ' }, []));
  const catalog = [{ id: 'skill-1', name: 'React', category: 'Frontend', iconUrl: null }];
  for (const values of [{ skillId: 'unknown' }, { skillId: 'skill-1', level: '4' }, { skillId: 'skill-1', level: '1.5' }, { skillId: 'skill-1', yearsOfExperience: 'NaN' }, { skillId: 'skill-1', yearsOfExperience: '-1' }])
    assert.throws(() => addProfileEntry(data, 'skills', values, catalog));
});
test('skills use catalog identity and reject duplicates; optional sections append without examples', () => {
  const { addProfileEntry } = editor(); const data = real().portfolio;
  const catalog = [{ id: 'skill-1', name: 'React', category: 'Frontend', iconUrl: null }];
  const next = addProfileEntry(data, 'skills', { skillId: 'skill-1', level: '2', yearsOfExperience: '1.5' }, catalog);
  assert.equal(next.skills[0].name, 'React'); assert.equal(next.skills[0].skillId, 'skill-1');
  assert.equal(next.skills[0].level, 2); assert.equal(next.skills[0].yearsOfExperience, 1.5);
  assert.throws(() => addProfileEntry(next, 'skills', { skillId: 'skill-1' }, catalog));
  const languages = addProfileEntry({ ...data, languages: null }, 'languages', { name: 'Tiếng Việt', level: 'Bản ngữ' }, []);
  assert.equal(languages.languages.length, 1);
  assert.equal(languages.languages[0].name, 'Tiếng Việt');
});
test('section item limits are enforced before saving', () => {
  const { addProfileEntry } = editor(); const data = real().portfolio;
  data.projects = Array(50).fill({ title: 'Existing', technologies: [], featured: false });
  assert.throws(() => addProfileEntry(data, 'projects', { title: 'New' }, []));
});
test('remaining forms append correctly to each corresponding content array', () => {
  const { addProfileEntry } = editor();
  const data = real().portfolio;
  for (const [section, values] of Object.entries({
    education: { title: 'Kỹ thuật phần mềm', organization: 'Đại học', gpa: '8.0' },
    experience: { title: 'Lập trình viên', period: '2025–2026' },
    certificates: { title: 'Chứng chỉ của tôi', issuer: 'Đơn vị cấp' },
    activities: { title: 'Câu lạc bộ công nghệ' },
    articles: { title: 'Bài viết của tôi', url: 'https://portfolio.example.org/article' },
    socialLinks: { label: 'Website của tôi', url: 'https://portfolio.example.org' },
  })) {
    const next = addProfileEntry(data, section, values, []);
    assert.equal(next[section].length, 1);
    assert.equal(next[section][0].title ?? next[section][0].label, values.title ?? values.label);
    assert.equal(data[section].length, 0);
    assert.equal(next.isPublic, false);
  }
});
test('service submits only owner content to the existing endpoint and forwards cancellation', async () => {
  const exports = {}; const requests = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/services/portfolio.service.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: () => ({ apiRequest: async (url, options) => { requests.push({ url, options }); return real(); } }),
  });
  const controller = new AbortController(); const data = real();
  await exports.portfolioService.getMine(controller.signal);
  await exports.portfolioService.saveMine(data.portfolio, controller.signal);
  assert.equal(requests[0].url, '/profile/portfolio/me');
  assert.equal(requests[1].options.method, 'PUT');
  assert.equal(requests[1].options.signal, controller.signal);
  assert.deepEqual(JSON.parse(requests[1].options.body), data.portfolio);
  assert.equal(JSON.parse(requests[1].options.body).profile, undefined);
});
