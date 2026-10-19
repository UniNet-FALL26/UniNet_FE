const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    fs.mkdirSync('dist/auth-transition-verification', { recursive: true });
    await page.goto(`${origin}/welcome`);
    await page.getByTestId('auth-campus-scene').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="auth-campus-scene"] img')].some(image => image.complete && image.naturalWidth > 0));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="auth-login-panel"] img')].some(image => image.complete && image.naturalWidth > 0));
    const scene = page.getByTestId('auth-campus-scene');
    await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')].some(node => Object.keys(node).some(key => key.startsWith('__reactProps') && typeof node[key]?.onClick === 'function')));
    assert.ok(Math.abs((await scene.boundingBox()).x - 1440 * 0.3) < 2);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/login');
    await page.screenshot({ path: 'dist/auth-transition-verification/transition.png' });
    await page.waitForFunction(() => Math.abs(document.querySelector('[data-testid="auth-campus-scene"]').getBoundingClientRect().x) < 2);
    const form = page.getByTestId('desktop-login-content');
    await form.waitFor();
    assert.ok((await form.boundingBox()).x >= 1440 * 0.64);
    await page.screenshot({ path: 'dist/auth-transition-verification/login-1440.png' });
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByText('Vui lòng nhập email.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await page.waitForURL('**/welcome');
    await page.waitForFunction(() => Math.abs(document.querySelector('[data-testid="auth-campus-scene"]').getBoundingClientRect().x - innerWidth * 0.3) < 2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/login');
    for (const width of [1024, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/login`);
      await page.getByTestId('desktop-login-content').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/auth-transition-verification/login-${width}.png` });
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/welcome`);
    await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')].some(node => Object.keys(node).some(key => key.startsWith('__reactProps') && typeof node[key]?.onClick === 'function')));
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.waitForURL('**/register');
    await page.getByTestId('desktop-register-content').waitFor();
    await page.waitForFunction(() => Math.abs(document.querySelector('[data-testid="auth-campus-scene"]').getBoundingClientRect().x) < 2);
    assert.ok((await page.getByTestId('desktop-register-content').boundingBox()).x >= 1440 * 0.64);
    await page.screenshot({ path: 'dist/auth-transition-verification/register-1440.png' });
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await page.getByText('Vui lòng nhập họ và tên.', { exact: true }).waitFor();
    await page.getByText('Vui lòng đồng ý với điều khoản.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await page.waitForURL('**/welcome');
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`${origin}/register`);
    await page.getByTestId('desktop-register-content').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'dist/auth-transition-verification/register-1024.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/register`);
    await page.getByRole('textbox', { name: 'Họ và tên *', exact: true }).waitFor();
    assert.equal(await page.getByTestId('auth-campus-scene').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${origin}/login`);
    await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor();
    assert.equal(await page.getByTestId('auth-campus-scene').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const account = { id: 'auth-motion-test', email: 'motion@example.test', role: 0, profileComplete: true, profile: { id: 'auth-motion-profile', fullName: 'Motion Test', displayName: 'Motion Test', nickname: 'motion', isVerified: false } };
    let logins = 0;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/login')) { logins++; return route.fulfill({ json: { account, accessToken: 'motion-test-access', refreshToken: 'motion-test-refresh', requiresProfileCompletion: false } }); }
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      return route.fulfill({ json: [] });
    });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('motion-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).waitFor();
    assert.equal(logins, 1);
    assert.deepEqual(errors, []);
    console.log('PASS: shared campus forward/back transitions, desktop login, direct visits, validation, reduced motion, mobile fallback and successful mocked login');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
