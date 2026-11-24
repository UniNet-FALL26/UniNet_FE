// Real Expo bundle; all API writes and GitHub navigation are isolated fixtures.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.GITHUB_TEST_ORIGIN || 'http://localhost:8081';
const artifacts = process.env.GITHUB_TEST_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'uninet-github-ui');
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); await page.bringToFront(); page.setDefaultTimeout(20000);
    const errors = [], requests = [], writes = []; page.on('pageerror', e => errors.push(e.message));
    await page.context().route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Isolated GitHub fixture — no real changes</h1>' }));
    const sample = structuredClone(require('../src/data/profile-sample.json'));
    const account = { id: 'fixture-account', email: 'fixture@example.test', role: 0, profileComplete: true, profile: { ...sample.profile, id: 'self-profile' } };
    const project = { id: 'github-fixture', title: 'Dự án GitHub Integration', description: 'Kiểm thử UX liên kết GitHub', technologies: ['TypeScript'], status: 1, visibility: 0, isOwner: true, isMember: true,
      creator: { id: 'self-profile', fullName: 'Thành viên A', avatarUrl: null }, members: [{ id: 'member-b', userId: 'other-profile', fullName: 'Thành viên B', avatarUrl: null, role: 'Member', status: 0, joinedAt: '2026-11-01' }],
      details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, actualEndDate: null }, recruitment: null, myReview: null, chatRoomId: null, createdAt: '2026-11-01', updatedAt: '2026-11-01' };
    const repo = { id: 'association-a', projectId: project.id, repository: { fullName: 'uninet/repository-e2e', providerRepositoryId: 123, isPrivate: true }, accessStatus: 0, credentialSource: 1, syncReadiness: 'PendingActivation', syncPaused: true, unlinkedAt: null };
    const rows = [repo]; let manager = true, expanded = false, freshAuthorized = false, fail = false, conflict = true, stall = false, releaseOld, reachedOld;
    const stalled = new Promise(resolve => { reachedOld = resolve; });
    const identities = [{ id: 'identity-b', projectId: project.id, userProfileId: 'other-profile', externalAccountId: 99, externalUsername: 'member-b', status: 0 }];
    const pageOf = items => ({ items, page: 1, pageSize: 50, totalCount: items.length });
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), endpoint = url.pathname, method = req.method();
      assert.equal(url.origin, 'http://localhost:5239'); requests.push({ endpoint, method, query: url.search });
      const ok = json => route.fulfill({ json }), error = (status, code) => route.fulfill({ status, json: { code } });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (endpoint.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (endpoint.endsWith('/auth/me')) return ok(account);
      if (endpoint.endsWith('/profile/portfolio/me')) return ok({ ...sample, profile: account.profile });
      if (endpoint.endsWith('/project-hub/' + project.id)) return ok(project);
      if (endpoint.endsWith('/github/connections')) return ok([{ id: 'a', providerAccountId: '11', login: 'member-a', status: 0 }, { id: 'other', providerAccountId: '33', login: 'another-account', status: 0 }, { id: 'fresh', providerAccountId: '44', login: 'fresh-account', status: 0 }]);
      if (endpoint.endsWith('/github/oauth/complete')) { writes.push({ endpoint, body: req.postDataJSON() }); return ok({ id: 'a', providerAccountId: '11', login: 'member-a', status: 0 }); }
      if (endpoint.endsWith('/git/app/authorization/start')) { writes.push({ endpoint, body: req.postDataJSON() }); return ok({ flowId: 'app-flow', authorizationUrl: 'https://github.com/login/oauth/authorize?state=fixture', expiresAt: new Date(Date.now() + 600000).toISOString() }); }
      if (endpoint.endsWith('/git/app/credentials')) return !manager ? error(403, 'FORBIDDEN') : ok([{ credentialId: 'ca', gitHubUserId: 11, login: 'member-a', requiresReauthorization: false }, { credentialId: 'co', gitHubUserId: 33, login: 'another-account', requiresReauthorization: false }, ...(freshAuthorized ? [{ credentialId: 'cf', gitHubUserId: 44, login: 'fresh-account', requiresReauthorization: false }] : [])]);
      if (endpoint.endsWith('/git/app/installations')) {
        const id = url.searchParams.get('credentialId') === 'ca' ? 22 : url.searchParams.get('credentialId') === 'co' ? 99 : 88;
        return ok({ items: [{ installationId: id, ownerLogin: id === 22 ? 'uninet' : 'other-owner', ownerType: 'User', status: 'Active', configurationUrl: 'https://github.com/settings/installations/' + id }], page: 1, hasMore: false });
      }
      if (/\/app\/installations\/\d+\/repositories$/.test(endpoint)) {
        const install = Number(endpoint.split('/').at(-2)), second = url.searchParams.get('page') === '2';
        if (install === 22 && stall) { stall = false; await new Promise(resolve => { releaseOld = resolve; reachedOld(); }); }
        const items = install !== 22 ? [{ repositoryId: 999, fullName: 'other-owner/private', isPrivate: true, eligible: true }] : second ? [{ repositoryId: 126, fullName: 'uninet/page-two', isPrivate: true, eligible: true }] : [{ repositoryId: 123, fullName: repo.repository.fullName, isPrivate: true, eligible: true }, ...(expanded ? [{ repositoryId: 124, fullName: 'uninet/new-authorized', isPrivate: true, eligible: true }] : []), { repositoryId: 125, fullName: 'uninet/read-only', isPrivate: true, eligible: false }];
        return ok({ items, page: second ? 2 : 1, hasMore: install === 22 && !second }).catch(() => {});
      }
      if (endpoint.endsWith('/git/repositories')) return fail ? error(503, 'PROVIDER_UNAVAILABLE') : ok(pageOf(rows));
      if (endpoint.endsWith('/git/sync-status')) return ok({ items: [{ projectGitRepositoryId: repo.id, latestJob: null }] });
      if (endpoint.endsWith('/git/app/repositories/link')) {
        const body = req.postDataJSON(); writes.push({ endpoint, body });
        rows.push({ ...repo, id: 'new-association', repository: { ...repo.repository, fullName: 'uninet/new-authorized', providerRepositoryId: body.repositoryId } });
        return ok({ projectGitRepositoryId: 'new-association', repositoryId: body.repositoryId, linkStatus: 0, readiness: 'PendingActivation' });
      }
      if (method === 'DELETE') throw new Error('No unlink is authorized by this browser test');
      if (endpoint.endsWith('/git/identities')) {
        if (method === 'POST') {
          writes.push({ endpoint, body: req.postDataJSON() }); if (conflict) return error(409, 'GIT_IDENTITY_OWNERSHIP_CONFLICT');
          const value = { id: 'identity-a', projectId: project.id, userProfileId: 'self-profile', externalAccountId: 11, externalUsername: 'member-a', status: 0 }; identities.push(value); return ok(value);
        }
        return ok(pageOf(identities));
      }
      if (endpoint.endsWith('/contribution/v2/results/public')) return ok({ projectId:project.id,publishedRunId:'published',version:1,publishedAt:'2026-11-01',members:[{userProfileId:'self-profile',contributionPercent:35.5},{userProfileId:'other-profile',contributionPercent:64.5}] });
      if (endpoint.endsWith('/contribution/v2/results/me')) return ok({ contractVersion: '1', projectId: project.id, userId: 'self-profile', runId: 'published', publishedAt: '2026-11-01', contributionPercent: 35.5 });
      if (endpoint.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (endpoint.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route(origin + '/**', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/index.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('/login'));
    const settings = async () => { await page.goto(`${origin}/group/${project.id}?tab=settings`); await page.getByRole('tab', { name: /Cài đặt/ }).click(); try { await page.getByText(repo.repository.fullName, { exact: true }).waitFor(); } catch(e) { console.log('DIAGNOSTIC_BODY='+(await page.locator('body').innerText()).slice(-2400)); console.log('DIAGNOSTIC_REQUESTS='+JSON.stringify(requests.slice(-18))); console.log('DIAGNOSTIC_ERRORS='+JSON.stringify(errors)); throw e; } };
    await settings(); await page.getByText('Đã liên kết', { exact: true }).waitFor(); await page.getByText('Đồng bộ đang tạm dừng', { exact: true }).waitFor();
    assert.equal(await page.getByText('Readiness: PendingActivation', { exact: true }).count(), 0); assert.equal(await page.getByRole('button', { name: 'Tải lại repository', exact: true }).count(), 0); passed++; console.log(`CHECK ${passed}`);
    await page.getByRole('button', { name: `Tùy chọn ${repo.repository.fullName}`, exact: true }).click();
    await page.getByRole('button', { name: 'Chi tiết trạng thái', exact: true }).click(); await page.getByText('Đang chờ xác minh quyền để kích hoạt',{exact:true}).last().waitFor();assert.equal(await page.getByText(/Association:|Readiness: PendingActivation/).count(),0); await page.getByRole('dialog', { name: 'Chi tiết trạng thái' }).getByRole('button', { name: 'Đóng', exact: true }).click(); passed++; console.log(`CHECK ${passed}`);
    await page.getByRole('button', { name: `Tùy chọn ${repo.repository.fullName}`, exact: true }).click(); await page.getByRole('button', { name: 'Ngắt liên kết', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ngắt liên kết repository' }).getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes.filter(x => x.method === 'DELETE').length, 0); passed++; console.log(`CHECK ${passed}`);
    await page.clock.install();
    const openWizard = async () => { await page.getByRole('button', { name: 'Thêm repository', exact: true }).click(); await page.getByRole('button', { name: 'Dùng @member-a', exact: true }).waitFor(); };
    await openWizard(); const dialog = page.getByRole('dialog', { name: 'Liên kết GitHub Repository', exact: true });
    await dialog.getByRole('button', { name: 'Dùng @member-a', exact: true }).click(); await dialog.getByRole('button', { name: repo.repository.fullName, exact: true }).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Dùng quyền App @member-a', exact: true }).count(), 0); assert.equal(await dialog.getByRole('button', { name: 'uninet · Hoạt động', exact: true }).count(), 0);
    assert.equal(await dialog.getByRole('button', { name: repo.repository.fullName, exact: true }).isDisabled(), true); assert.equal(await dialog.getByRole('button', { name: 'Xác nhận liên kết', exact: true }).isDisabled(), true); passed++; console.log(`CHECK ${passed}`);
    const newPage = page.context().waitForEvent('page'); await dialog.getByRole('button', { name: 'Cấp quyền thêm repository', exact: true }).click(); const popup = await newPage; await popup.waitForURL('https://github.com/settings/installations/22'); expanded = true; await popup.close();
    await page.clock.fastForward(1600); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await dialog.getByRole('button', { name: 'uninet/new-authorized', exact: true }).waitFor();
    assert.equal(writes.filter(x => x.endpoint.endsWith('/repositories/link')).length, 0); passed++; console.log(`CHECK ${passed}`);
    const before = requests.filter(x => /\/app\/installations\/\d+\/repositories$/.test(x.endpoint)).length;
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    await page.clock.fastForward(1600); await dialog.getByRole('button', { name: 'uninet/new-authorized', exact: true }).waitFor();
    assert.ok(requests.filter(x => /\/app\/installations\/\d+\/repositories$/.test(x.endpoint)).length <= before + 1); passed++; console.log(`CHECK ${passed}`);
    await dialog.getByRole('button', { name: 'Repository tiếp', exact: true }).click(); await dialog.getByRole('button', { name: 'uninet/page-two', exact: true }).waitFor(); await dialog.getByRole('button', { name: 'Repository trước', exact: true }).click(); await dialog.getByRole('button', { name: 'uninet/new-authorized', exact: true }).waitFor(); passed++; console.log(`CHECK ${passed}`);
    await dialog.getByRole('button', { name: 'uninet/new-authorized', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(artifacts, 'linking-simplified-mobile.png'), fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)); await page.setViewportSize({ width: 1440, height: 1000 });
    await dialog.getByRole('button', { name: 'Xác nhận liên kết', exact: true }).click(); await page.getByText('uninet/new-authorized', { exact: true }).waitFor(); assert.equal(writes.filter(x => x.endpoint.endsWith('/repositories/link')).length, 1); passed++; console.log(`CHECK ${passed}`);
    await page.screenshot({ path: path.join(artifacts, 'linked-status-desktop.png'), fullPage: true });
    await openWizard(); await dialog.getByRole('button', { name: 'Dùng @member-a', exact: true }).click(); await dialog.getByRole('button', { name: repo.repository.fullName, exact: true }).waitFor();
    stall = true; await page.clock.fastForward(1600); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await stalled;
    await dialog.getByRole('button', { name: 'Thay đổi tài khoản', exact: true }).click(); await dialog.getByRole('button', { name: 'Dùng @another-account', exact: true }).click(); await dialog.getByRole('button', { name: 'other-owner/private', exact: true }).waitFor(); releaseOld(); assert.equal(await dialog.getByRole('button', { name: repo.repository.fullName, exact: true }).count(), 0); passed++; console.log(`CHECK ${passed}`);
    await dialog.getByRole('button', { name: 'Thay đổi tài khoản', exact: true }).click(); await dialog.getByRole('button', { name: 'Dùng @fresh-account', exact: true }).click(); await dialog.getByRole('button', { name: 'Tiếp tục trên GitHub', exact: true }).waitFor();
    const authPopup = page.context().waitForEvent('page'); await dialog.getByRole('button', { name: 'Tiếp tục trên GitHub', exact: true }).click(); const auth = await authPopup; await auth.waitForURL(/github.com\/login\/oauth\/authorize/); freshAuthorized = true; await auth.close();
    await page.clock.fastForward(1600); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await dialog.getByRole('button', { name: 'other-owner/private', exact: true }).waitFor(); assert.equal(writes.filter(x => x.endpoint.endsWith('/repositories/link')).length, 1); passed++; console.log(`CHECK ${passed}`);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    project.isOwner = false; manager = false; await settings(); assert.equal(await page.getByRole('button', { name: 'Thêm repository', exact: true }).count(), 0); passed++; console.log(`CHECK ${passed}`);
    manager = true; await settings(); await page.getByRole('button', { name: 'Thêm repository', exact: true }).waitFor(); passed++; console.log(`CHECK ${passed}`);
    await page.getByRole('tab', { name: /Thành viên/ }).click(); await page.getByText('35,5%', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Liên kết GitHub của tôi', exact: true }).click(); await page.getByRole('button', { name: 'Liên kết @member-a với tôi', exact: true }).click(); await page.getByText(/Tài khoản GitHub đã thuộc thành viên khác/).waitFor(); passed++; console.log(`CHECK ${passed}`);
    conflict = false; await page.getByRole('button', { name: 'Liên kết @member-a với tôi', exact: true }).click(); await page.getByText('GitHub: @member-a · Đã xác minh', { exact: true }).waitFor(); passed++; console.log(`CHECK ${passed}`);
    await page.getByRole('tab', { name: /Cài đặt/ }).click(); await page.getByRole('button', { name: 'Thêm repository', exact: true }).waitFor(); fail = true;
    await page.clock.fastForward(1600); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.getByText(/Không thể kiểm tra trạng thái\./).waitFor(); await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); fail = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('button', { name: 'Thêm repository', exact: true }).waitFor(); passed++; console.log(`CHECK ${passed}`);
    await page.evaluate(({ id, accountId }) => window.sessionStorage.setItem('uninet.github-flow.v1', JSON.stringify({ flowId: 'test-flow', projectId: id, accountId, tab: 'settings', expiresAt: new Date(Date.now() + 60000).toISOString() })), { id: project.id, accountId: account.id });
    await page.goto(origin + '/github/callback?githubFlowId=test-flow&githubStatus=ready'); await page.getByText('Tài khoản GitHub đã được xác minh', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Quay lại dự án', exact: true }).click(); await page.getByRole('button', { name: 'Thêm repository', exact: true }).waitFor(); passed++; console.log(`CHECK ${passed}`);
    assert.ok(requests.every(x => !x.endpoint.includes('68f98a9f-d73d-4dcf-be5c-7099b29329c0'))); assert.deepEqual(errors, []);
    console.log(`PASS ${passed} browser scenarios; all writes/GitHub navigation intercepted; screenshots: ${artifacts}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
