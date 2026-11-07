const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [], duplicateKeys = [], requests = [], held = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /same key|Encountered two children/.test(message.text())) duplicateKeys.push(message.text()); });
    const account = { id: 'pagination-account', email: 'pagination@example.test', role: 1, profileComplete: true, profile: { id: 'pagination-profile', organizationName: 'Pagination Partner', fullName: 'Pagination Partner', isVerified: true } };
    const row = (id, description = `Pagination post ${id}`) => ({ id: `page-post-${id}`, authorUserId: 'author', authorName: 'Community Author', authorActorType: 0, description, mediaUrls: [], favoriteCount: 0, commentCount: 0, isFavorited: false, isSaved: false, createdAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z' });
    await page.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/community/posts')) {
        const number = Number(url.searchParams.get('page')); requests.push(number);
        if (number === 1) return ok(Array.from({ length: 10 }, (_, id) => row(id)));
        held.push(route); return;
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 1 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/profile/me')) return ok({ profile: account.profile });
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile: account.profile });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: 'Pagination Partner', openJobs: [] });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    const last = page.getByTestId('community-post-page-post-9');
    await last.waitFor({ state: 'attached' });
    const pendingPage = page.waitForRequest(request => /community\/posts\?/.test(request.url()) && new URL(request.url()).searchParams.get('page') === '2');
    await last.scrollIntoViewIfNeeded(); await pendingPage;
    await page.getByTestId('community-post-page-post-8').scrollIntoViewIfNeeded();
    await last.scrollIntoViewIfNeeded();
    assert.equal(requests.filter(number => number === 2).length, 1);
    await held.shift().fulfill({ json: [row(8, 'Updated overlapping post'), row(9), row(10), row(10)] });
    await page.getByTestId('community-post-page-post-10').waitFor();
    for (const id of [8, 9, 10]) assert.equal(await page.getByTestId('community-post-page-post-' + id).count(), 1);
    await page.getByTestId('community-post-page-post-8').getByText('Updated overlapping post', { exact: true }).waitFor();
    assert.deepEqual(duplicateKeys, []);
    assert.deepEqual(errors, []);
    assert.equal(requests.filter(number => number === 2).length, 1);
    console.log('Feed pagination: one load-more request, overlapping/duplicate posts merged, no React duplicate-key errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
