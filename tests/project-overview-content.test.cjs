const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-overview-content.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });
const details = () => ({ description: 'Original', features: ['Old feature'], results: { problem: 'Old', solution: 'Old', objectives: ['Old'], achievements: ['Preserved achievement'], expectedProduct: 'Preserved product', expectedValue: 'Preserved value', expectedGrowth: 'Preserved growth' }, documents: [{ url: 'https://example.test/a.pdf', name: 'a.pdf', type: 'document' }], media: [], links: [{ label: 'Site', url: 'https://example.test' }], startDate: '2026-11-16', endDate: '2026-12-16', completedAt: null });
test('editing overview preserves files, links, dates and input immutability', () => {
  const source = details(), before = JSON.stringify(source), draft = api.overviewDraft(source);
  Object.assign(draft, { introduction: ' New introduction ', problem: ' A problem ', solution: ' A solution ', objectives: ' First goal \n\n Second goal ', features: ' Feature one\nFeature two ', expectedProduct: ' New product ' });
  const saved = api.buildProjectOverviewDetails(source, draft, false);
  assert.equal(saved.description, 'New introduction');
  assert.equal(saved.results.problem, 'A problem');
  assert.equal(JSON.stringify(saved.results.objectives), JSON.stringify(['First goal', 'Second goal']));
  assert.equal(JSON.stringify(saved.features), JSON.stringify(['Feature one', 'Feature two']));
  assert.equal(saved.documents, source.documents); assert.equal(saved.links, source.links);
  assert.equal(saved.startDate, source.startDate); assert.equal(saved.endDate, source.endDate);
  assert.equal(saved.results.achievements[0], 'Preserved achievement');
  assert.equal(JSON.stringify(source), before);
});
test('completed-project editing preserves expected results while updating actual achievements', () => {
  const source = details(), draft = api.overviewDraft(source);
  draft.achievements = ' Delivered demo\nTested with users ';
  draft.expectedProduct = 'Should not overwrite';
  const saved = api.buildProjectOverviewDetails(source, draft, true);
  assert.equal(saved.results.expectedProduct, 'Preserved product');
  assert.equal(JSON.stringify(saved.results.achievements), JSON.stringify(['Delivered demo', 'Tested with users']));
});
test('optional overview content can be cleared without deleting shared files', () => {
  const source = details(), draft = api.overviewDraft(source);
  for (const key of Object.keys(draft)) draft[key] = ' ';
  const saved = api.buildProjectOverviewDetails(source, draft, false);
  assert.equal(saved.description, null); assert.equal(saved.features.length, 0);
  assert.equal(saved.results.objectives.length, 0); assert.equal(saved.documents.length, 1);
});
test('limits match the API for introduction, result text, list counts and list items', () => {
  for (const [key, value] of [['introduction', 'x'.repeat(20001)], ['problem', 'x'.repeat(4001)], ['expectedValue', 'x'.repeat(4001)], ['objectives', Array(41).fill('Goal').join('\n')], ['features', Array(101).fill('Feature').join('\n')], ['features', 'x'.repeat(1001)]]) {
    const source = details(), draft = api.overviewDraft(source); draft[key] = value;
    assert.throws(() => api.buildProjectOverviewDetails(source, draft, false));
  }
});
