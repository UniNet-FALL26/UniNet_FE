const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'partner-community-account', email: 'partner@community.test', role: 1, profileComplete: true, profile: { id: 'partner-community-profile', fullName: 'Community Partner', organizationName: 'Community Partner', isVerified: true } };
    const post = { id: 'community-post', authorUserId: 'student-profile', authorName: 'Student Author', authorActorType: 0, description: 'Community post shared with students and partners', mediaUrls: [], favoriteCount: 7, commentCount: 1, isFavorited: false, isSaved: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
    let feedReads = 0, commentReads = 0, applicantReads = 0;
    let avatarUrl = origin + '/partner-avatar.png';
    await page.route('**/partner-avatar.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.route('**/missing-partner-avatar.png', route => route.fulfill({ status: 404 }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile: { ...account.profile, avatarUrl, websites: [] } });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 2 });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: 'Community Partner', totalJobs: 0, publishedJobs: 0, draftJobs: 0, closedJobs: 0, expiringJobs: 0, totalApplications: 0, pendingApplications: 0, viewedApplications: 0, interviewApplications: 0, acceptedApplications: 0, rejectedApplications: 0, openJobs: [] });
      if (path.endsWith('/partner/jobs')) return ok({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0, totalJobs: 0, publishedJobs: 0, draftJobs: 0, closingSoonJobs: 0, jobs: [] });
      if (path.endsWith('/applications')) { applicantReads++; return ok([]); }
      if (path.endsWith('/community/posts')) { feedReads++; return ok({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1, data: [post] }); }
      if (path.endsWith('/community/posts/community-post/comments')) {
        commentReads++;
        return ok([{ id: 'comment', postId: post.id, authorUserId: 'another-student', authorUserName: 'Student Commenter', authorName: 'Student Commenter', content: 'Shared community comment', createdAt: post.createdAt, updatedAt: post.updatedAt, replies: [] }]);
      }
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile: { ...account.profile, avatarUrl: null } });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    await page.getByText(post.description, { exact: true }).waitFor();
    assert.ok(feedReads > 0, 'partner tab loads community posts');
    assert.equal(applicantReads, 0, 'community tab does not load applicants');
    assert.equal(await page.getByText('Ứng viên của bài đăng', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).getAttribute('aria-selected'), 'true');
    fs.mkdirSync('dist/partner-community', { recursive: true });
    await page.getByTestId('action-toast').waitFor({ state: 'hidden', timeout: 4500 });
    for (const width of [320, 390, 768, 1023, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(() => document.documentElement.clientWidth === innerWidth);
      const desktop = width >= 1024;
      await page.getByTestId(desktop ? 'company-header' : 'company-footer-navigation').waitFor();
      assert.equal(await page.getByTestId(desktop ? 'company-footer-navigation' : 'company-header').count(), 0);
      assert.deepEqual(await page.getByRole('tab').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), desktop ? ['Cộng đồng', 'Nhắn tin', 'Tuyển dụng', 'Hồ sơ'] : ['Cộng đồng', 'Nhắn tin', 'Tuyển dụng', 'Thông báo', 'Hồ sơ']);
      const navigation = page.getByRole('tablist');
      assert.equal(await navigation.count(), desktop ? 2 : 1);
      if (desktop) {
        const header = page.getByTestId('company-header');
        await header.getByRole('img', { name: 'Ảnh đại diện của bạn', exact: true }).waitFor();
        assert.equal(await header.getByRole('button', { name: 'Thông báo', exact: true }).count(), 1);
        await header.getByTestId('notification-unread-badge').getByText('2', { exact: true }).waitFor();
        assert.equal(await page.getByTestId('company-header-navigation').getByRole('tab').count(), 3);
        for (const label of ['Cộng đồng', 'Nhắn tin', 'Tuyển dụng']) {
          const labelBox = await header.getByRole('tab', { name: label, exact: true }).getByText(label, { exact: true }).boundingBox();
          assert.ok(labelBox.width > 24, `desktop label ${label} remains readable`);
        }
        const geometry = await header.evaluate(node => ({ radius: parseFloat(getComputedStyle(node).borderTopLeftRadius), left: node.getBoundingClientRect().left }));
        assert.ok(geometry.radius >= 18 && geometry.left > 0, 'header has inset rounded frame');
      }
      const box = await page.getByTestId(desktop ? 'company-header-navigation' : 'company-footer-navigation').boundingBox();
      assert.ok(desktop ? box.y < 80 : box.y > 700, `navigation placed correctly at ${width}px`);
      assert.equal(await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/partner-community/feed-${width}.png` });
    }
    await page.getByText(post.description, { exact: true }).click();
    await page.getByText('Shared community comment', { exact: true }).waitFor();
    assert.ok(commentReads > 0, 'existing community comments work for partners');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText(post.description, { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/profile');
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true, selected: true }).waitFor();
    await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/company-notifications');
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    await page.getByText(post.description, { exact: true }).waitFor();
    assert.equal(await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('tab', { name: 'Tuyển dụng', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/jobs');
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    await page.getByText(post.description, { exact: true }).waitFor();
    for (const value of [origin + '/missing-partner-avatar.png', null]) {
      avatarUrl = value;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByTestId('company-profile-avatar-fallback').waitFor();
      await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/profile');
      await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
      await page.getByText(post.description, { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('Partner community: shared feed, comments, active tab, reload, recruitment navigation and mobile/desktop layouts passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
