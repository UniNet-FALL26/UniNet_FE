const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/(tabs)/opportunities.tsx', 'utf8');
const sf = ts.createSourceFile('opportunities.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let filter;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'filteredJobs') filter = node.initializer.arguments[0].getText(sf); ts.forEachChild(node, visit); }
visit(sf);
const run = (jobs, recommendedOnly = false, min = '', max = '', type) => new Function('jobs', 'recommendedOnly', 'salaryMinInput', 'salaryMaxInput', 'employmentType', 'fitScore', `return (${filter})();`)(jobs, recommendedOnly, min, max, type, job => job.score);
const jobs = [{ id: 'a', score: 1, employmentType: 0, minSalaryVnd: 5000000, maxSalaryVnd: 10000000 }, { id: 'b', score: 5, employmentType: 1, minSalaryVnd: 20000000, maxSalaryVnd: 30000000 }, { id: 'c', score: 3, employmentType: 0, minSalaryVnd: 8000000, maxSalaryVnd: 12000000 }];
test('normal browsing keeps API order and recommendation ranking remains available', () => {
  assert.deepEqual(run(jobs).map(j => j.id), ['a', 'b', 'c']);
  assert.deepEqual(run(jobs, true).map(j => j.id), ['b', 'c', 'a']);
  assert.deepEqual(jobs.map(j => j.id), ['a', 'b', 'c']);
});
test('salary and employment filters still work after removing the sorting controls', () => {
  assert.deepEqual(run(jobs, false, '11', '', 0).map(j => j.id), ['c']);
  assert.deepEqual(run(jobs, true, '', '15').map(j => j.id), ['c', 'a']);
});
