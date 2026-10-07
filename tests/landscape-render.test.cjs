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
const { DeveloperLandscapeTemplate } = load(path.join(__dirname, '../src/components/profile/templates/developer-landscape/DeveloperLandscapeTemplate.tsx'));
const { developerLandscapeThemes } = load(path.join(__dirname, '../src/components/profile/templates/developer-landscape/DeveloperLandscapeThemes.ts'));
const { LandscapeHero } = load(path.join(__dirname, '../src/components/profile/templates/developer-landscape/LandscapeHero.tsx'));
const { LandscapeProjects } = load(path.join(__dirname, '../src/components/profile/templates/developer-landscape/LandscapeSections.tsx'));
const render = (data = sample, extra = {}) => renderToStaticMarkup(React.createElement(DeveloperLandscapeTemplate, { data, theme: developerLandscapeThemes[0], width: 1120, thumbnail: true, ...extra }));
const renderHero = (data = sample, extra = {}) => renderToStaticMarkup(React.createElement(LandscapeHero, { data, theme: developerLandscapeThemes[0], width: 1120, thumbnail: true, ...extra }));
test('empty and hidden sections are omitted and profile data is never mutated', () => {
  const data = structuredClone(sample);
  for (const key of ['projects', 'skills', 'experience', 'education', 'articles', 'certificates']) data.portfolio[key] = [];
  data.profile.avatarUrl = null;
  const before = JSON.stringify(data);
  const html = render(data);
  assert.ok(html.includes('Ảnh đại diện bằng chữ viết tắt'));
  for (const label of ['landscape-skills', 'landscape-journey', 'landscape-stats', 'landscape-project', 'LATEST ARTICLES', 'CERTIFICATIONS']) assert.ok(!html.includes(label), label);
  assert.equal(JSON.stringify(data), before);
  const hidden = structuredClone(sample);
  hidden.portfolio.appearance.profile.hiddenSections = ['projects', 'skills', 'journey', 'certificates', 'articles', 'stats', 'contact'];
  const hiddenHtml = render(hidden, { showTemplateFooter: false });
  for (const label of ['landscape-skills', 'landscape-journey', 'landscape-stats', 'landscape-project', 'landscape-contact', 'landscape-footer']) assert.ok(!hiddenHtml.includes(label), label);
});
test('portrait supports explicit uploaded cutouts, ordinary photographs and initials', () => {
  const data = structuredClone(sample);
  data.profile.avatarUrl = 'https://user.invalid/avatar.png';
  assert.ok(render(data).includes('alt="Ảnh đại diện Trịnh Trọng Quyền" data-fit="cover"'));
  assert.ok(render(data, { portraitMode: 'cutout' }).includes('alt="Ảnh đại diện Trịnh Trọng Quyền" data-fit="contain"'));
  data.profile.avatarUrl = null;
  assert.ok(render(data).includes('Ảnh đại diện bằng chữ viết tắt'));
});
test('all themes render the same data, preserve brand assets and AA text contrast', () => {
  const luminance = hex => {
    const c = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  };
  for (const theme of developerLandscapeThemes) {
    const html = render(sample, { theme });
    assert.ok(html.includes(sample.profile.fullName.split(' ')[0]));
    assert.ok(html.includes('react.svg'));
    for (const [fg,bg] of [['text','page'],['muted','surface'],['accentStrong','surface'],['accentStrong','accentSoft'],['heroText','heroPanel'],['heroMuted','heroPanel'],['onAccent','accent'],['heroText','skillActive']]) {
      const a=luminance(theme[fg]),b=luminance(theme[bg]);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${theme.id} ${fg}/${bg}`);
    }
  }
});
test('example URLs have no live links and optional article metadata is not invented', () => {
  const html = render();
  assert.ok(!html.includes('role="link"'));
  assert.ok(!html.includes('ph?t ??c'));
  assert.ok(!html.includes('100%'));
});
test('hero omits skill chips, actions and social links at mobile and desktop widths', () => {
  for (const width of [320, 768, 1440]) {
    const html = renderHero(sample, { width, onNavigate: () => {} });
    for (const label of ['Liên hệ qua LinkedIn', 'Xem dự án', 'GitHub', 'LinkedIn', ...sample.portfolio.skills.slice(0, 5).map(skill => skill.name)]) assert.ok(!html.includes(label), `${label}/${width}`);
    assert.ok(html.includes(sample.profile.bio));
  }
});
test('hero places trimmed nickname after name and omits greeting and blank nicknames', () => {
  const data = structuredClone(sample);
  data.profile.nickname = '  Quyền Dev  ';
  const html = renderHero(data);
  assert.ok(html.includes('>Quyền Dev</div>'));
  assert.ok(!html.includes('Xin chào'));
  assert.ok(!html.includes('👋'));
  assert.ok(html.indexOf('data-testid="landscape-nickname"') > html.indexOf('aria-level="1"'));
  assert.ok(html.indexOf('data-testid="landscape-nickname"') < html.indexOf(data.portfolio.headline));
  for (const nickname of [null, undefined, '', '   ']) {
    data.profile.nickname = nickname;
    const emptyHtml = renderHero(data);
    assert.ok(!emptyHtml.includes('landscape-nickname'));
    assert.ok(!emptyHtml.includes('Xin chào'));
  }
});
test('landscape omits featured projects while keeping other projects', () => {
  const html = render();
  assert.ok(!html.includes('Dự án nổi bật'));
  assert.ok(!html.includes('FEATURED WORK'));
  assert.ok(html.includes('Dự án bản thân'));
  assert.ok(!html.includes('Dự án khác'));
  for (const project of sample.portfolio.projects) assert.equal(html.includes(project.title), !project.featured, project.title);
});
test('project cards show individual technology badges and omit empty technology rows', () => {
  const project = { ...sample.portfolio.projects[0], type: 'TYPE_TAG_ONLY', technologies: ['React', 'TypeScript'] };
  const renderProjects = project => renderToStaticMarkup(React.createElement(LandscapeProjects, { projects: [project], title: 'Dự án bản thân', theme: developerLandscapeThemes[0], width: 1120, thumbnail: true }));
  const html = renderProjects(project);
  assert.ok(html.includes(project.title));
  assert.ok(html.includes(project.description));
  assert.ok(html.includes(`Ảnh dự án ${project.title}`));
  assert.ok(!html.includes('TYPE_TAG_ONLY'));
  assert.ok(!html.includes('Công nghệ sử dụng:'));
  for (const technology of project.technologies) assert.ok(html.includes(`>${technology}</div>`));
  assert.ok(html.includes('aria-label="Công nghệ sử dụng"'));
  assert.ok(!renderProjects({ ...project, technologies: [] }).includes('aria-label="Công nghệ sử dụng"'));
});
test('contact uses real email or social links and omits absent contact actions', () => {
  const data = structuredClone(sample);
  assert.ok(render(data).includes('Liên hệ qua LinkedIn'));
  data.portfolio.contactEmail = 'person@company.invalid';
  assert.ok(render(data).includes('Liên hệ ngay'));
  data.portfolio.contactEmail = 'person@example.com';
  data.portfolio.socialLinks = [{ label: 'Unsafe', url: 'javascript:alert(1)' }];
  assert.ok(!render(data).includes('Liên hệ ngay'));
  assert.ok(!render(data).includes('Liên hệ qua Unsafe'));
});
