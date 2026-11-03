const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const out = {}, links = [];
const element = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/assessor/AssignmentDetailContent.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: out, URL, require: name => ({
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: v => v }, useWindowDimensions: () => ({ width: 390 }), Linking: { openURL: async url => links.push(url) } },
    './assessor-ui': { assessorDate: v => v, AssignmentStatus: () => null },
    '@/constants/colors': { colors: {} },
  }[name] || {}),
});
const base = () => ({ project: { id: 'project-id', title: 'Project', projectField: ' ', description: ' ' }, assignment: { id: 'assignment-id', status: 3 }, report: null, evidenceModeration: null });
const text = node => Array.isArray(node) ? node.map(text).join(' ') : node && typeof node === 'object' ? text(node.props?.children) : node == null || node === false ? '' : String(node);
test('absent data hides result, evidence, history, schedule and project description sections', () => {
  const data = base();
  assert.equal(out.detailTabs(data, false, false).map(t => t.key).join(','), 'info');
  const rendered = text(out.ProjectInformation({ data, onLinkError: () => {} }));
  for (const label of ['Giới thiệu dự án', 'Tài liệu đính kèm', 'Lĩnh vực', 'Hạn báo cáo', 'Ngày phân công']) assert.equal(rendered.includes(label), false);
  assert.equal(out.AssessmentResults({ data }), null);
  assert.equal(out.AssignmentHistory({ data }), null);
});
test('zero scores and failed conditions remain visible; blank report fields stay hidden', () => {
  const data = base(); data.report = { summary: ' ', recommendations: null, findings: '', assessment: { totalScore: 0, outcome: 2, rubric: { criteria: [{ code: 'quality', name: 'Chất lượng', weight: 100 }], conditions: [{ code: 'demo', description: 'Có demo' }] }, scores: [{ code: 'quality', score: 0, reason: '', evidence: null }], conditions: [{ code: 'demo', passed: false, reason: '' }] } };
  const rendered = text(out.AssessmentResults({ data }));
  for (const label of ['Tổng điểm', '0/10', 'Không đạt', 'Có demo']) assert.ok(rendered.includes(label), label);
  assert.equal(rendered.includes('Kết luận & Khuyến nghị'), false);
});
test('evidence-only records enable evidence tab and duplicate attachments appear once', () => {
  const data = base(), file = { taskEvidenceId: 'file', fileUrl: 'https://example.com/file.pdf', fileName: 'Demo.pdf' };
  data.evidenceModeration = { source: { tasks: [{ reports: [{ content: '', evidence: [file, file] }] }] } };
  assert.ok(out.detailTabs(data, false, false).some(tab => tab.key === 'evidence'));
  const rendered = text(out.ProjectInformation({ data, onLinkError: () => {} }));
  assert.ok(rendered.includes('Tài liệu đính kèm (1)'));
  assert.equal(rendered.split('Demo.pdf').length - 1, 1);
});
test('document links reject executable schemes and credentials and open valid files', async () => {
  const errors = [];
  for (const url of ['javascript:alert(1)', 'file:///private', 'https://user:pass@example.com/file']) await out.openEvidence(url, e => errors.push(e));
  assert.equal(errors.length, 3); assert.equal(links.length, 0);
  await out.openEvidence('https://example.com/file.pdf', e => errors.push(e));
  assert.equal(links[0], 'https://example.com/file.pdf');
});
