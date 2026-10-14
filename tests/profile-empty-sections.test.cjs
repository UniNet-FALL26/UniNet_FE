const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sample = require('../src/data/profile-sample.json');
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {}; cache.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react-native') return require('react-native-web');
    if (name === 'expo-image') return { Image: ({ accessibilityLabel }) => React.createElement('img', { alt: accessibilityLabel }) };
    if (name === 'expo-symbols') return { SymbolView: () => React.createElement('span') };
    if (/\.(png|svg)$/.test(name)) return name;
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name);
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  } });
  return exports;
}
const { ProfileTemplateRenderer } = load('src/components/profile/ProfileTemplateRenderer.tsx');
const { ProfileEditContext } = load('src/components/profile/ProfileEditContext.tsx');
const { profileTemplates } = load('src/data/profile-templates.ts');
const titles = {
  'developer-modern': ['Kỹ năng', 'Hành trình phát triển', 'Dự án bản thân', 'Chứng chỉ', 'Blog & Chia sẻ', 'Hoạt động'],
  'developer-showcase': ['Công nghệ mình sử dụng', 'Hành trình phát triển', 'Dự án của tôi', 'Ghi dấu những điều đã học', 'Góc chia sẻ của mình'],
  'developer-landscape': ['Kỹ năng', 'Hành trình phát triển', 'Dự án bản thân', 'Chứng chỉ', 'Blog & Chia sẻ'],
};
function empty() {
  const data = structuredClone(sample);
  for (const key of ['skills', 'projects', 'education', 'experience', 'certificates', 'articles', 'activities', 'languages', 'socialLinks']) data.portfolio[key] = [];
  data.portfolio.yearsOfExperience = null; data.portfolio.gpa = null;
  data.portfolio.appearance.profile.hiddenSections = [];
  return data;
}
function render(data, template, width, editing = false) {
  const view = React.createElement(ProfileTemplateRenderer, { data, templateId: template.id, theme: template.themes[0], width });
  return renderToStaticMarkup(editing ? React.createElement(ProfileEditContext.Provider, {
    value: { data, disabled: false, onField() {}, onPhoto() {}, onAdd() {} },
  }, view) : view);
}
function headings(html) {
  return [...html.matchAll(/<[^>]+role="heading"[^>]*>([\s\S]*?)<\/[^>]+>/g)].map(match => match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&'));
}
for (const template of profileTemplates) {
  test(`${template.id}: empty sections and absent metrics disappear in viewing at all widths`, () => {
    const data = empty(), before = JSON.stringify(data);
    for (const width of [320, 768, 1440]) {
      const html = render(data, template, width);
      for (const title of titles[template.id]) assert.ok(!headings(html).includes(title), `${title}/${width}`);
      for (const metric of ['Năm kinh nghiệm', 'Dự án đã xây dựng', 'Dự án cá nhân & thực tế', 'Công nghệ sử dụng', 'GPA tại trường'])
        assert.ok(!html.includes(metric), `${metric}/${width}`);
      assert.ok(html.includes(data.profile.fullName.split(' ')[0]));
      assert.ok(!html.includes('Thêm học vấn'));
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${template.id}: partial data displays only populated sections`, () => {
    const data = empty(); data.portfolio.education = [sample.portfolio.education[0]];
    const html = render(data, template, 1120), visible = headings(html);
    assert.ok(visible.includes('Hành trình phát triển'));
    for (const title of titles[template.id].filter(title => title !== 'Hành trình phát triển')) assert.ok(!visible.includes(title), title);
    assert.ok(html.includes(data.portfolio.education[0].title));
  });
  test(`${template.id}: editing keeps empty slots and add controls even when sections are hidden`, () => {
    const data = empty(); data.portfolio.appearance.profile.hiddenSections = ['skills', 'journey', 'certificates', 'articles', 'other-projects', 'stats'];
    const html = render(data, template, 320, true), visible = headings(html);
    for (const title of titles[template.id]) assert.ok(visible.includes(title), title);
    for (const label of ['Thêm học vấn', 'Thêm kinh nghiệm', 'Thêm kỹ năng', 'Thêm dự án']) assert.ok(html.includes(label), label);
    assert.ok(html.includes('GPA tại trường'));
  });
}
