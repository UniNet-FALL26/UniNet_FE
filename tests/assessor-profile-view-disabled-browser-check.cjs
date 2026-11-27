const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(60000);
    const errors = [], relationshipRequests = [], portfolioRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'student-viewer', email: 'viewer@example.test', role: 0, profileComplete: true, profile: { ...sample.profile, id: 'viewer-profile', avatarUrl: null, coverUrl: null } };
    const assessor = { ...account.profile, id: 'assessor-profile', role: 2, fullName: 'Assessor', nickname: 'Assessor', websites: [], bio: null };
    const student = { ...account.profile, id: 'another-student', role: 0, fullName: 'Student', websites: [] };
    const studentData = { ...structuredClone(sample), isOwner: false, profile: student };
    const post = { id: 'assessor-post', authorUserId: assessor.id, authorName: 'Assessor', authorNickname: 'Assessor', authorActorType: 0, authorAvatar: null, description: 'Bóng đá', mediaUrls: [], favoriteCount: 1, commentCount: 0, isFavorited: false, isSaved: false, createdAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z' };
    await page.route('**/hubs/**', route => route.abort());
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()), path = url.pathname;
      const ok = json => route.fulfill({ json });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok({ ...studentData, isOwner: true, profile: account.profile });
      if (path.endsWith('/profile/public/' + assessor.id)) return ok(assessor);
      if (path.endsWith('/profile/public/' + student.id)) return ok(student);
      if (path.includes('/profile/portfolio/')) { portfolioRequests.push(path); return ok(studentData); }
      if (path.includes('/friendships/relationship/')) {
        const target = path.split('/').at(-1); relationshipRequests.push(target);
        if (target === assessor.id) return route.fulfill({ status: 404, json: { message: 'Không tìm thấy tài khoản sinh viên đang hoạt động.' } });
        return ok({ accountId: 'other-student-account', profileId: student.id, fullName: 'Student', nickname: '', avatarUrl: null, role: 0, relationship: 'none', friendshipId: null, friendshipVersion: null, mutualFriendsCount: 0 });
      }
      if (path.endsWith('/community/posts')) {
        if (url.searchParams.has('authorUserId')) return ok(url.searchParams.get('authorUserId') === assessor.id ? [post] : []);
        return ok({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1, data: [post] });
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/community', { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: 'Xem hồ sơ của Assessor', exact: true }).first().click();
      await page.getByRole('link', { name: 'Xem hồ sơ của Assessor', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(new URL(page.url()).pathname.includes('/profile/view/'), false);
      assert.equal(await page.getByTestId('public-role-profile').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Tải lại quan hệ', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Kết bạn', exact: true }).count(), 0);
      assert.equal(await page.getByRole('alert').count(), 0);
      assert.equal(relationshipRequests.includes(assessor.id), false);
      assert.equal(portfolioRequests.some(path => path.endsWith('/' + assessor.id)), false);
      await page.goto(origin + '/profile/view/' + assessor.id, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => !url.pathname.includes('/profile/view/'));
      assert.equal(await page.getByTestId('public-role-profile').count(), 0);
      await page.goto(origin + '/profile/view/' + student.id, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Kết bạn', exact: true }).waitFor();
      assert.equal(relationshipRequests.includes(student.id), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log('Assessor public profile viewing disabled: author clicks stay in community, direct links redirect, no friendship lookup, student profiles retained on desktop/mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
