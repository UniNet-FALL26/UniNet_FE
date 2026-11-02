// Isolated browser checks: Cloudinary uploads and database writes are API fixtures.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const photo = { name: 'partner-photo.png', mimeType: 'image/png', buffer: fs.readFileSync('assets/images/uninet-mark.png') };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const profile = { id: 'photo-profile', fullName: 'Photo Partner', organizationName: 'Photo Partner', displayName: 'Photo Partner', partnerType: 0, industry: 'Software', bio: 'Keep this description', contactEmail: 'photos@partner.test', phone: '0968110347', address: 'TP.HCM', avatarUrl: null, coverUrl: null, websites: ['https://partner.test/'], isVerified: true };
    const account = { id: 'photo-account', email: 'photos@partner.test', role: 1, profileComplete: true, profile };
    let uploads = 0, writes = 0, uploadFailure = false, saveFailure = false, holdUpload = false, releaseUpload, uploadEntered;
    const savedUrls = [];
    await page.route('https://res.cloudinary.com/fixture/**', route => route.fulfill({ contentType: 'image/png', body: photo.buffer }));
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile });
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [], totalJobs: 0, totalApplications: 0 });
      if (path.endsWith('/partner/verification/me')) return ok({ id: null, status: null });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/images') && req.method() === 'POST') {
        uploads++;
        uploadEntered?.();
        assert.match(req.headers()['content-type'], /^multipart\/form-data; boundary=/);
        assert.ok(req.postDataBuffer().length > photo.buffer.length, 'image file uploaded as multipart');
        if (holdUpload) await new Promise(resolve => { releaseUpload = resolve; });
        if (uploadFailure) return route.fulfill({ status: 503, json: { message: 'Cloudinary fixture unavailable' } });
        const publicId = `uninet/partner/photo-${uploads}`;
        return ok({ imageUrl: `https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.png`, publicId, format: 'png' });
      }
      if (path.endsWith('/profile/partner') && req.method() === 'PUT') {
        writes++;
        const input = req.postDataJSON();
        assert.equal(input.organizationName, profile.organizationName);
        assert.equal(input.bio, profile.bio);
        assert.deepEqual(input.websites, profile.websites);
        assert.equal(input.contactEmail, profile.contactEmail);
        assert.ok(uploads > 0, 'Cloudinary upload precedes database write');
        if (saveFailure) return route.fulfill({ status: 503, json: { message: 'Database fixture unavailable' } });
        Object.assign(profile, input);
        savedUrls.push({ avatarUrl: profile.avatarUrl, coverUrl: profile.coverUrl });
        return ok(account);
      }
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    const hero = page.getByTestId('company-profile-hero');
    await hero.waitFor();
    const previewSettled = () => page.waitForFunction(() => {
      const dialog = document.querySelector('[data-testid="company-photo-dialog"]');
      if (!dialog) return false;
      for (let element = dialog; element; element = element.parentElement) {
        if (Number(getComputedStyle(element).opacity) < 1) return false;
      }
      return true;
    });
    const choose = async label => {
      const chooser = page.waitForEvent('filechooser');
      await hero.getByRole('button', { name: label, exact: true }).click();
      await (await chooser).setFiles(photo);
      const dialog = page.getByTestId('company-photo-dialog');
      await dialog.getByRole('img', { name: 'Ảnh đã chọn từ máy', exact: true }).waitFor();
      await previewSettled();
      return dialog;
    };
    let dialog = await choose('Chỉnh sửa ảnh đại diện');
    assert.equal(uploads, 0); assert.equal(writes, 0);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(uploads, 0); assert.equal(writes, 0);
    dialog = await choose('Chỉnh sửa ảnh đại diện');
    fs.mkdirSync('dist/partner-photo-upload', { recursive: true });
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await previewSettled();
      const dialogBox = await dialog.boundingBox();
      assert.ok(dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width, 'preview fits screen');
      await page.screenshot({ path: `dist/partner-photo-upload/preview-${width}.png` });
    }
    holdUpload = true;
    const uploadStarted = new Promise(resolve => { uploadEntered = resolve; });
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await uploadStarted;
    assert.equal(uploads, 1); assert.equal(writes, 0);
    assert.equal(await dialog.getByRole('button', { name: 'Hủy', exact: true }).isDisabled(), true);
    releaseUpload(); holdUpload = false;
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(writes, 1);
    const avatarUrl = profile.avatarUrl;
    await hero.getByRole('img', { name: 'Ảnh đại diện đối tác', exact: true }).waitFor();
    assert.ok((await hero.getByRole('img', { name: 'Ảnh đại diện đối tác', exact: true }).getAttribute('src')).includes(avatarUrl));
    assert.ok((await page.getByTestId('company-header').getByRole('img', { name: 'Ảnh đại diện của bạn', exact: true }).getAttribute('src')).includes(avatarUrl), 'header avatar updates without navigation');
    dialog = await choose('Chỉnh sửa ảnh bìa');
    assert.equal(uploads, 1);
    saveFailure = true;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByTestId('action-toast').getByText(/Không thể xử lý hồ sơ đối tác/).waitFor();
    assert.equal(uploads, 2); assert.equal(writes, 2);
    assert.equal(profile.coverUrl, null);
    saveFailure = false;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(uploads, 2, 'DB retry reuses uploaded Cloudinary URL'); assert.equal(writes, 3);
    assert.equal(profile.avatarUrl, avatarUrl, 'cover update preserves avatar');
    await hero.getByRole('img', { name: 'Ảnh bìa đối tác', exact: true }).waitFor();
    dialog = await choose('Chỉnh sửa ảnh đại diện');
    uploadFailure = true;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByTestId('action-toast').getByText(/Không thể xử lý ảnh hoặc tệp đính kèm/).waitFor();
    assert.equal(uploads, 3); assert.equal(writes, 3, 'failed upload never writes DB');
    assert.equal(profile.avatarUrl, avatarUrl);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hero.getByRole('img', { name: 'Ảnh bìa đối tác', exact: true }).waitFor();
    assert.ok((await hero.getByRole('img', { name: 'Ảnh đại diện đối tác', exact: true }).getAttribute('src')).includes(avatarUrl));
    assert.equal(savedUrls.length, 2);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'dist/partner-photo-upload/saved-profile.png' });
    console.log('Partner photos: local preview/cancel, confirm-only multipart upload, DB persistence, immediate avatar/header update, busy guard, upload failure and DB retry passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
