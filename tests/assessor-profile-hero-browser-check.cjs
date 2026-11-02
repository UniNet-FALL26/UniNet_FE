const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.ASSESSOR_TEST_ORIGIN || 'http://localhost:8081';
const file = { name: 'profile.png', mimeType: 'image/png', buffer: fs.readFileSync('assets/images/uninet-mark.png') };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let profile = { id: 'profile', fullName: 'Nguyễn Văn An', nickname: 'different-nickname', displayName: 'different-nickname', avatarUrl: null, coverUrl: null,
      bio: 'Biography retained', contactEmail: 'expert@example.test', phone: '0968110347', address: 'HCMC', isVerified: true,
      assessorJson: { jobTitle: 'Engineer', companyName: 'Company', yearsOfExperience: 5, expertise: ['Backend'], education: 'Master', university: 'University', linkedInUrl: null, gitHubUrl: null, portfolioUrl: null } };
    const account = { id: 'owner', email: 'expert@example.test', role: 2, status: 1, profileComplete: true };
    let uploads = 0, writes = 0, failSave = false, failUpload = false;
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(value => { if (String(value).includes('"protocol"')) socket.send('{}\x1e'); }));
    await page.route('https://res.cloudinary.com/fixture/**', route => route.fulfill({ contentType: 'image/png', body: file.buffer }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname; const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account: { ...account, profile }, accessToken: 'fixture', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return ok({ ...account, profile });
      if (path.endsWith('/images') && request.method() === 'POST') {
        uploads++; assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
        if (failUpload) return route.fulfill({ status: 503, json: { message: 'Upload fixture failed' } });
        const publicId = `uninet/assessor/photo-${uploads}`;
        return ok({ imageUrl: `https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.png`, publicId, format: 'png' });
      }
      if (path.endsWith('/profile/assessor') && request.method() === 'PUT') {
        writes++; const input = request.postDataJSON(); assert.ok([profile.fullName, 'Nguyễn Văn An Updated'].includes(input.fullName)); assert.equal(input.nickname, profile.nickname);
        assert.equal(input.bio, profile.bio); assert.equal(input.phone, profile.phone); assert.deepEqual(input.assessorJson, profile.assessorJson);
        if (failSave) return route.fulfill({ status: 503, json: { message: 'Chưa lưu được hồ sơ.' } });
        profile = { ...profile, ...input }; return ok({ ...account, profile });
      }
      if (path.endsWith('/notifications/summary')) return ok({ unreadCount: 0, canManage: false });
      return ok([]);
    });
    await page.goto(origin + '/login');
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(/assessor-community/);
    await page.goto(origin + '/assessor-profile'); const hero = page.getByTestId('assessor-profile-hero');
    await hero.getByRole('button', { name: 'Chỉnh sửa ảnh bìa', exact: true }).waitFor();
    assert.equal(await hero.getByRole('heading', { name: profile.fullName, exact: true }).count(), 1);
    assert.equal(await hero.getByText('@' + profile.nickname, { exact: true }).count(), 0);
    assert.equal(await hero.getByText('Chuyên gia thẩm định', { exact: true }).count(), 0);
    assert.equal(await hero.getByText(profile.contactEmail, { exact: true }).count(), 0);
    await hero.getByTestId('assessor-profile-verified').waitFor();
    await hero.getByRole('button', { name: 'Chỉnh sửa hồ sơ thẩm định viên', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Chỉnh sửa họ tên', exact: true }); await editor.waitFor();
    assert.equal(await editor.getByRole('textbox').count(), 1, 'hero editor only edits the full name');
    fs.mkdirSync('dist/assessor-profile-hero', { recursive: true });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Chỉnh sửa họ tên"]');
      if (!dialog) return false;
      for (let element = dialog; element; element = element.parentElement) if (Number(getComputedStyle(element).opacity) < 1) return false;
      return true;
    });
    await editor.screenshot({ path: 'dist/assessor-profile-hero/name-editor.png' });
    await editor.getByRole('textbox', { name: 'Họ và tên', exact: true }).fill(' ');
    await editor.getByRole('button', { name: 'Lưu họ tên', exact: true }).click(); await editor.getByRole('alert').waitFor(); assert.equal(writes, 0);
    await editor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await hero.getByRole('button', { name: 'Chỉnh sửa hồ sơ thẩm định viên', exact: true }).click();
    await editor.getByRole('textbox', { name: 'Họ và tên', exact: true }).fill('Nguyễn Văn An Updated'); failSave = true;
    await editor.getByRole('button', { name: 'Lưu họ tên', exact: true }).click(); await editor.getByRole('alert').waitFor();
    assert.equal(profile.fullName, 'Nguyễn Văn An'); failSave = false;
    await editor.getByRole('button', { name: 'Lưu họ tên', exact: true }).click(); await editor.waitFor({ state: 'hidden' });
    assert.equal(profile.fullName, 'Nguyễn Văn An Updated'); await hero.getByRole('heading', { name: profile.fullName, exact: true }).waitFor();
    const nameWrites = writes;
    const choose = async label => {
      const picker = page.waitForEvent('filechooser'); await hero.getByRole('button', { name: label, exact: true }).click();
      await (await picker).setFiles(file); const dialog = page.getByTestId('company-photo-dialog'); await dialog.waitFor(); return dialog;
    };
    let dialog = await choose('Chỉnh sửa ảnh đại diện'); assert.equal(uploads, 0); assert.equal(writes, nameWrites);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(uploads, 0);
    dialog = await choose('Chỉnh sửa ảnh đại diện'); await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(uploads, 1); assert.equal(writes, nameWrites + 1); const avatarUrl = profile.avatarUrl;
    assert.ok((await hero.getByRole('img', { name: 'Ảnh đại diện của bạn', exact: true }).getAttribute('src')).includes(avatarUrl));
    dialog = await choose('Chỉnh sửa ảnh bìa'); failSave = true;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByTestId('action-toast').getByText('Chưa lưu được hồ sơ.', { exact: true }).waitFor();
    assert.equal(uploads, 2); assert.equal(writes, nameWrites + 2); failSave = false;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(uploads, 2); assert.equal(writes, nameWrites + 3); assert.equal(profile.avatarUrl, avatarUrl);
    dialog = await choose('Chỉnh sửa ảnh đại diện'); failUpload = true;
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByTestId('action-toast').getByText(/Không thể xử lý ảnh/).waitFor();
    assert.equal(writes, nameWrites + 3); await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.reload(); await hero.getByRole('img', { name: 'Ảnh đại diện của bạn', exact: true }).waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await hero.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      const cover = await hero.getByTestId('assessor-profile-cover').boundingBox(), avatar = await hero.getByTestId('assessor-profile-avatar').boundingBox();
      assert.ok(Math.abs(avatar.y + avatar.height / 2 - cover.y - cover.height) < 2);
      const name = await hero.getByRole('heading', { name: profile.fullName, exact: true }).boundingBox(), tick = await hero.getByTestId('assessor-profile-verified').boundingBox();
      assert.ok(tick.x >= name.x + name.width - 1); fs.mkdirSync('dist/assessor-profile-hero', { recursive: true });
      await hero.screenshot({ path: `dist/assessor-profile-hero/hero-${width}.png` });
    }
    profile.isVerified = false; await page.reload(); await hero.getByRole('heading', { name: profile.fullName, exact: true }).waitFor();
    assert.equal(await hero.getByTestId('assessor-profile-verified').count(), 0); assert.deepEqual(errors, []);
    console.log('Assessor hero: full name/verification only, edit actions, photo preview/cancel/upload/retry/persistence, retained profile data and responsive overlap passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
