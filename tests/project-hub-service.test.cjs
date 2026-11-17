const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function service(base = 'http://localhost:5239/api') {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/services/project-hub.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, URLSearchParams, require: name => {
    if (name === '@/constants/config') return { API_URL: base };
    if (name === '@/services/api') return { apiRequest: async (path, options) => { calls.push({ path, options }); return { id: 'project-1' }; } };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { api: exports.projectHubService, calls };
}
test('project-hub endpoint prefix supports API base URLs with and without /api', async () => {
  for (const base of ['http://localhost:5239', 'http://localhost:5239/api']) {
    const { api, calls } = service(base);
    await api.get('a/b');
    assert.equal(calls[0].path, `${base.endsWith('/api') ? '' : '/api'}/project-hub/a%2Fb`);
  }
});
test('changing the project image patches only its URL', async () => {
  const { api, calls } = service();
  await api.update('project-1', { logoUrl: 'https://res.cloudinary.com/test/image/upload/project.png' });
  assert.equal(calls[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].options.body), { logoUrl: 'https://res.cloudinary.com/test/image/upload/project.png' });
});
test('summary edits patch only title and short description', async () => {
  const { api, calls } = service();
  await api.update('project-1', { title: 'New name', description: 'Short introduction' });
  assert.equal(calls[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].options.body), { title: 'New name', description: 'Short introduction' });
});
test('creation sends technology names and status without project classification', async () => {
  const { api, calls } = service();
  await api.create({ title: 'Dự án', description: 'Mô tả', technologies: ['Unity', 'C#'], status: 1 });
  assert.deepEqual(JSON.parse(calls[0].options.body), { title: 'Dự án', description: 'Mô tả', technologies: ['Unity', 'C#'], status: 1 });
  assert.equal(calls[0].options.method, 'POST');
});
test('search and pagination preserve the abort signal and encode Vietnamese query text', async () => {
  const { api, calls } = service(); const signal = { aborted: false };
  await api.mine(2, 'dự án & game', signal);
  const parsed = new URL(calls[0].path, 'http://localhost');
  assert.equal(parsed.searchParams.get('q'), 'dự án & game');
  assert.equal(parsed.searchParams.get('page'), '2');
  assert.equal(calls[0].options.signal, signal);
});
test('membership decisions and personal reviews use separate endpoints with explicit payloads', async () => {
  const { api, calls } = service();
  await api.decide('request-1', 'accept');
  await api.saveReview('project-1', { lessonsLearned: 'Kiểm thử sớm' });
  assert.equal(calls[0].path, '/project-hub/requests/request-1/decision');
  assert.deepEqual(JSON.parse(calls[0].options.body), { decision: 'accept' });
  assert.equal(calls[1].path, '/project-hub/project-1/review');
  assert.equal(calls[1].options.method, 'PUT');
});
