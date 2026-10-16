const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = []; let role = 0; let authenticatedCalls = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { accessToken: 'logout-test-access', refreshToken: 'logout-test-refresh', account: { id: `logout-role-${role}`, email: 'logout@example.test', role, profileComplete: true, profile: null }, requiresProfileCompletion: false } });
    if (path.includes('/api/')) {
      if (request.headers().authorization) authenticatedCalls++;
      return route.fulfill({ status: 503, json: { message: 'Test profile unavailable' } });
    }
    return route.continue();
  });
  try {
    for (role of [0, 1]) {
      await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill('logout@example.test');
      await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.waitForURL(url => !url.pathname.includes('/login'));
      // Navigate within the SPA so the in-memory session is preserved.
      await page.evaluate(() => { window.history.pushState({}, '', '/settings'); window.dispatchEvent(new PopStateEvent('popstate')); });
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
      fs.mkdirSync('dist/logout-verification', { recursive: true });
      await page.screenshot({ path: `dist/logout-verification/settings-role-${role}.png` });
      await page.context().setOffline(true);
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/login');
      assert.equal(await page.getByRole('textbox', { name: 'Email', exact: true }).inputValue(), '');
      const previousCalls = authenticatedCalls;
      await page.goBack();
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Đăng xuất', exact: true }).count(), 0);
      assert.equal(authenticatedCalls, previousCalls);
      await page.context().setOffline(false);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: student/partner logout offline, profile error, empty login fields and no authenticated history requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
