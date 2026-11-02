const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, URL, require: name => imports[name] || {} });
  return exports;
}
function render(start, end, status = 0) {
  const key = 'user:assignment';
  const states = [{ key, data: { meetingStartAt: start, meetingEndAt: end, joinUrl: 'https://meet.example' } }, { key, data: { assignment: { id: 'assignment', status }, project: { title: 'Project', projectField: 'Field' } } }, '', '', false, 0, { key, fields: {} }, false];
  const calls = [];
  const element = (type, props) => ({ type, props });
  const screen = load('src/app/(assessor)/assessor-assessments/[id].tsx', {
    react: { useState: () => [states.shift(), () => {}], useRef: () => ({ current: false }), useCallback: fn => fn, useEffect: () => {} },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'expo-router': { useLocalSearchParams: () => ({ id: 'assignment' }), useFocusEffect: () => {} },
    'react-native': { useWindowDimensions: () => ({ width: 1000 }) },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'user' } }) },
    '@/components/assessor/assessor-ui': { assessorStyles: {}, assessorDate: () => '' },
    '@/services/assessor.service': { assessorService: { meetingAction: async (...args) => { calls.push(args); } } },
    '@/store/assessor-report-drafts': { assessorReportDrafts: { get: () => ({}) } },
  }).default;
  const nodes = [];
  function walk(node) { if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === 'object') { nodes.push(node); walk(node.props?.children); } }
  walk(screen());
  return { nodes, calls };
}
test('end button is visible but disabled before starting', () => {
  const { nodes } = render(null, null);
  assert.equal(nodes.find(n => n.props?.title === 'Kết thúc buổi thẩm định').props.disabled, true);
});
test('meeting API start enables end action even if assignment timestamps are missing', async () => {
  const { nodes, calls } = render('2026-11-02T08:00:00Z', null);
  const button = nodes.find(n => n.props?.title === 'Kết thúc buổi thẩm định');
  assert.equal(button.props.disabled, false);
  button.props.onPress();
  assert.equal(JSON.stringify(calls), JSON.stringify([['assignment', 'end']]));
  assert.equal(nodes.some(n => n.props?.title === 'Bắt đầu buổi thẩm định'), false);
});
test('ended or inactive assignments do not offer end action', () => {
  for (const args of [['start', 'end'], ['start', null, 3]]) assert.equal(render(...args).nodes.some(n => n.props?.title === 'Kết thúc buổi thẩm định'), false);
});
test('end action posts to verificator meeting endpoint without a body', async () => {
  const calls = [];
  const { assessorService } = load('src/services/assessor.service.ts', { '@/services/api': { apiRequest: async (...args) => calls.push(args) } });
  await assessorService.meetingAction('id/encoded', 'end');
  assert.equal(calls[0][0], '/verificator/assignments/id%2Fencoded/meeting/end');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].body, undefined);
});
