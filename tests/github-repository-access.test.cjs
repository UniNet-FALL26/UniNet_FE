const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
class ApiError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
function load(git = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/github-repository-access.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, URL, require: name => ({ '@/services/api': { ApiError }, '@/services/project-github.service': { projectGitService: git, allGitPages: async read => (await read(1)).items } })[name],
  });
  return exports;
}
test('configuration link uses provider URL only for matching installation, otherwise official fallback', () => {
  const u = load(); const installation = { installationId: 12 };
  for (const url of ['https://github.com/settings/installations/12', 'https://github.com/organizations/org/settings/installations/12']) {
    const result = u.githubInstallationConfiguration({ ...installation, configurationUrl: url });
    assert.equal(result.url, url); assert.equal(result.direct, true);
  }
  for (const url of [undefined, 'https://github.com/settings/installations/13', 'https://evil.test/12', 'https://github.com@evil.test/12', 'https://github.com/settings/installations/12?next=evil', 'http://github.com/settings/installations/12']) {
    const result = u.githubInstallationConfiguration({ ...installation, configurationUrl: url });
    assert.equal(result.url, 'https://github.com/settings/installations'); assert.equal(result.direct, false);
  }
});
test('credential selection matches verified numeric actor, never login or first credential', () => {
  const a = { credentialId: 'other', gitHubUserId: 99, login: 'same-name' }, b = { credentialId: 'correct', gitHubUserId: 11, login: 'renamed' };
  assert.deepEqual(Array.from(load().credentialsForGitHubAccount([a, b], { providerAccountId: '11', login: 'same-name' })), [b]);
});
test('explicit refresh revalidates same selected identity across pages and returns fresh repo data without linking', async () => {
  const calls = []; let generation = 1;
  const git = {
    credentials: async id => { calls.push(['credentials', id]); return [{ credentialId: 'c', gitHubUserId: 11, requiresReauthorization: false }]; },
    installations: async (id, credential, page) => { calls.push(['installations', id, credential, page]); return { items: [{ installationId: page === 1 ? 99 : 12, status: 'Active' }], page, hasMore: page === 1 }; },
    installationRepositories: async (id, credential, install, page) => { calls.push(['repositories', id, credential, install, page]); return { items: [{ repositoryId: generation }], page, hasMore: false }; },
    repositories: async id => ({ items: [{ projectId: id, repository: { providerRepositoryId: 55 } }, { projectId: 'other-project', repository: { providerRepositoryId: 66 } }], totalCount: 2 }),
    linkRepository: () => { throw new Error('Refresh must never link'); },
  };
  const utility = load(git), account = { providerAccountId: '11' };
  const before = await utility.refreshGitHubRepositoryAccess('p', account, 'c', 12); generation = 2;
  const after = await utility.refreshGitHubRepositoryAccess('p', account, 'c', 12);
  assert.equal(before.repositories.items[0].repositoryId, 1); assert.equal(after.repositories.items[0].repositoryId, 2);
  assert.equal(after.installation.installationId, 12); assert.deepEqual(Array.from(after.linkedIds), [55]);
  assert.equal(calls.filter(x => x[0] === 'credentials').length, 2);
  assert.ok(calls.some(x => x[0] === 'repositories' && x[3] === 12 && x[4] === 1));
});
test('credential replacement, expired credential or actor mismatch cannot silently substitute another authorization', async () => {
  for (const row of [{ credentialId: 'new', gitHubUserId: 11 }, { credentialId: 'old', gitHubUserId: 99 }, { credentialId: 'old', gitHubUserId: 11, requiresReauthorization: true }]) {
    const utility = load({ credentials: async () => [row], installations: async () => { throw new Error('Must fail before discovery'); } });
    await assert.rejects(utility.refreshGitHubRepositoryAccess('p', { providerAccountId: '11' }, 'old', 12), error => error.code === 'GITHUB_APP_REAUTHORIZATION_REQUIRED');
  }
});
test('removed or suspended selected installation fails closed, never chooses the first available one', async () => {
  for (const selected of [{ installationId: 99, status: 'Active' }, { installationId: 12, status: 'Suspended' }]) {
    const utility = load({ credentials: async () => [{ credentialId: 'c', gitHubUserId: 11 }], installations: async () => ({ items: [selected], hasMore: false }), installationRepositories: async () => { throw new Error('Must not load'); } });
    await assert.rejects(utility.refreshGitHubRepositoryAccess('p', { providerAccountId: '11' }, 'c', 12), error => error.code === 'GITHUB_APP_INSTALLATION_UNAVAILABLE');
  }
});
test('wizard skips unique auxiliary choices only after explicit verified account selection', async () => {
  const credential = { credentialId: 'c', gitHubUserId: 11, requiresReauthorization: false };
  let multiple = false, repositoryCalls = 0;
  const git = {
    credentials: async () => [credential],
    installations: async () => ({ items: multiple ? [{ installationId: 1, status: 'Active' }, { installationId: 2, status: 'Active' }] : [{ installationId: 1, status: 'Active' }], page: 1, hasMore: false }),
    installationRepositories: async () => { repositoryCalls++; return { items: [{ repositoryId: 3, eligible: true }], page: 1, hasMore: false }; },
    repositories: async () => ({ items: [], totalCount: 0 }),
  };
  const choice = { account: { id: 'verified', providerAccountId: '11' }, installationPage: 1, repositoryPage: 1 }, signal = new AbortController().signal;
  const utility = load(git);
  const single = await utility.readGitHubLinkOptions('p', choice, signal);
  assert.equal(single.credential.credentialId, 'c'); assert.equal(single.installation.installationId, 1); assert.equal(single.repositories.items[0].repositoryId, 3);
  multiple = true;
  const ambiguous = await utility.readGitHubLinkOptions('p', choice, signal);
  assert.equal(ambiguous.installation, null); assert.equal(ambiguous.repositories, null); assert.equal(repositoryCalls, 1);
  const explicit = await utility.readGitHubLinkOptions('p', { ...choice, installationId: 2 }, signal);
  assert.equal(explicit.installation.installationId, 2);
});
