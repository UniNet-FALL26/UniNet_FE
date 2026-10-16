const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); page.setDefaultTimeout(15000);
  const account = { id: 'settings-student', email: 'mai.anh@example.test', role: 0, profileComplete: true, profile: { id: 'settings-profile', displayName: 'Nguyễn Mai Anh', fullName: 'Nguyễn Mai Anh', nickname: 'mai.anh', isVerified: true } };
  const data = { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile } };
  data.portfolio.appearance.profile.showPortfolio = true;
  const errors = []; let displayCalls = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'settings-test-access', refreshToken: 'settings-test-refresh', requiresProfileCompletion: false } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
    if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
    if (path.endsWith('/profile/portfolio/display/me')) { displayCalls++; assert.equal(req.method(), 'PUT'); data.portfolio.appearance.profile.showPortfolio = req.postDataJSON().showPortfolio; return route.fulfill({ json: data }); }
    if (path.includes('/api/')) return route.fulfill({ json: [] });
    return route.continue();
  });
  try {
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('settings-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.evaluate(() => { history.pushState({}, '', '/settings'); dispatchEvent(new PopStateEvent('popstate')); });
    const button = name => page.getByRole('button', { name, exact: true });
    await page.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).waitFor();
    fs.mkdirSync('dist/settings-verification', { recursive: true });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const name of ['Đổi mẫu hồ sơ', 'Thông tin tài khoản', 'Điều khoản dịch vụ', 'Chính sách bảo mật', 'Đăng xuất']) {
        const bounds = await button(name).boundingBox(); assert.ok(bounds.height >= 48, name);
      }
      assert.equal(await button('Đổi mật khẩu').isDisabled(), true);
      await page.screenshot({ path: `dist/settings-verification/settings-${width}.png`, fullPage: true, animations: 'disabled' });
    }
    assert.equal(await button('Chỉnh sửa hồ sơ').count(), 0);
    assert.equal(await page.getByText('Không gian của bạn. Theo cách của bạn.', { exact: true }).count(), 0);
    await page.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).click();
    await page.getByText('Đã cập nhật cách hiển thị hồ sơ.', { exact: true }).waitFor();
    assert.equal(displayCalls, 1); assert.equal(data.portfolio.appearance.profile.showPortfolio, false);
    await button('Thông tin tài khoản').click();
    await page.getByRole('dialog').getByText(account.email, { exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await button('Đóng thông tin').click();
    assert.equal(await button('Đăng xuất tất cả thiết bị').count(), 0);
    for (const title of ['Điều khoản dịch vụ', 'Chính sách bảo mật']) {
      await button(title).click();
      await page.getByRole('dialog').getByText(`${title} chưa được cung cấp.`, { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await button('Đã hiểu').click();
    }
    await button('Đăng xuất').click();
    await page.waitForURL(url => url.pathname === '/login');
    assert.deepEqual(errors, []);
    console.log('PASS: responsive settings, account and policy dialogs, portfolio save and local logout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
