const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const sample = require('../src/data/profile-sample.json');
const photoBytes = fs.readFileSync('assets/images/profile-samples/developer-portrait.png');
const avatarUrl = 'https://res.cloudinary.com/fixture/image/upload/v1/uninet/avatar.png';
const account = { id: 'starter-test', email: 'starter@example.test', role: 0, profileComplete: true, profile: null, createdAt: new Date().toISOString() };
const data = structuredClone(sample);
Object.assign(data.profile, { id: 'starter-profile', fullName: 'Nguyễn Mai An', nickname: 'mai.an', avatarUrl: null, coverUrl: null, bio: null, isVerified: false });
for (const field of ['headline', 'careerObjective', 'location', 'availability', 'contactEmail', 'cvUrl', 'yearsOfExperience', 'gpa']) data.portfolio[field] = null;
for (const field of ['skills', 'projects', 'education', 'experience', 'certificates', 'articles', 'socialLinks', 'activities', 'languages']) data.portfolio[field] = [];
data.isOwner = true;

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage(); const errors = []; let writes = 0, confirms = 0, releases = 0;
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'test-access', refreshToken: 'test-refresh', requiresProfileCompletion: false } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
      if (path.endsWith('/ai-images/remove-background')) return route.fulfill({ json: { success: true, data: { sessionId: 'starter-avatar-preview', previewUrl: `data:image/png;base64,${photoBytes.toString('base64')}`, hasTransparentBackground: true, expiresAt: '2099-01-01T00:00:00Z' } } });
      if (path.endsWith('/ai-images/confirm')) { confirms++; return route.fulfill({ json: { success: true, data: { imageUrl: avatarUrl, hasTransparentBackground: true } } }); }
      if (path.includes('/ai-images/sessions/')) { releases++; return route.fulfill({ status: 204 }); }
      if (req.url() === avatarUrl) return route.fulfill({ contentType: 'image/png', body: photoBytes });
      if (path.endsWith('/profile/portfolio/editor/me') && req.method() === 'PUT') { writes++; const body = req.postDataJSON(); data.profile = { ...data.profile, ...body.profile }; data.portfolio = body.portfolio; return route.fulfill({ json: data }); }
      if (path === '/custom-cover.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><rect width="600" height="240" fill="#aaccdd"/></svg>' });
      if (path === '/broken-cover.png') return route.fulfill({ status: 404 });
      if (path.includes('/api/')) { if (['PUT', 'POST', 'DELETE'].includes(req.method())) writes++; return route.fulfill({ json: [] }); }
      return route.continue();
    });
    await page.goto(`${origin}/login`);
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    fs.mkdirSync('dist/profile-verification', { recursive: true });
    for (const width of [320, 440, 768, 1440]) {
      await page.setViewportSize({ width, height: 956 });
      await page.getByRole('heading', { name: 'Nguyễn Mai An', exact: true }).waitFor();
      assert.equal(await page.getByText('Chưa cập nhật địa điểm', { exact: true }).count(), 0);
      await page.getByRole('img', { name: 'Ảnh bìa mặc định UniNet', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Xem mẫu hồ sơ', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Khám phá mẫu hồ sơ chuyên nghiệp', exact: true }).count(), 1);
      assert.equal(await page.getByText(/vui lòng xác minh tài khoản/i).count(), 0);
      const header = page.getByRole('button', { name: 'Mở cài đặt', exact: true });
      const before = await header.boundingBox();
      assert.ok((await page.getByRole('img', { name: 'Ảnh bìa mặc định UniNet', exact: true }).boundingBox()).y >= before.y + before.height);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/profile-verification/starter-refresh-${width}.png` });
      for (const label of ['Được nhìn thấy', 'Tạo dấu ấn cá nhân', 'Mở ra cơ hội mới']) assert.equal(await page.getByText(label, { exact: true }).count(), 1);
      await page.getByTestId('starter-introduction').screenshot({ path: `dist/profile-verification/starter-introduction-${width}.png` });
      await page.getByTestId('starter-strengths').screenshot({ path: `dist/profile-verification/starter-strengths-${width}.png` });
      await page.getByRole('button', { name: 'Khám phá mẫu hồ sơ chuyên nghiệp', exact: true }).scrollIntoViewIfNeeded();
      const after = await header.boundingBox();
      assert.equal(Math.round(after.y), Math.round(before.y), 'header stays fixed while the starter scrolls');
      await page.getByRole('button', { name: 'Khám phá mẫu hồ sơ chuyên nghiệp', exact: true }).click();
      await page.getByRole('heading', { name: 'Mẫu hồ sơ', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    }
    for (const age of [1, 2, 3, 4]) {
      account.createdAt = new Date(Date.now() - age * 86400000).toISOString();
      await page.goto(`${origin}/login`);
      await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
      await page.getByRole('heading', { name: 'Nguyễn Mai An', exact: true }).waitFor();
      const reminder = page.getByRole('heading', { name: 'Vui lòng xác minh tài khoản', exact: true }); await reminder.waitFor();
      await page.getByRole('button', { name: 'Xác minh ngay', exact: true }).waitFor();
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 956 });
        await page.waitForFunction(() => {
          const banner = document.querySelector('[data-testid="verification-banner"]');
          const cta = document.querySelector('[aria-label="Xác minh ngay"]');
          if (!banner || !cta) return false;
          const b = banner.getBoundingClientRect(), c = cta.getBoundingClientRect();
          return c.x >= b.x && c.right <= b.right && c.y >= b.y && c.bottom <= b.bottom;
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const banner = await page.getByTestId('verification-banner').boundingBox();
        const cta = await page.getByRole('button', { name: 'Xác minh ngay', exact: true }).boundingBox();
        if (age === 1) await page.screenshot({ path: `dist/profile-verification/verification-banner-${width}.png` });
        assert.ok(cta.x >= banner.x && cta.x + cta.width <= banner.x + banner.width, JSON.stringify({ width, banner, cta }));
      }
      if (age === 1) await page.screenshot({ path: 'dist/profile-verification/verification-reminder-three-days.png' });
    }
    await page.getByRole('button', { name: 'Đóng thông báo xác minh', exact: true }).click();
    assert.equal(await page.getByTestId('verification-banner').count(), 0);
    await page.goto(`${origin}/login`);
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.getByRole('button', { name: 'Xác minh ngay', exact: true }).click();
    await page.waitForURL('**/settings?account=1');
    await page.goBack();
    await page.getByRole('heading', { name: 'Nguyễn Mai An', exact: true }).waitFor();
    data.profile.isVerified = true;
    await page.getByRole('button', { name: 'Khám phá mẫu hồ sơ chuyên nghiệp', exact: true }).click();
    await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    await page.getByRole('heading', { name: 'Nguyễn Mai An', exact: true }).waitFor();
    await page.getByTestId('verification-banner').waitFor({ state: 'hidden' });
    for (const cover of ['/custom-cover.svg', '/broken-cover.png']) {
      data.profile.coverUrl = `${origin}${cover}`;
      await page.getByRole('button', { name: 'Khám phá mẫu hồ sơ chuyên nghiệp', exact: true }).click();
      await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
      await page.getByRole('img', { name: cover.includes('broken') ? 'Ảnh bìa mặc định UniNet' : 'Ảnh bìa của bạn', exact: true }).waitFor();
    }
    await page.setViewportSize({ width: 440, height: 956 });
    for (const action of ['Hủy', 'Xác nhận']) {
      const before = JSON.stringify(data);
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).click();
      await (await chooser).setFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: photoBytes });
      await page.getByRole('heading', { name: 'Ảnh chân dung', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/profile');
      await page.getByRole('img', { name: 'Ảnh chân dung tách nền trong suốt', exact: true }).waitFor();
      await page.screenshot({ path: `dist/profile-verification/starter-avatar-${action === 'Hủy' ? 'cancel' : 'confirm'}.png` });
      await page.getByRole('button', { name: action, exact: true }).click();
      await page.getByRole('heading', { name: 'Ảnh chân dung', exact: true }).waitFor({ state: 'hidden' });
      if (action === 'Hủy') { assert.equal(JSON.stringify(data), before); assert.equal(writes, 0); assert.equal(confirms, 0); }
      else { await page.getByText('Đã cập nhật ảnh.', { exact: true }).waitFor(); assert.equal(data.profile.avatarUrl, avatarUrl); }
    }
    assert.equal(confirms, 1); assert.ok(releases >= 1);
    await page.getByRole('img', { name: 'Ảnh đại diện Nguyễn Mai An', exact: true }).waitFor();
    for (const id of ['starter-strengths', 'starter-projects']) {
      const card = page.getByTestId(id);
      assert.equal(await card.getAttribute('role'), null);
      await card.click();
      assert.equal(new URL(page.url()).pathname, '/profile');
    }
    assert.equal(writes, 1); assert.deepEqual(errors, []);
    console.log('PASS: responsive starter, fixed header, hidden location, cover fallback, in-place AI avatar cancel/confirm and one mocked save');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
