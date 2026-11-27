const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [], writes = [];
    let failSave = false;
    let saved = structuredClone(sample);
    saved.isOwner = true;
    saved.portfolio.interests = [];
    saved.portfolio.projects = []; saved.portfolio.skills = [];
    const account = { id: 'interests-owner', email: 'interests@example.test', role: 0, profileComplete: true, profile: saved.profile };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/hubs/**', route => route.abort());
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = json => route.fulfill({ json });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(saved);
      if (path.endsWith('/profile/portfolio/editor/me')) {
        const payload = route.request().postDataJSON();
        assert.equal(route.request().method(), 'PUT');
        assert.ok(payload.portfolio.interests.every(name => sample.portfolio.interests.includes(name)));
        assert.equal(new Set(payload.portfolio.interests).size, payload.portfolio.interests.length);
        writes.push(payload);
        if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { message: 'Lỗi lưu sở thích mẫu' } }); }
        saved = { ...saved, profile: { ...saved.profile, ...payload.profile }, portfolio: payload.portfolio };
        return ok(saved);
      }
      if (path.endsWith('/profile/public/' + saved.profile.id)) return ok({ ...saved.profile, role: 0, websites: [] });
      if (path.endsWith('/profile/portfolio/' + saved.profile.id)) return ok({ ...saved, isOwner: false });
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/student/verification/me')) return ok({ status: 1, isVerified: true });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    fs.mkdirSync('dist/profile-interests-editor', { recursive: true });
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) {
        saved.portfolio.interests = [];
        saved.portfolio.appearance.profile.template = template;
        saved.portfolio.appearance.profile.theme = template === 'developer-showcase' ? 'mint' : 'blue';
        await page.goto(origin + '/profile/editor', { waitUntil: 'domcontentloaded' });
        const open = () => page.getByRole('button', { name: 'Thêm sở thích cá nhân', exact: true }).click();
        const picker = page.getByRole('dialog', { name: 'Chọn sở thích cá nhân', exact: true });
        await open();
        assert.equal(await picker.getByRole('checkbox').count(), 48);
        await picker.getByRole('textbox', { name: 'Tìm sở thích', exact: true }).fill('lap trinh');
        assert.equal(await picker.getByRole('checkbox').count(), 1);
        await picker.getByRole('checkbox', { name: 'Lập trình', exact: true }).click();
        await picker.getByRole('textbox', { name: 'Tìm sở thích', exact: true }).fill('zzzz-no-match');
        await picker.getByText('Không tìm thấy sở thích phù hợp.', { exact: true }).waitFor();
        await picker.getByRole('button', { name: 'Hủy', exact: true }).click();
        assert.equal(await page.getByTestId('profile-interest-tag').count(), 0);
        await open();
        assert.equal(await picker.getByRole('checkbox', { name: 'Lập trình', exact: true }).getAttribute('aria-checked'), 'false');
        await picker.getByRole('checkbox', { name: 'Lập trình', exact: true }).click();
        await picker.getByRole('checkbox', { name: 'Đọc sách', exact: true }).click();
        await picker.getByText('Đã chọn 2 sở thích', { exact: true }).waitFor();
        const apply = await picker.getByRole('button', { name: 'Áp dụng', exact: true }).boundingBox();
        assert.ok(apply.x >= 0 && apply.x + apply.width <= width && apply.y + apply.height <= 900);
        await picker.screenshot({ path: `dist/profile-interests-editor/${template}-${width}.png`, animations: 'disabled' });
        await picker.getByRole('button', { name: 'Áp dụng', exact: true }).click();
        assert.equal(await page.getByTestId('profile-interest-tag').count(), 2);
        if (template === 'developer-modern' && width === 1440) {
          failSave = true;
          await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
          await page.getByText('Lỗi lưu sở thích mẫu', { exact: true }).waitFor();
          assert.deepEqual(saved.portfolio.interests, []);
          assert.equal(await page.getByTestId('profile-interest-tag').count(), 2);
        }
        await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
        await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor();
        assert.deepEqual(saved.portfolio.interests, ['Đọc sách', 'Lập trình']);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await open();
        assert.equal(await picker.getByRole('checkbox', { name: 'Đọc sách', exact: true }).getAttribute('aria-checked'), 'true');
        await picker.getByRole('checkbox', { name: 'Đọc sách', exact: true }).click();
        await picker.getByText('Đã chọn 1 sở thích', { exact: true }).waitFor();
        await picker.getByRole('button', { name: 'Hủy', exact: true }).click();
        await page.goto(origin + '/profile/view/' + saved.profile.id, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('profile-interests').waitFor();
        assert.equal(await page.getByTestId('profile-interest-tag').count(), 2);
        assert.equal(await page.getByRole('button', { name: 'Thêm sở thích cá nhân', exact: true }).count(), 0);
        await page.goto(origin + '/profile/editor', { waitUntil: 'domcontentloaded' });
        await open();
        await picker.getByRole('button', { name: 'Bỏ chọn tất cả sở thích', exact: true }).click();
        await picker.getByText('Đã chọn 0 sở thích', { exact: true }).waitFor();
        await picker.getByRole('button', { name: 'Áp dụng', exact: true }).click();
        await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
        await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor();
        await page.goto(origin + '/profile/view/' + saved.profile.id, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        assert.equal(await page.getByTestId('profile-interests').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    assert.ok(writes.length >= 12);
    assert.deepEqual(errors, []);
    console.log('Interests editor passed: three templates, desktop/320px, search, multi-select, cancel, failed save/retry, reload, visitor display and clearing.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
