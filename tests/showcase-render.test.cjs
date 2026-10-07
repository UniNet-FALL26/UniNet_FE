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
  const exports = {};
  cache.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react-native') return require('react-native-web');
    if (name === 'expo-image') return { Image: ({ accessibilityLabel, source, contentFit, style }) => React.createElement('img', { alt: accessibilityLabel, 'data-fit': contentFit, 'data-source': JSON.stringify(source) }) };
    if (name === 'expo-symbols') return { SymbolView: () => React.createElement('span') };
    if (/\.(png|svg)$/.test(name)) return name;
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const target = name.startsWith('@/') ? path.resolve(__dirname, '../src', name.slice(2)) : path.resolve(path.dirname(filename), name);
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  } });
  return exports;
}
const { DeveloperShowcaseTemplate } = load(path.join(__dirname, '../src/components/profile/templates/developer-showcase/DeveloperShowcaseTemplate.tsx'));
const { DeveloperShowcaseThemes } = load(path.join(__dirname, '../src/components/profile/templates/developer-showcase/DeveloperShowcaseThemes.ts'));
function render(data, width = 1120) {
  return renderToStaticMarkup(React.createElement(DeveloperShowcaseTemplate, { data, theme: DeveloperShowcaseThemes[0], width, thumbnail: true }));
}
test('hero name wraps naturally and omits skill chips and project action', () => {
  const { ShowcaseHero } = load(path.join(__dirname, '../src/components/profile/templates/developer-showcase/ShowcaseHero.tsx'));
  for (const width of [320, 430, 768, 1120]) {
    const html = renderToStaticMarkup(React.createElement(ShowcaseHero, { data: sample, theme: DeveloperShowcaseThemes[0], width }));
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1];
    assert.equal(heading.replace(/<[^>]*>/g, ''), sample.profile.fullName);
    assert.ok(!html.includes('Xem dự án của tôi'));
    for (const skill of sample.portfolio.skills.slice(0, 5)) assert.ok(!html.includes(`>${skill.name}<`));
  }
});
test('empty optional sections and missing avatar leave no empty headings or broken image', () => {
  const data = structuredClone(sample);
  for (const section of ['projects', 'skills', 'experience', 'education', 'articles', 'certificates']) data.portfolio[section] = [];
  data.profile.avatarUrl = null;
  const html = render(data, 360);
  assert.ok(html.includes('Ảnh đại diện bằng chữ viết tắt Trịnh Trọng Quyền'));
  assert.ok(!html.includes('Dự án của tôi'));
  assert.ok(!html.includes('Góc chia sẻ của mình'));
  assert.ok(!html.includes('Hành trình phát triển'));
  assert.ok(!html.includes('Công nghệ mình sử dụng'));
  assert.ok(!html.includes('Ghi dấu những điều đã học'));
});
test('hidden sections and project action are omitted without modifying profile data', () => {
  const data = structuredClone(sample);
  data.portfolio.appearance.profile.hiddenSections = ['projects', 'articles', 'contact', 'other-projects'];
  const before = JSON.stringify(data);
  const html = render(data);
  assert.ok(!html.includes('Xem dự án của tôi'));
  assert.ok(!html.includes('Dự án của tôi'));
  assert.ok(!html.includes('Góc chia sẻ của mình'));
  assert.ok(!html.includes('showcase-contact'));
  assert.equal(JSON.stringify(data), before);
});
test('ordinary uploaded avatar is framed and cropped while known cutout is contained', () => {
  const data = structuredClone(sample);
  assert.ok(render(data).includes('data-fit="contain"'));
  data.profile.avatarUrl = 'https://user.invalid/avatar.jpg';
  const html = render(data);
  assert.match(html, /alt="Ảnh đại diện Trịnh Trọng Quyền" data-fit="cover"/);
});
test('both theme palettes meet AA text contrast in their intended contexts', () => {
  const luminance = hex => {
    const c = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  for (const theme of DeveloperShowcaseThemes) {
    for (const [foreground, background] of [['text', 'page'], ['muted', 'surface'], ['accentStrong', 'surface'], ['accentStrong', 'accentSoft'], ['heroText', 'heroBackground'], ['heroMuted', 'heroBackground'], ['accent', 'heroPanel'], ['onAccent', 'accent']]) {
      const a = luminance(theme[foreground]), b = luminance(theme[background]);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${theme.id}: ${foreground}/${background}`);
    }
  }
});
