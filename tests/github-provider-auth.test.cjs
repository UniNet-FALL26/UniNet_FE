const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function setup(fetcher) {
  let session = { accessToken: 'uninet-fixture', refreshToken: 'refresh-fixture', generation: 1, account: { id: 'user' } }, cleared = 0;
  const calls = [], exports = {};
  const storage = { getSession: () => session, clear: async () => { cleared++; session = null; }, replaceSession: async (_, value) => { session = { ...session, ...value }; return true; } };
  const imports = {
    '@/constants/config': { API_URL: 'http://localhost:5239/api' }, '@/services/project-errors': { localizeProjectError: () => null },
    '@/store/toast.store': { toast: { success() {}, error() {} } }, '@/utils/storage': { tokenStorage: storage },
    '@/utils/api-feedback': { apiErrorMessage: () => 'Request rejected', apiFeedbackPolicy: () => ({}), apiSuccessMessage: () => '', readableApiMessage: value => value },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Headers, Response, FormData, fetch: async (url, options) => { calls.push(url); return fetcher(url, options, calls); }, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; },
  });
  return { api: exports, calls, get cleared() { return cleared; } };
}
for (const method of ['apiRequest', 'apiMultipartRequest']) {
  test(`${method}: GitHub authorization 401 must not refresh/logout the UniNet session`, async () => {
    const env = setup(async url => new Response(JSON.stringify({ code: url.includes('/auth/refresh') ? 'UNEXPECTED_REFRESH' : 'GITHUB_APP_REAUTHORIZATION_REQUIRED' }), { status: url.includes('/auth/refresh') ? 500 : 401 }));
    await assert.rejects(env.api[method]('/projects/p/git/app/installations', { feedback: false }), error => error.status === 401 && error.code === 'GITHUB_APP_REAUTHORIZATION_REQUIRED');
    assert.equal(env.calls.length, 1); assert.equal(env.cleared, 0);
  });
}
test('a real UniNet 401 still refreshes once and returns the retried response', async () => {
  const env = setup(async (url, _, calls) => url.includes('/auth/refresh')
    ? new Response(JSON.stringify({ accessToken: 'rotated-fixture', refreshToken: 'rotated-refresh', account: { id: 'user' } }))
    : calls.length === 1 ? new Response(null, { status: 401 }) : new Response(JSON.stringify({ items: [] })));
  const result = await env.api.apiRequest('/projects/p/git/app/installations', { feedback: false });
  assert.equal(result.items.length, 0); assert.equal(env.calls.length, 3); assert.equal(env.cleared, 0);
});
test('GitHub 401 after a successful UniNet refresh preserves the rotated local session', async () => {
  const env = setup(async (url, _, calls) => url.includes('/auth/refresh')
    ? new Response(JSON.stringify({ accessToken: 'rotated-fixture', refreshToken: 'rotated-refresh', account: { id: 'user' } }))
    : calls.length === 1 ? new Response(null, { status: 401 }) : new Response(JSON.stringify({ code: 'GITHUB_APP_PROVIDER_ERROR' }), { status: 401 }));
  await assert.rejects(env.api.apiRequest('/projects/p/git/app/installations', { feedback: false }), error => error.code === 'GITHUB_APP_PROVIDER_ERROR');
  assert.equal(env.calls.length, 3); assert.equal(env.cleared, 0);
});
