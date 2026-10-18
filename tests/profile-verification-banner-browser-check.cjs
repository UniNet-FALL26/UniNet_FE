const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const account = { id: 'banner-student', email: 'banner@example.test', role: 0, createdAt: '2020-01-01T00:00:00Z', profileComplete: true, profile: { id: 'banner-profile', fullName: 'Banner Test', displayName: 'Banner Test', nickname: 'banner', isVerified: false } };
const portfolio = { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile } };
const verification = { id: null, status: null, isVerified: false, fullName: null, schoolName: null, studentCode: null, submittedAt: null, reviewedAt: null, rejectReason: null, documentName: null };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'banner-test-access', refreshToken: 'banner-test-refresh', requiresProfileCompletion: false } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: portfolio });
      if (path.endsWith('/student/verification/me')) return route.fulfill({ json: verification });
      if (path.includes('/api/')) return route.fulfill({ json: [] });
      if (url.origin !== origin) return route.fulfill({ status: 204 });
      return route.continue();
    });
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('banner-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/profile');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const before = page.url();
      await page.getByTestId('verification-banner').getByRole('button', { name: 'Xác minh ngay', exact: true }).click();
      const panel = page.getByTestId('student-verification-panel');
      await panel.waitFor();
      assert.equal(page.url(), before, `verification opens over profile at ${width}px`);
      await panel.getByText(account.email, { exact: true }).waitFor();
      await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
      await panel.waitFor({ state: 'detached' });
      assert.equal(page.url(), before, `closing keeps profile at ${width}px`);
      await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('Verification banner opens account popup over profile on desktop and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
