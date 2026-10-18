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
    if (path.endsWith('/student/verification/me')) return route.fulfill({ json: { id: 'verified-request', status: 1, isVerified: true, fullName: account.profile.fullName, schoolName: 'Trường kiểm thử', studentCode: 'SV001', submittedAt: '2026-10-16T03:00:00Z', reviewedAt: '2026-10-17T03:00:00Z', rejectReason: null, documentName: 'student.png' } });
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
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    const sidebar = page.getByTestId('profile-settings-column');
    await sidebar.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).waitFor();
    fs.mkdirSync('dist/settings-verification', { recursive: true });
    for (const width of [1200, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const profileBounds = await page.getByTestId('profile-main-column').boundingBox();
      const settingsBounds = await sidebar.boundingBox();
      assert.ok(profileBounds.x + profileBounds.width <= settingsBounds.x, `profile left/settings right ${width}`);
      assert.equal(Math.round(settingsBounds.width), 400, `wider settings ${width}`);
      assert.ok(profileBounds.x <= Math.max(16, (width - 1800) / 2 + 16) + 1, `profile closer to left ${width}`);
      assert.equal(await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).count(), 0, 'no duplicate settings gear');
      await page.waitForFunction(() => {
        const frame = document.querySelector('[data-testid="profile-template-frame"]');
        const column = document.querySelector('[data-testid="profile-main-column"]');
        return frame?.firstElementChild && column && Math.abs(frame.firstElementChild.getBoundingClientRect().width - column.getBoundingClientRect().width) < 1;
      });
      const webHeader = await page.getByTestId('desktop-app-header').boundingBox();
      const edit = await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).boundingBox();
      assert.equal(Math.round(edit.y - webHeader.y - webHeader.height), 13, 'half-size gap to web header');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `profile fits ${width}`);
      await page.screenshot({ path: `dist/settings-verification/profile-sidebar-${width}.png` });
    }
    await sidebar.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).click();
    await page.getByTestId('starter-introduction').waitFor();
    assert.equal(displayCalls, 1);
    await sidebar.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).click();
    await page.getByTestId('starter-introduction').waitFor({ state: 'detached' });
    assert.equal(displayCalls, 2);
    await sidebar.getByRole('button', { name: 'Điều khoản dịch vụ', exact: true }).click();
    await page.getByRole('dialog').getByText('Điều khoản dịch vụ chưa được cung cấp.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đã hiểu', exact: true }).click();
    await sidebar.getByRole('button', { name: 'Đăng xuất', exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await sidebar.getByRole('button', { name: 'Đăng xuất', exact: true }).isVisible(), true, 'settings remain scrollable without scrollbar');
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await sidebar.waitFor({ state: 'detached' });
      assert.equal(await sidebar.count(), 0, `single-column fallback ${width}`);
      await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    displayCalls = 0;
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
      await page.getByTestId('settings-brand-footer').scrollIntoViewIfNeeded();
      await page.getByTestId('settings-brand-footer').screenshot({ path: `dist/settings-verification/settings-footer-${width}.png`, animations: 'disabled' });
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
    await button('Đóng thông tin tài khoản').click();
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
