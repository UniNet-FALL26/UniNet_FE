const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const out = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/assessor/AssessmentForm.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: out, require: () => ({}) });
const rubric = { code: 'test', version: '1', passingScore: 65, criteria: [{ code: 'quality', name: 'Chất lượng', weight: 100 }], conditions: [{ code: 'core', description: 'Chức năng cốt lõi' }] };
function valid() { const v = out.emptyAssessment(rubric); v.scores[0].reason = 'Đã kiểm tra'; v.conditions[0].reason = 'Đã xác minh'; return v; }
test('null scores and conditions remain unknown and accept reasons', () => { const v = valid(); assert.equal(v.scores[0].score, null); assert.equal(v.conditions[0].passed, null); assert.equal(out.assessmentError(rubric, v), ''); });
test('scored criteria require evidence and reject invalid precision/range', () => { const v = valid(); v.scores[0].score = 80; assert.ok(out.assessmentError(rubric, v)); v.scores[0].evidence = 'Demo'; assert.equal(out.assessmentError(rubric, v), ''); for (const score of [-1, 101, 1.234, NaN]) { v.scores[0].score = score; assert.ok(out.assessmentError(rubric, v)); } });
test('rubric version, complete unique codes and reasons are mandatory', () => { const v = valid(); v.rubricVersion = '2'; assert.ok(out.assessmentError(rubric, v)); v.rubricVersion = '1'; v.scores[0].code = 'unknown'; assert.ok(out.assessmentError(rubric, v)); v.scores[0].code = 'quality'; v.conditions[0].reason = ' '; assert.ok(out.assessmentError(rubric, v)); });

test('0–10 choices convert to API scale and reject invalid choices', () => {
  for (let point = 0; point <= 10; point++) assert.equal(out.scoreFromTen(point), point * 10);
  for (const point of [-1, 11, 1.5, NaN]) assert.throws(() => out.scoreFromTen(point));
});
test('weighted preview matches backend and handles unknowns and failed conditions', () => {
  const r = { ...rubric, criteria: [{ code: 'requirements', name: 'Yêu cầu', weight: 10 }, { code: 'other', name: 'Khác', weight: 90 }] };
  const v = out.emptyAssessment(r); v.scores[0].score = out.scoreFromTen(8); v.scores[1].score = out.scoreFromTen(7); v.conditions[0].passed = true;
  assert.equal(v.scores[0].score * r.criteria[0].weight / 100, 8);
  assert.equal(out.assessmentPreview(r, v).total, 71); assert.equal(out.assessmentPreview(r, v).outcome, 1);
  v.conditions[0].passed = false; assert.equal(out.assessmentPreview(r, v).outcome, 2);
  v.conditions[0].passed = null; assert.equal(out.assessmentPreview(r, v).total, null); assert.equal(out.assessmentPreview(r, v).outcome, 4);
  v.conditions[0].passed = true; v.scores[0].score = null; assert.equal(out.assessmentPreview(r, v).outcome, 4);
});
test('zero is scored and threshold calculations retain legacy decimals', () => {
  const v = valid(); v.conditions[0].passed = true;
  v.scores[0].score = 0; assert.equal(out.assessmentPreview(rubric, v).total, 0); assert.equal(out.assessmentPreview(rubric, v).outcome, 2);
  v.scores[0].score = 65; assert.equal(out.assessmentPreview(rubric, v).outcome, 1);
  v.scores[0].score = 64.99; assert.equal(out.assessmentPreview(rubric, v).total, 64.99); assert.equal(out.assessmentPreview(rubric, v).outcome, 2);
});
