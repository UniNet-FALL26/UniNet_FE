const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const account = { id: 'starter-student', email: 'starter@example.org', role: 0, profileComplete: true, profile: { id: 'starter-profile', fullName: 'Nguyễn Mai An', nickname: 'Mai An', displayName: 'Mai An', isVerified: false, organizationName: null } };
const data = { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile, avatarUrl: null, coverUrl: null, bio: null }, portfolio: { ...sample.portfolio, headline: null, careerObjective: null, location: null, availability: null, contactEmail: null, cvUrl: null, yearsOfExperience: null, gpa: null, skills: [], projects: [], experience: [], education: [], certificates: [], articles: [], socialLinks: [], activities: [], languages: [] } };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); const errors = []; let failLoad = false, failUpload = false, writes = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'starter-test-access', refreshToken: 'starter-test-refresh', requiresProfileCompletion: false } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
    if (path.endsWith('/profile/portfolio/me')) return failLoad ? route.fulfill({ status: 500, json: { message: 'Lỗi tải hồ sơ kiểm thử' } }) : route.fulfill({ json: data });
    if (path.endsWith('/profile/images')) { writes++; return failUpload ? route.fulfill({ status: 500, json: { message: 'Lỗi tải ảnh kiểm thử' } }) : route.fulfill({ json: { url: `${origin}/starter-photo-uploaded.svg` } }); }
    if (path.endsWith('/profile/portfolio/editor/me') && req.method() === 'PUT') { writes++; const body = req.postDataJSON(); data.profile = { ...data.profile, ...body.profile }; data.portfolio = body.portfolio; return route.fulfill({ json: data }); }
    if (path.startsWith('/starter-photo')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250"><rect width="600" height="250" fill="#d5e8d9"/><circle cx="470" cy="110" r="60" fill="#729d86"/></svg>' });
    if (path.startsWith('/api/')) { if (['PUT','POST','DELETE'].includes(req.method())) writes++; return route.fulfill({ json: [] }); }
    return route.continue();
  });
  fs.mkdirSync('dist/profile-verification', { recursive: true });
  try {
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('starter-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    for (const width of [320,768,1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('heading', { name: account.profile.fullName, exact: true }).waitFor();
      assert.equal(await page.getByText('@Mai An', { exact: true }).count(), 1);
      assert.equal(await page.getByText('Sinh viên UniNet', { exact: true }).count(), 0);
      for (const name of ['Đổi ảnh đại diện', 'Đổi ảnh bìa']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 1);
      assert.equal(await page.getByText('Trịnh Trọng Quyền', { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-testid="student-profile-starter"]').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/profile-verification/student-starter-${width}.png` });
      await page.getByRole('button', { name: 'Chọn mẫu hồ sơ', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `dist/profile-verification/student-starter-invitation-${width}.png` });
      await page.getByRole('button', { name: 'Chọn mẫu hồ sơ', exact: true }).click();
      await page.getByRole('heading', { name: 'Mẫu hồ sơ', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    }
    data.profile.avatarUrl = `${origin}/starter-photo-avatar.svg`; data.profile.coverUrl = `${origin}/starter-photo-cover.svg`;
    await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    await page.getByRole('img', { name: 'Ảnh bìa của bạn', exact: true }).waitFor();
    await page.getByRole('img', { name: `Ảnh đại diện ${account.profile.fullName}`, exact: true }).waitFor();
    for (const [name, field] of [['Đổi ảnh bìa', 'coverUrl'], ['Đổi ảnh đại diện', 'avatarUrl']]) {
      const chooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name, exact: true }).click();
      const chooser = await chooserPromise;
      await chooser.setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
      await page.getByText('Đã cập nhật ảnh.', { exact: true }).waitFor();
      assert.equal(data.profile[field], `${origin}/starter-photo-uploaded.svg`);
      await page.getByRole('button', { name, exact: true }).waitFor({ state: 'visible' });
    }
    assert.equal(writes, 4);
    failUpload = true;
    const failedChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Đổi ảnh bìa', exact: true }).click();
    await (await failedChooserPromise).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    await page.getByText('Lỗi tải ảnh kiểm thử', { exact: true }).waitFor();
    assert.equal(writes, 5); assert.equal(data.profile.coverUrl, `${origin}/starter-photo-uploaded.svg`);
    await page.screenshot({ path: 'dist/profile-verification/student-identity-photo-buttons.png' });
    failLoad = true; await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    await page.getByText('Lỗi tải hồ sơ kiểm thử', { exact: true }).waitFor();
    failLoad = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('button', { name: 'Chọn mẫu hồ sơ', exact: true }).waitFor();
    data.portfolio.headline = 'Sinh viên Kỹ thuật phần mềm'; data.portfolio.appearance.profile.template = 'developer-landscape'; data.portfolio.appearance.profile.theme = 'mint';
    await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    await page.getByRole('button', { name: 'Quay lại trang cá nhân', exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).waitFor();
    assert.equal(await page.locator('[data-testid="student-profile-starter"]').count(), 0);
    assert.equal(await page.locator('[data-testid="landscape-hero"]').count(), 1);
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    await page.waitForURL(url => url.pathname.includes('/profile/editor') && url.searchParams.get('template') === 'developer-landscape' && url.searchParams.get('theme') === 'mint');
    assert.equal(writes, 5); assert.deepEqual(errors, []);
    console.log('Student starter: responsive layout, camera buttons, avatar/cover upload and persistence, upload failure, navigation and profile transition pass.');
  } catch (error) {
    console.error(error.message); await page.screenshot({ path: 'dist/profile-verification/student-starter-failure.png', timeout: 5000 }).catch(() => {}); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
