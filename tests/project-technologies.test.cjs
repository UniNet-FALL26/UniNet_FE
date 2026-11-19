const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-technologies.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });
test('normalization deduplicates case/spacing while keeping order and tech punctuation', () => {
  const source = [' React ', 'react', ' ASP.NET   Core ', 'asp.net core', 'C#', 'C++', '.NET'];
  const before = JSON.stringify(source);
  assert.equal(JSON.stringify(api.normalizeProjectTechnologies(source)), JSON.stringify(['React', 'ASP.NET Core', 'C#', 'C++', '.NET']));
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(api.technologyKey('C#'), api.technologyKey('C++'));
});
test('catalog lookup preserves symbols and matches normalized names', () => {
  const catalog = [{ name: 'C#', iconUrl: 'csharp.svg' }, { name: 'C++', iconUrl: 'cpp.svg' }, { name: 'ASP.NET Core', iconUrl: 'asp.svg' }];
  assert.equal(api.findTechnology(catalog, ' asp.net   core ').iconUrl, 'asp.svg');
  assert.equal(api.findTechnology(catalog, 'C++').iconUrl, 'cpp.svg');
  assert.equal(api.findTechnology(catalog, 'Unknown tool'), undefined);
});
test('empty selection is valid and limits apply after deduplication', () => {
  assert.equal(api.normalizeProjectTechnologies([' ', '']).length, 0);
  assert.equal(api.normalizeProjectTechnologies(Array(30).fill('React')).length, 1);
  assert.throws(() => api.normalizeProjectTechnologies(Array.from({ length: 21 }, (_, i) => `Tool ${i}`)));
  assert.throws(() => api.normalizeProjectTechnologies(['x'.repeat(81)]));
});
