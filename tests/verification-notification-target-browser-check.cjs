// Synthetic accounts and mocked APIs only; no real verification documents.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8091';
const account = { id: 'verification-target-student', email: 'target@example.test', role: 0, profileComplete: true, profile: { id: 'target-profile', fullName: 'Target Student', displayName: 'Target Student', isVerified: true } };
const verification = { id: 'verification-target', status: 1, isVerified: true, fullName: account.profile.fullName, schoolName: 'Test University', studentCode: 'SV001', submittedAt: '2026-10-25T03:00:00Z', reviewedAt: '2026-10-25T04:00:00Z', rejectReason: null, documentName: 'student.png' };
const notification = { id: 'verification-approved', recipientUserId: account.id, type: 'verification.student.approved', category: 'verification', title: 'Xác minh thành công', message: 'Tài khoản đã được xác minh.', audience: 'personal', readAt: null, createdAt: '2026-10-25T04:00:00Z' };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'target-test-access', refreshToken: 'target-test-refresh', requiresProfileCompletion: false } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile } } });
      if (path.endsWith('/student/verification/me')) return route.fulfill({ json: verification });
      if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { count: notification.readAt ? 0 : 1 } });
      if (path.endsWith('/notifications/verification-approved/read')) { notification.readAt = new Date().toISOString(); return route.fulfill({ status: 204 }); }
      if (path.endsWith('/notifications/verification-approved/target')) return route.fulfill({ json: { targetUrl: '/settings?account=1' } });
      if (path.endsWith('/notifications')) return route.fulfill({ json: { items: [notification], page: 1, pageSize: 20, total: 1, unreadCount: notification.readAt ? 0 : 1 } });
      if (path.includes('/api/')) return route.fulfill({ json: [] });
      if (url.origin !== origin) return route.fulfill({ status: 204 });
      return route.continue();
    });
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('target-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    fs.mkdirSync('dist/verification-notification', { recursive: true });
    for (const width of [1440, 1200, 1199, 390]) {
      await page.setViewportSize({ width, height: 956 });
      await page.evaluate(() => { history.pushState({}, '', '/notifications'); dispatchEvent(new PopStateEvent('popstate')); });
      await page.getByTestId('notification-verification-approved').click();
      const panel = page.getByTestId('student-verification-panel'); await panel.waitFor();
      const expected = width >= 1200 ? '/profile' : '/settings';
      await page.waitForURL(url => url.pathname === expected);
      await panel.getByText('Đã xác minh sinh viên', { exact: true }).waitFor();
      if (width >= 1200) await page.getByTestId('profile-settings-column').waitFor();
      await page.waitForURL(url => url.pathname === expected && !url.searchParams.has('account')).catch(error => { console.error('Unconsumed popup URL:', page.url()); throw error; });
      await page.screenshot({ path: `dist/verification-notification/${width}.png` });
      await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
      await panel.waitFor({ state: 'detached' });
      assert.equal(new URL(page.url()).pathname, expected, 'close retains the intended page');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: desktop verification notifications open profile popup, mobile keeps settings, repeated opens work, query consumed, no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
