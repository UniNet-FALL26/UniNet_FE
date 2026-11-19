const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const profile = { id: 'partner-profile', fullName: 'SkillSnap', organizationName: 'SkillSnap', partnerType: 0, industry: 'Phát triển phần mềm', bio: 'Nền tảng nâng cao kỹ năng IT cho sinh viên', contactEmail: 'hello@skillsnap.test', phone: '0968110347', address: 'Phường Long Thạnh Mỹ, TP.HCM', avatarUrl: origin + '/profile-avatar.png', coverUrl: null, websites: ['https://www.facebook.com/LTKDZ', 'https://skillsnap.test/', 'https://www.youtube.com/@SkillSnap', 'https://www.tiktok.com/@skillsnap'], isVerified: false };
    const account = { id: 'partner', email: 'partner@profile.test', role: 1, profileComplete: true, profile };
    const verification = { id: null, status: null, rejectReason: null, submittedAt: null };
    let coverBytes = fs.readFileSync('assets/images/student-starter-cover.png');
    await page.route('**/profile-avatar.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.route('**/account-cover.png*', route => route.fulfill({ contentType: 'image/png', body: coverBytes }));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile });
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [], totalJobs: 0, totalApplications: 0 });
      if (path.endsWith('/partner/verification/me')) return ok(verification);
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.getByText('Chỉnh sửa hồ sơ', { exact: true }).waitFor();
    const hero = page.getByTestId('company-profile-hero');
    fs.mkdirSync('dist/partner-profile-hero', { recursive: true });
    for (const width of [320, 390, 768, 1024, 1199, 1200, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await page.getByTestId('verification-banner').getByText('Xác minh tài khoản đối tác', { exact: true }).waitFor();
      const desktop = width >= 1200;
      if (desktop) {
        const settings = page.getByTestId('company-profile-settings-column');
        await settings.waitFor();
        assert.equal(await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).count(), 0);
        const mainBox = await hero.boundingBox(), settingsBox = await settings.boundingBox();
        assert.ok(settingsBox.x >= mainBox.x + mainBox.width, 'settings card sits to the right of the profile');
        await settings.getByRole('button', { name: 'Thông tin tài khoản', exact: true }).click();
        await page.getByText('Email đăng nhập', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
      } else {
        await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).waitFor();
        assert.equal(await page.getByTestId('company-profile-settings-column').count(), 0);
      }
      await hero.getByRole('img', { name: 'Ảnh bìa mặc định UniNet', exact: true }).waitFor();
      const cover = await page.getByTestId('company-profile-cover').boundingBox();
      assert.ok(cover.height >= 200, 'cover is taller than the old 160px banner');
      assert.equal(await page.getByTestId('company-cover-blur').count(), 1, 'blurred image fills unused cover space');
      const avatar = await page.getByTestId('company-profile-avatar').boundingBox();
      assert.ok(avatar.y < cover.y + cover.height && avatar.y + avatar.height > cover.y + cover.height, 'avatar overlaps cover edge');
      assert.ok(avatar.width >= 76, 'avatar is large enough');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `profile fits ${width}px`);
      if ((await hero.boundingBox()).width >= 900) {
        const boxes = await Promise.all([profile.contactEmail, profile.phone, profile.address].map(text => hero.getByText(text, { exact: true }).boundingBox()));
        assert.ok(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y)) < 6, 'contact details share one row');
      }
      const about = page.getByTestId('company-about-card');
      assert.equal(await hero.getByTestId('company-profile-socials').getByRole('link').count(), 4);
      await hero.getByText('Facebook', { exact: true }).waitFor();
      if (width === 390 || width === 1440) {
        await about.screenshot({ path: `dist/partner-profile-hero/about-${width}.png` });
      }
      await page.screenshot({ path: `dist/partner-profile-hero/default-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/settings');
    await page.getByRole('button', { name: 'Thông tin tài khoản', exact: true }).waitFor();
    await page.goBack();
    await hero.waitFor();
    await page.getByRole('button', { name: 'Chỉnh sửa thông tin tổ chức', exact: true }).click();
    await page.getByText('Tên tổ chức *', { exact: true }).waitFor();
    const editDialog = page.getByTestId('company-profile-edit-dialog');
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[data-testid="company-profile-edit-dialog"]');
      if (!dialog) return false;
      for (let node = dialog; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) return false;
      return true;
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await editDialog.boundingBox();
      assert.ok(box.width <= 600 && box.x >= 16 && box.x + box.width <= width - 16, 'edit dialog remains compact and centered');
      const email = await editDialog.getByRole('textbox', { name: 'Email liên hệ', exact: true }).boundingBox();
      const phone = await editDialog.getByRole('textbox', { name: 'Số điện thoại', exact: true }).boundingBox();
      assert.ok(width >= 600 ? Math.abs(email.y - phone.y) < 4 : phone.y > email.y, 'contact fields adapt to available width');
      await page.screenshot({ path: `dist/partner-profile-hero/edit-dialog-${width}.png` });
    }
    await page.getByText('Hủy', { exact: true }).click();
    await page.getByTestId('company-about-card').getByRole('button', { name: 'Chỉnh sửa phần giới thiệu', exact: true }).click();
    const introDialog = page.getByRole('dialog', { name: 'Chỉnh sửa Giới thiệu', exact: true });
    await introDialog.getByRole('textbox', { name: 'Nội dung giới thiệu', exact: true }).waitFor();
    assert.equal(await introDialog.getByRole('textbox').count(), 1);
    await introDialog.getByRole('button', { name: 'Chọn ảnh giới thiệu', exact: true }).waitFor();
    await introDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    profile.coverUrl = origin + '/account-cover.png';
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await hero.getByRole('img', { name: 'Ảnh bìa đối tác', exact: true }).waitFor();
    assert.equal(await hero.getByRole('img', { name: 'Ảnh bìa mặc định UniNet', exact: true }).count(), 0);
    await hero.getByRole('button', { name: 'Xem ảnh bìa', exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa ảnh', exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await hero.waitFor();
    await page.screenshot({ path: 'dist/partner-profile-hero/account-cover.png' });
    for (const [variant, file] of [['wide', 'assets/images/student-starter-cover.png'], ['portrait', 'assets/images/profile-samples/developer-portrait.png']]) {
      coverBytes = fs.readFileSync(file);
      profile.coverUrl = origin + `/account-cover.png?variant=${variant}#uninet-crop=0.600,-0.300,2.50`;
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const full = hero.getByTestId('company-cover-full-image');
        await full.waitFor();
        const fit = await full.evaluate(node => {
          const image = node.tagName === 'IMG' ? node : node.querySelector('img');
          return image ? getComputedStyle(image).objectFit : getComputedStyle(node).objectFit;
        });
        assert.equal(fit, 'contain', 'whole image remains visible for both orientations');
        const source = await hero.getByRole('img', { name: 'Ảnh bìa đối tác', exact: true }).getAttribute('src');
        assert.ok(source && !source.includes('uninet-crop'), 'legacy crop settings do not crop the full cover');
        await page.screenshot({ path: `dist/partner-profile-hero/full-cover-${variant}-${width}.png` });
      }
    }
    verification.status = 0;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    const banner = page.getByTestId('verification-banner');
    await banner.getByText(/Hồ sơ xác minh tổ chức đang được xét duyệt/).waitFor();
    await banner.getByRole('button', { name: 'Xem trạng thái', exact: true }).click();
    await page.getByTestId('partner-verification-dialog').waitFor();
    assert.equal(new URL(page.url()).pathname, '/profile');
    await page.getByTestId('partner-verification-dialog').getByRole('button', { name: 'Đóng xác minh đối tác', exact: true }).click();
    await banner.waitFor();
    await banner.getByRole('button', { name: 'Đóng thông báo xác minh', exact: true }).click();
    await banner.waitFor({ state: 'hidden' });
    profile.isVerified = true; verification.status = 1;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await hero.waitFor();
    assert.equal(await banner.count(), 0, 'verified partners do not see a verification reminder');
    profile.isVerified = false; verification.status = 2;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await banner.getByText(/Hồ sơ cần bổ sung thông tin/).waitFor();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await page.screenshot({ path: 'dist/partner-profile-hero/verification-banner-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'dist/partner-profile-hero/verification-banner-desktop.png' });
    assert.deepEqual(errors, []);
    console.log('Partner profile hero: fallback/account covers, avatar overlap, desktop contacts, responsive layout, profile editing and cover preview passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
