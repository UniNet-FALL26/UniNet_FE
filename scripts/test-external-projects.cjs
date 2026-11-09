const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual TypeScript modules without adding a second app/test runtime.
function load(file, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(name => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
}
const utils = load('src/utils/external-project-draft.ts');
const fileId = '11111111-1111-4111-8111-111111111111';
const skillId = '22222222-2222-4222-8222-222222222222';
const draftId = '33333333-3333-4333-8333-333333333333';
const projectId = '44444444-4444-4444-8444-444444444444';
const files = [{ fileId, fileName: 'report.pdf', url: 'https://example.com/report.pdf', format: 'pdf', resourceType: 'raw', sizeBytes: 1024 }];
const validData = () => ({ title: 'Dự án thử nghiệm', description: 'Mô tả', projectField: 'Công nghệ', startDate: '2024', endDate: '2024-06', repositoryUrl: null, demoUrl: null, submitterRole: 'Developer', submitterContribution: 'Thiết kế API', submitterIsLeader: false, leaderName: 'Nguyễn Văn A', skillIds: [skillId], evidenceFileIds: [fileId], features: ['Quản lý dữ liệu'], members: [{ name: 'Thành viên', role: null }] });
const response = (overrides = {}) => ({ draftId, status: 1, version: 3, createdAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z', expiresAt: '2026-11-11T00:00:00Z', errorCode: null, confirmedProjectId: null, data: validData(), extraction: null, missingFields: [], files, ...overrides });
const validate = (data, complete = true) => utils.validateDraft(data, files, [skillId], complete, new Date('2026-11-04T00:00:00Z'));
class ApiError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }

test('accepts valid complete data and preserves partial date precision', () => {
  const data = validData(); assert.deepEqual(validate(data), {}); assert.equal(data.startDate, '2024'); assert.equal(data.endDate, '2024-06');
});
test('validates real leap dates and overlapping year/month intervals', () => {
  assert.ok(utils.implementationDateBounds('2024-02-29')); assert.equal(utils.implementationDateBounds('2023-02-29'), null);
  assert.equal(utils.implementationDateBounds('0000'), null); assert.equal(utils.implementationDateBounds('2024-13'), null);
  assert.deepEqual(validate({ ...validData(), startDate: '2024-12-31', endDate: '2024' }), {});
  assert.ok(validate({ ...validData(), startDate: '2025', endDate: '2024-12' }).endDate);
  assert.ok(validate({ ...validData(), endDate: '2027' }).endDate);
});
test('incomplete drafts can be saved without silently choosing a leader', () => {
  const data = { ...validData(), title: null, submitterIsLeader: null, skillIds: [], evidenceFileIds: [] };
  assert.deepEqual(validate(data, false), {}); const errors = validate(data); assert.ok(errors.title && errors.submitterIsLeader && errors.skillIds && errors.evidenceFileIds);
  assert.ok(validate({ ...validData(), leaderName: '' }).leaderName);
});
test('rejects custom/obsolete skill IDs and evidence outside the draft', () => {
  assert.ok(validate({ ...validData(), skillIds: ['React'] }).skillIds);
  assert.ok(validate({ ...validData(), skillIds: [fileId] }).skillIds);
  assert.ok(validate({ ...validData(), evidenceFileIds: [skillId] }).evidenceFileIds);
  assert.ok(validate({ ...validData(), evidenceFileIds: [fileId, fileId] }).evidenceFileIds);
});
test('enforces URL safety and collection/text limits even on incomplete saves', () => {
  for (const repositoryUrl of ['javascript:alert(1)', 'https://user:secret@example.com']) assert.ok(validate({ ...validData(), repositoryUrl }, false).repositoryUrl);
  assert.ok(validate({ ...validData(), description: 'x'.repeat(2001) }, false).description);
  assert.ok(validate({ ...validData(), features: Array(41).fill('feature') }, false).features);
  assert.ok(validate({ ...validData(), members: [{ name: '', role: null }] }, false).members);
});
function serviceHarness(base = 'https://example.com/api') {
  const calls = []; let next = response();
  const { externalProjectDraftService: service } = load('src/services/external-project-draft.service.ts', {
    '@/constants/config': { API_URL: base }, '@/utils/external-project-draft': utils,
    '@/services/api': { ApiError, apiRequest: async (url, options) => { calls.push({ url, ...options }); return next; } },
  });
  return { service, calls, reply: value => { next = value; } };
}
test('service uses one API prefix and PATCH sends the full data and current version', async () => {
  for (const base of ['https://example.com/api', 'https://example.com']) {
    const h = serviceHarness(base); await h.service.create([fileId]); assert.equal(h.calls[0].url, base.endsWith('/api') ? '/external-project-drafts' : '/api/external-project-drafts');
    const data = validData(); await h.service.update(draftId, 7, data); assert.equal(h.calls[1].method, 'PATCH'); assert.deepEqual(JSON.parse(h.calls[1].body), { version: 7, data });
  }
});
test('rejects malformed responses before exposing an editable form', async () => {
  const h = serviceHarness();
  for (const malformed of [null, response({ status: 99 }), response({ data: { title: 'missing fields' } }), response({ files: [{ fileId: 'public-id' }] }), response({ status: 3 }), response({ extraction: { information: {}, documents: [], warnings: [] } })]) {
    h.reply(malformed); await assert.rejects(h.service.get(draftId), error => error.status === 502);
  }
});
test('confirm sends sharing rights and validates the confirmed project response', async () => {
  const h = serviceHarness(); h.reply({ draftId, projectId, evidenceModerationId: fileId, version: 5, origin: 1, status: 2 });
  assert.equal((await h.service.confirm(draftId, 4)).projectId, projectId);
  assert.deepEqual(JSON.parse(h.calls[0].body), { version: 4, confirmSharingRights: true });
  h.reply({ projectId: 'invalid' }); await assert.rejects(h.service.confirm(draftId, 4));
});

function hookHarness(initial = response()) {
  const slots = []; let index = 0, focus, previousFocus, cleanup, result;
  let server = initial; const calls = [], timers = new Map(); let timerId = 0, listener;
  const api = {
    get: async () => { calls.push('GET'); return server; },
    update: async (id, version, data) => { calls.push({ method: 'PATCH', version, data }); server = response({ version: version + 1, data }); return server; },
    confirm: async (id, version) => { calls.push({ method: 'CONFIRM', version }); return { projectId }; },
  };
  const react = {
    useRef(value) { const slot = index++; if (!(slot in slots)) slots[slot] = { current: value }; return slots[slot]; },
    useState(value) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof value === 'function' ? value() : value; return [slots[slot], next => { slots[slot] = typeof next === 'function' ? next(slots[slot]) : next; }]; },
    useCallback(fn, deps) { const slot = index++; if (!slots[slot] || deps.some((value, i) => value !== slots[slot].deps[i])) slots[slot] = { fn, deps }; return slots[slot].fn; },
  };
  const appState = { currentState: 'active', addEventListener(event, callback) { listener = callback; return { remove() {} }; } };
  const { useExternalProjectDraft } = load('src/hooks/useExternalProjectDraft.ts', {
    react, 'react-native': { AppState: appState }, 'expo-router': { useFocusEffect: callback => { focus = callback; } },
    '@/services/api': { ApiError }, '@/services/external-project-draft.service': { externalProjectDraftService: api },
    '@/store/external-project-drafts': { externalDraftShortcuts: { remove: async () => {} } }, '@/store/toast.store': { toast: { success() {} } }, '@/utils/storage': { tokenStorage: { getSession: () => ({ account: { id: 'owner' } }) } },
  }, { setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) });
  const render = () => { index = 0; result = useExternalProjectDraft(draftId, 'owner'); if (focus !== previousFocus) { cleanup?.(); previousFocus = focus; cleanup = focus(); } return result; };
  return { api, calls, timers, render, get result() { return result; }, set server(value) { server = value; }, cleanup: () => cleanup?.(), appState, changeApp: value => { appState.currentState = value; listener(value); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('confirmation saves edits first, uses the returned version, and blocks double taps', async () => {
  const h = hookHarness(); h.render(); await settle(); h.render();
  h.result.edit({ ...validData(), title: 'Đã sửa' }); h.render();
  const pending = h.result.confirm(true), duplicate = h.result.confirm(true);
  assert.equal(await duplicate, null); assert.equal(await pending, projectId);
  assert.deepEqual(h.calls.filter(call => typeof call === 'object').map(call => [call.method, call.version]), [['PATCH', 3], ['CONFIRM', 4]]); h.cleanup();
});
test('failed PATCH never confirms and preserves local edits for conflict review', async () => {
  const h = hookHarness(); h.render(); await settle(); h.render(); h.result.edit({ ...validData(), title: 'Nội dung cục bộ' }); h.render();
  h.api.update = async () => { throw new ApiError('Conflict', 409, 'DRAFT_VERSION_CONFLICT'); };
  h.server = response({ version: 8, data: { ...validData(), title: 'Trên hệ thống' } });
  assert.equal(await h.result.confirm(true), null); h.render(); await settle(); h.render();
  assert.equal(h.result.form.title, 'Nội dung cục bộ'); assert.equal(h.result.serverCopy.version, 8); assert.equal(h.result.conflict, true); assert.ok(!h.calls.some(call => call.method === 'CONFIRM')); h.cleanup();
});
test('confirmation without sharing rights does not mutate the server', async () => {
  const h = hookHarness(); h.render(); await settle(); h.render(); assert.equal(await h.result.confirm(false), null); assert.deepEqual(h.calls, ['GET']); h.cleanup();
});
test('lost confirm response reconciles via GET and opens the existing project', async () => {
  const h = hookHarness(); h.render(); await settle(); h.render();
  h.api.confirm = async () => { h.server = response({ status: 3, confirmedProjectId: projectId, version: 4 }); throw new ApiError('Network'); };
  assert.equal(await h.result.confirm(true), projectId); assert.deepEqual(h.calls, ['GET', 'GET']); h.cleanup();
});
test('Processing polls GET only and stops on blur or when Ready', async () => {
  const h = hookHarness(response({ status: 0 })); h.render(); await settle(); h.render(); assert.equal(h.timers.size, 1);
  h.server = response(); const [timerId, tick] = [...h.timers][0]; h.timers.delete(timerId); tick(); await settle(); h.render();
  assert.equal(h.timers.size, 0); assert.deepEqual(h.calls, ['GET', 'GET']); h.cleanup();
  const waiting = hookHarness(response({ status: 0 })); waiting.render(); await settle(); assert.equal(waiting.timers.size, 1); waiting.cleanup(); assert.equal(waiting.timers.size, 0);
});
test('background suspends polling; foreground refreshes the official status', async () => {
  const h = hookHarness(response({ status: 0 })); h.render(); await settle(); h.changeApp('background'); assert.equal(h.timers.size, 0); h.changeApp('active'); await settle(); assert.deepEqual(h.calls, ['GET', 'GET']); h.cleanup();
});

test('draft shortcuts isolate accounts and serialize simultaneous updates', async () => {
  const values = new Map();
  const { externalDraftShortcuts: shortcuts } = load('src/store/external-project-drafts.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-secure-store': { getItemAsync: async key => values.get(key), setItemAsync: async (key, value) => { values.set(key, value); } },
    '@/utils/external-project-draft': utils,
  });
  await Promise.all([shortcuts.add('owner-a', { draftId, createdAt: '2026-11-04' }), shortcuts.add('owner-a', { draftId: fileId, createdAt: '2026-11-04' })]);
  assert.equal((await shortcuts.list('owner-a')).length, 2); assert.deepEqual(await shortcuts.list('owner-b'), []);
  await shortcuts.remove('owner-a', draftId); assert.deepEqual((await shortcuts.list('owner-a')).map(item => item.draftId), [fileId]);
  assert.ok([...values.values()].every(value => !value.includes('description') && !value.includes('extraction')));
});
test('document uploads reuse authenticated multipart on web and native without setting a boundary', async () => {
  const NativeForm = class { constructor() { this.parts = []; } append(...args) { this.parts.push(args); } };
  for (const platform of ['web', 'ios']) {
    const calls = [], browserFile = new Blob(['report'], { type: 'application/pdf' });
    const { uploadReportFile } = load('src/services/report-file.service.ts', {
      '@/constants/config': { API_URL: 'https://example.com/api' }, 'react-native': { Platform: { OS: platform } },
      '@/services/api': { ApiError, apiMultipartRequest: async (url, options) => { calls.push({ url, ...options }); return { fileId, imageUrl: files[0].url, fileName: 'report.pdf', publicId: 'report.pdf', resourceType: 'raw', format: 'pdf' }; } },
      '@/store/toast.store': { toast: { error() {} } },
      '@/utils/storage': { tokenStorage: { getSession: () => ({ generation: 1 }) } },
    }, { FormData: NativeForm });
    assert.equal((await uploadReportFile({ name: 'report.pdf', uri: 'file:///report.pdf', mimeType: 'application/pdf', file: browserFile }, 'legacy-token')).fileId, fileId);
    assert.equal(calls[0].url, '/images'); assert.equal(calls[0].headers, undefined);
    const part = calls[0].body.parts[0]; assert.equal(part[0], 'file');
    if (platform === 'web') assert.equal(part[1], browserFile); else assert.deepEqual(part[1], { uri: 'file:///report.pdf', name: 'report.pdf', type: 'application/pdf' });
  }
});

test('Failed drafts remain manually editable and saving transitions them to Ready', async () => {
  const h = hookHarness(response({ status: 2 })); h.render(); await settle(); h.render();
  h.result.edit({ ...validData(), title: 'Nhập thủ công' }); h.render(); await h.result.save(); h.render();
  assert.equal(h.result.draft.status, 1); assert.equal(h.result.draft.version, 4); assert.equal(h.result.form.title, 'Nhập thủ công'); h.cleanup();
});
test('network errors during polling preserve Processing instead of fabricating Failed', async () => {
  const h = hookHarness(response({ status: 0 })); h.render(); await settle(); h.render();
  h.api.get = async () => { throw new ApiError('Network'); };
  const [id, tick] = [...h.timers][0]; h.timers.delete(id); tick(); await settle(); h.render();
  assert.equal(h.result.draft.status, 0); assert.equal(h.result.error, 'Network'); assert.equal(h.timers.size, 1); h.cleanup();
});
test('expired drafts cannot be saved and provide an expiry state even for HTTP 410', async () => {
  const h = hookHarness(); h.api.get = async () => { throw new ApiError('Expired', 410, 'DRAFT_EXPIRED'); };
  h.render(); await settle(); h.render(); assert.equal(h.result.expired, true); assert.equal(await h.result.save(), null); assert.equal(h.timers.size, 0); h.cleanup();
});
test('verification loads paid dossiers without L1 or contribution requests', async () => {
 let cleanup, calls = [];
 const {useProjectVerification} = load('src/hooks/useProjectVerification.ts', {
  react: {useCallback: fn => fn, useState: value => [value, () => {}]},
  'expo-router': {useFocusEffect: callback => {cleanup = callback();}},
  '@/services/project-verification.service': {projectVerificationService: {list: async (id, pending) => {calls.push(pending); return {verifications: []};}}},
 });
 useProjectVerification(projectId, true); await settle(); assert.deepEqual(calls, [true, false]); cleanup();
});
test('completed project offers paid verification without evidence tabs', () => {
 const React = require('react');
 const {renderToStaticMarkup} = require('react-dom/server');
 const host = ({children}) => React.createElement('div', null, children);
 const {CompletedDetailView} = load('src/components/projects/CompletedDetailView.tsx', {
  'react/jsx-runtime': require('react/jsx-runtime'), react: {useState: initial => [initial, () => {}], useEffect: () => {}},
  'react-native': {Pressable: host, ScrollView: host, Text: host, View: host, StyleSheet: {create: value => value}},
  'react-native-safe-area-context': {SafeAreaView: host}, 'expo-router': {router: {}},
  '@/components/navigation/DetailNavigation': {DetailNavigation: host},
  '@/components/projects/ProjectOverview': {ProjectOverview: host},
  '@/components/ui/Button': {Button: ({title}) => React.createElement('button', null, title)}, '@/constants/colors': {colors: {}},
  '@/hooks/useProjectVerification': {useProjectVerification: () => ({level2: {data: null, loading: false}, refresh() {}})},
  '@/utils/project-verification': {level2Label: () => 'Có thể đăng ký thẩm định'},
 });
 const html = renderToStaticMarkup(React.createElement(CompletedDetailView, {project: {id: projectId, isCreator: true, title: 'Dự án'}, initialTab: 'Minh chứng'}));
 assert.ok(html.includes('Đăng kí thẩm định')); assert.ok(!html.includes('Minh chứng')); assert.ok(!html.includes('cấp 1'));
});

test('completion uses the body-ID status endpoint and propagates failures', async () => {
 for (const failure of [null, 403, 404, 409, 500, 'network']) {
  let calls = 0;
  const {projectService} = load('src/services/project.service.ts', {
   '@/constants/config': {API_URL: 'https://example.test/api'},
   '@/services/api': {apiRequest: async (url, options) => {
    calls++; assert.equal(url, '/projects/status'); assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), {projectId, status: 2});
    if (failure) throw new Error(String(failure));
    return {projectId, status: 2, updatedAt: '2026-11-09T08:00:00Z', completedAt: '2026-11-09T08:00:00Z'};
   }},
  });
  if (failure) await assert.rejects(projectService.completeProject(projectId), new RegExp(String(failure)));
  else assert.equal((await projectService.completeProject(projectId)).status, 2);
  assert.equal(calls, 1);
 }
});
