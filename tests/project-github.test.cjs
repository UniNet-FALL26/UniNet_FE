const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, process: { env: {} }, URL, Date, console, require: name => {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  } });
  return exports;
}
const utility = load('src/utils/project-github.ts');
function service(request, base = 'http://localhost:5239/api') {
  return load('src/services/project-github.service.ts', { '@/constants/config': { API_URL: base }, '@/services/api': { apiRequest: request } });
}
test('all Git routes use the existing API client and exactly one api prefix', async () => {
  for (const base of ['http://localhost:5239/api', 'https://example.test']) {
    const calls = [];
    const { projectGitService: git } = service(async (...args) => { calls.push(args); return {}; }, base);
    await git.connections(); await git.repositories('project'); await git.identities('project'); await git.credentials('project'); await git.myContribution('project');
    assert.equal(calls.length, 5);
    assert.deepEqual(calls.map(x => x[0]), ['/github/connections', '/projects/project/git/repositories?page=1&pageSize=50', '/projects/project/git/identities?page=1&pageSize=50', '/projects/project/git/app/credentials', '/projects/project/contribution/v2/results/me'].map(path => base.endsWith('/api') ? path : '/api' + path));
    assert.ok(calls.every(x => x[1].method === 'GET' && x[1].feedback === false && x[1].cache === 'no-store'));
  }
});
test('OAuth and identity request bodies never permit assigning an arbitrary member or username', async () => {
  const calls = []; const { projectGitService: git } = service(async (...args) => { calls.push(args); });
  await git.startOAuth('expoWeb'); await git.completeOAuth('flow'); await git.linkIdentity('project', 'connection'); await git.reactivateIdentity('project', 'identity', 'connection');
  assert.deepEqual(calls.map(x => JSON.parse(x[1].body)), [{ returnTarget: 'expoWeb' }, { flowId: 'flow' }, { connectionId: 'connection' }, { connectionId: 'connection' }]);
});
test('App selection pins project, credential, installation and repository; no invented completion endpoint', async () => {
  const calls = []; const { projectGitService: git } = service(async (...args) => { calls.push(args); });
  await git.installationRepositories('project', 'credential', 10, 2); await git.linkRepository('project', 'credential', 10, 20);
  assert.equal(calls[0][0], '/projects/project/git/app/installations/10/repositories?credentialId=credential&page=2');
  assert.equal(calls[1][0], '/projects/project/git/app/repositories/link');
  assert.deepEqual(JSON.parse(calls[1][1].body), { credentialId: 'credential', installationId: 10, repositoryId: 20 });
  assert.equal('completeApp' in git, false);
});
test('errors propagate, including forbidden and ownership conflict, without fake success', async () => {
  const error = Object.assign(new Error('not permitted'), { code: 'GIT_IDENTITY_OWNERSHIP_CONFLICT', status: 409 });
  await assert.rejects(service(async () => { throw error; }).projectGitService.linkIdentity('p', 'c'), value => value === error);
  assert.match(utility.gitError(error), /thành viên khác/);
  assert.match(utility.gitError({ code: 'FORBIDDEN' }), /không có quyền/);
  assert.equal(utility.gitError(new Error('secret raw message')), 'Không thể hoàn tất thao tác GitHub. Hãy kiểm tra kết nối, quyền truy cập và thử lại.');
});
test('membership pages are fully loaded; empty inconsistent page fails rather than silently truncating', async () => {
  const { allGitPages } = service(async () => {});
  const rows = await allGitPages(async page => ({ items: [page], totalCount: 2 }));
  assert.deepEqual(Array.from(rows), [1, 2]);
  await assert.rejects(allGitPages(async () => ({ items: [], totalCount: 2 })), /đầy đủ/);
});
test('only matching published official result can supply a percentage, including a legitimate zero', () => {
  const result = { contractVersion: '1', projectId: 'p', userId: 'me', publishedAt: '2026-11-22T00:00:00Z', contributionPercent: 35.5 };
  assert.equal(utility.officialContributionLabel(result, 'p', 'me'), '35,5%');
  for (const bad of [null, { ...result, projectId: 'other' }, { ...result, userId: 'other' }, { ...result, publishedAt: null }, { ...result, contributionPercent: NaN }, { ...result, contributionPercent: 101 }]) {
    assert.equal(utility.officialContributionLabel(bad, 'p', 'me'), 'Chưa có điểm');
  }
  assert.equal(utility.officialContributionLabel({ ...result, contributionPercent: 0 }, 'p', 'me'), '0%');
});
test('identity selection uses profile IDs and active state, never login matching', () => {
  const inactive = { userProfileId: 'me', externalUsername: 'same-login', status: 1 };
  const other = { userProfileId: 'other', externalUsername: 'same-login', status: 0 };
  const active = { userProfileId: 'me', externalUsername: 'verified', status: 0 };
  assert.equal(utility.gitIdentityFor([inactive, other, active], 'me'), active);
  assert.equal(utility.gitIdentityFor([other], 'me'), undefined);
});
test('OAuth redirect metadata is account-bound, expiring, and does not store provider credentials', async () => {
  let stored, redirected;
  const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => { stored = null; } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/utils/github-oauth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, Date, process: { env: {} }, window: { sessionStorage: storage, location: { assign: value => { redirected = value; } } }, require: name => ({ 'react-native': { Platform: { OS: 'web' } }, 'expo-secure-store': {}, '@/services/project-github.service': { projectGitService: { startOAuth: async () => ({ flowId: 'flow', expiresAt: new Date(Date.now() + 60000).toISOString(), authorizationUrl: 'https://github.com/login/oauth/authorize?state=fixture' }) } } }[name]) });
  await exports.beginGitHubOAuth('account', 'project', 'members');
  assert.equal((await exports.readGitHubFlow()).accountId, 'account');
  assert.equal(JSON.parse(stored).projectId, 'project');
  assert.match(redirected, /^https:\/\/github.com\/login\/oauth\/authorize/);
  assert.deepEqual(Object.keys(JSON.parse(stored)).sort(), ['accountId', 'expiresAt', 'flowId', 'projectId', 'tab']);
  stored = JSON.stringify({ ...JSON.parse(stored), expiresAt: '2000-01-01' });
  assert.equal(await exports.readGitHubFlow(), null);
});
