const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const account = { id: 'navigation-test', email: 'navigation@example.test', role: 0, profileComplete: true, profile: { id: 'navigation-profile', fullName: 'Navigation Test', displayName: 'Navigation Test', nickname: 'navigation', isVerified: false } };
const labels = ['C\u1ed9ng \u0111\u1ed3ng', 'Kh\u00f4ng gian l\u00e0m vi\u1ec7c', 'C\u01a1 h\u1ed9i', 'Nh\u00f3m', 'D\u1ef1 \u00e1n', 'Nh\u1eafn tin', 'Th\u00f4ng b\u00e1o', 'C\u00e1 nh\u00e2n'];
const paths = ['/', '/workspace', '/opportunities', '/groups', '/projects', '/messages', '/notifications', '/profile'];
const portfolio = structuredClone(require('../src/data/profile-sample.json'));
portfolio.isOwner = true;
portfolio.profile.avatarUrl = null;

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = []; let publications = 0; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://avatar.example.test/portrait.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/profile-samples/developer-portrait.png') }));
    await page.route('https://avatar.example.test/broken.png', route => route.fulfill({ status: 404, body: '' }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'navigation-test-access', refreshToken: 'navigation-test-refresh', requiresProfileCompletion: false } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: portfolio });
      if (path.endsWith('/community/posts') && route.request().method() === 'POST') {
        publications++;
        const body = route.request().postDataJSON();
        assert.equal(body.description, 'Chia sẻ từ khung cộng đồng');
        return route.fulfill({ json: { id: 'composer-test', authorName: 'Navigation Test', description: body.description, mediaUrls: [], favoriteCount: 0, commentCount: 0, createdAt: new Date().toISOString() } });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const header = page.getByTestId('desktop-app-header'); await header.waitFor();
    await page.getByText('Nguy\u1ec5n V\u0103n A', { exact: true }).waitFor();
    fs.mkdirSync('dist/desktop-navigation-verification', { recursive: true });
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.getByTestId('mobile-app-footer').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Mở menu', exact: true }).count(), 0);
      assert.equal(await header.getByRole('tab').count(), 8);
      assert.ok((await header.boundingBox()).height <= 80, `single-row header ${width}`);
      const composer = page.getByTestId('community-composer');
      assert.equal(await composer.getByRole('button').count(), 6);
      const composerBounds = await composer.boundingBox();
      assert.ok(composerBounds.x >= 0 && composerBounds.x + composerBounds.width <= width);
      for (const label of labels) await header.getByRole('tab', { name: label, exact: true }).waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `fits ${width}`);
      await page.screenshot({ path: `dist/desktop-navigation-verification/header-${width}.png` });
    }
    assert.equal(await header.getByRole('tab', { name: 'Kh\u00e1c', exact: true }).count(), 0);
    assert.equal(await header.getByRole('textbox').count(), 0, 'no search bar');
    assert.equal(await page.getByTestId('header-profile-avatar').count(), 0, 'no-photo fallback');
    portfolio.profile.avatarUrl = 'https://avatar.example.test/portrait.png';
    await header.getByRole('tab', { name: 'Nhắn tin', exact: true }).click();
    await page.getByTestId('header-profile-avatar').waitFor();
    await page.waitForFunction(() => {
      const avatar = document.querySelector('[data-testid="header-profile-avatar"] img');
      return avatar && avatar.complete && avatar.naturalWidth > 0;
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'dist/desktop-navigation-verification/header-avatar.png' });
    portfolio.profile.avatarUrl = 'https://avatar.example.test/broken.png';
    await header.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    await page.waitForResponse('https://avatar.example.test/broken.png');
    await page.getByTestId('header-profile-avatar').waitFor({ state: 'detached' });
    portfolio.profile.avatarUrl = null;
    for (let index = 1; index < labels.length; index++) {
      const tab = header.getByRole('tab', { name: labels[index], exact: true });
      await tab.click(); await page.waitForURL(url => url.pathname === paths[index]);
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
    }
    await header.getByRole('link', { name: 'UniNet - Trang chủ', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/');
    assert.equal(await header.getByRole('tab', { name: labels[0], exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('button', { name: 'Tạo bài viết mới', exact: true }).click();
    const publish = page.getByRole('button', { name: 'Đăng bài', exact: true });
    assert.equal(await publish.isDisabled(), true);
    await page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true }).fill('Chia sẻ từ khung cộng đồng');
    await publish.click();
    await page.getByText('Chia sẻ từ khung cộng đồng', { exact: true }).waitFor();
    assert.equal(publications, 1);
    await page.getByRole('button', { name: 'Ảnh/Video', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng trình soạn bài', exact: true }).click();
    await page.getByRole('button', { name: 'Khảo sát', exact: true }).click();
    await page.getByText('Tính năng tạo khảo sát sẽ sớm có mặt.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tài liệu', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/documents');
    await header.getByRole('link', { name: 'UniNet - Trang chủ', exact: true }).click();
    await page.getByRole('button', { name: 'Sự kiện', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/events');
    await header.getByRole('link', { name: 'UniNet - Trang chủ', exact: true }).click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByTestId('mobile-app-footer').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `mobile composer fits ${width}`);
      assert.equal(await header.count(), 0);
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      for (const label of [...labels.slice(1, 4), 'Kh\u00e1c']) await page.getByRole('button', { name: label, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Nhóm', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/groups');
      await page.screenshot({ path: `dist/desktop-navigation-verification/mobile-${width}.png` });
    }
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await header.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đóng menu', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: desktop header at 4 sizes, all 8 destinations and active states, brand home link, mobile footer/menu and responsive resize');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
