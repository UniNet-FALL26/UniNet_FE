const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-links.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api, URL });

test('link types share canonical labels and resolve unknown legacy names safely', () => {
  assert.equal(JSON.stringify(api.projectLinkTypes.map(item => item.label)), JSON.stringify(['GitHub', 'Website / Demo', 'Figma', 'Google Play', 'App Store', 'API (Swagger)', 'Khác']));
  for (const item of api.projectLinkTypes) {
    assert.equal(api.getProjectLinkType(item.label).id, item.id);
    assert.equal(api.getProjectLinkType(` ${item.label.toUpperCase()} `).label, item.label);
  }
  assert.equal(api.getProjectLinkType('Old custom name').label, 'Khác');
});

test('trims labels and URLs without mutating drafts or rewriting URLs', () => {
  const source = [{ label: ' GitHub ', url: ' https://github.com/example/repo?q=1#readme ' }];
  const before = JSON.stringify(source);
  assert.equal(JSON.stringify(api.normalizeProjectLinks(source)), JSON.stringify([{ label: 'GitHub', url: 'https://github.com/example/repo?q=1#readme' }]));
  assert.equal(JSON.stringify(source), before);
  assert.equal(api.normalizeProjectLinks([]).length, 0);
});

test('rejects incomplete rows, unsafe schemes and embedded credentials', () => {
  for (const url of ['', 'example.com', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'https://', 'https://a.com/\npath']) {
    assert.throws(() => api.normalizeProjectLinks([{ label: 'Demo', url }]));
  }
  assert.throws(() => api.normalizeProjectLinks([{ label: ' ', url: 'https://example.com' }]));
  assert.equal(api.normalizeProjectLinks([{ label: 'Demo', url: 'http://localhost:3000/demo' }]).length, 1);
});

test('matches backend count, label and URL limits', () => {
  const valid = { label: 'x'.repeat(100), url: 'https://example.com' };
  assert.equal(api.normalizeProjectLinks(Array(30).fill(valid)).length, 30);
  assert.throws(() => api.normalizeProjectLinks(Array(31).fill(valid)));
  assert.throws(() => api.normalizeProjectLinks([{ ...valid, label: 'x'.repeat(101) }]));
  assert.throws(() => api.normalizeProjectLinks([{ ...valid, url: 'https://example.com/' + 'x'.repeat(2048) }]));
});
