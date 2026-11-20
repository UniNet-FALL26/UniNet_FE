const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function load(file, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => imports[name] || new Proxy({}, { get: (_, key) => key === 'ui' ? {} : key }), module, module.exports);
  return module.exports;
}
function texts(node) {
  if (typeof node === 'string') return [node];
  return React.isValidElement(node) ? React.Children.toArray(node.props.children).flatMap(texts) : [];
}
const formatterFile = 'src/utils/profile-milestone.ts';
const imports = {
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { StyleSheet: { create: value => value }, View: 'View', Text: 'Text' },
  '@/components/profile/ProfileEditContext': { useProfileEditing: () => false, EditEducationEntry: 'EditEducationEntry' },
  './landscape-data': load('src/components/profile/templates/developer-landscape/landscape-data.ts'),
  '@/utils/profile-milestone': fs.existsSync(formatterFile) ? load(formatterFile) : {},
};
const templates = [
  ['developer-modern/PortfolioSections.tsx', 'JourneySection'],
  ['developer-showcase/ShowcaseSections.tsx', 'ShowcaseJourney'],
  ['developer-landscape/LandscapeSections.tsx', 'LandscapeJourney'],
];
const cases = [
  [{ startDate: '2022-09-05', endDate: '30/06/2026', period: 'Old period' }, '05/09/2022 – 30/06/2026'],
  [{ startDate: '05/09/2022' }, '05/09/2022 – Hiện tại'],
  [{ endDate: '2026-06-30' }, '30/06/2026'],
  [{ period: '2020 – 2024' }, '2020 – 2024'],
];
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
for (const [file, name] of templates) test(`${name}: sorted dates retain the correct education edit target`, () => {
  const Section = load('src/components/profile/templates/' + file, imports)[name];
  const portfolio = { education: [{ title: 'Later', startDate: '2024-01-01' }, { title: 'Earlier', startDate: '2020-01-01' }], experience: [{ title: 'Experience', startDate: '2022-01-01' }] };
  const tree = Section({ portfolio, theme: {}, compact: true, width: 390 });
  assert.deepEqual(nodes(tree).filter(n => n.type === 'EditEducationEntry').map(n => n.props.index), [1, -1, 0]);
});
for (const [file, name] of templates) test(`${name}: displays complete dates for education and experience`, () => {
  const Section = load('src/components/profile/templates/' + file, imports)[name];
  for (const section of ['education', 'experience']) for (const [dates, expected] of cases) {
    const portfolio = { education: [], experience: [], [section]: [{ title: 'Milestone', ...dates }] };
    const tree = Section({ portfolio, theme: {}, compact: true, width: 390 });
    assert.ok(texts(tree).includes(expected), `${section}: missing ${expected}`);
    assert.ok(!texts(tree).includes('Old period'), 'explicit dates must be visible when period text exists');
  }
});
