const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.ASSESSOR_TEST_ORIGIN || 'http://localhost:8081';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let profile = { id: 'profile', fullName: 'Profile Expert', nickname: 'expert', displayName: 'expert', organizationName: null, avatarUrl: null, coverUrl: null,
      bio: 'Existing biography', contactEmail: 'expert@example.test', phone: '0968110347', address: 'HCMC', universityName: 'Legacy University', major: 'Legacy Expertise', isVerified: true, assessorJson: null };
    const account = { id: 'owner', email: 'expert@example.test', role: 2, status: 1, profileComplete: true }; const mutations = []; let failNext = false;
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(value => { if (String(value).includes('"protocol"')) socket.send('{}\x1e'); }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname, ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account: { ...account, profile }, accessToken: 'fixture', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return ok({ ...account, profile });
      if (path.endsWith('/profile/assessor') && request.method() === 'PUT') {
        const body = request.postDataJSON(); mutations.push(body); assert.equal(body.fullName, profile.fullName); assert.equal(body.nickname, profile.nickname);
        if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { message: 'Chưa lưu được thông tin.' } }); }
        profile = { ...profile, ...body }; return ok({ ...account, profile });
      }
      if (path.endsWith('/notifications/summary')) return ok({ unreadCount: 0, canManage: false }); return ok([]);
    });
    await page.goto(origin + '/login');
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(/assessor-community/);
    await page.goto(origin + '/assessor-profile'); await page.getByTestId('assessor-profile-cards').waitFor();
    const open = async (section, title, count) => {
      await page.getByTestId('assessor-card-' + section).getByRole('button', { name: 'Chỉnh sửa ' + title, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa ' + title, exact: true }); await dialog.waitFor(); assert.equal(await dialog.getByRole('textbox').count(), count);
      for (const name of ['Họ và tên', 'Biệt danh']) assert.equal(await dialog.getByRole('textbox', { name, exact: true }).count(), 0); return dialog;
    };
    const fill = async (dialog, values) => { for (const [name, value] of Object.entries(values)) await dialog.getByRole('textbox', { name, exact: true }).fill(value); };
    const save = async dialog => { await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); };
    let dialog = await open('work', 'Công việc & chuyên môn', 4);
    await fill(dialog, { 'Chức danh nghề nghiệp': 'Senior Engineer', 'Công ty đang làm việc': 'Expert Company', 'Số năm kinh nghiệm': '7', 'Các lĩnh vực chuyên môn': 'Backend, Cloud' });
    failNext = true; await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.getByRole('textbox', { name: 'Chức danh nghề nghiệp', exact: true }).inputValue(), 'Senior Engineer'); await save(dialog);
    assert.equal(profile.assessorJson.yearsOfExperience, 7); assert.deepEqual(profile.assessorJson.expertise, ['Backend', 'Cloud']);
    dialog = await open('education', 'Học vấn', 2); await fill(dialog, { 'Trình độ học vấn cao nhất': 'Master', 'Trường đại học đã theo học': 'Expert University' }); await save(dialog);
    assert.equal(profile.assessorJson.jobTitle, 'Senior Engineer');
    dialog = await open('links', 'Liên kết', 3); await fill(dialog, { LinkedIn: 'https://www.linkedin.com/in/expert', GitHub: 'https://github.com/expert', 'Website / Portfolio': 'https://expert.test' });
    profile.phone = '0901234567'; await save(dialog); assert.equal(profile.phone, '0901234567', 'merge the latest profile rather than overwriting another group');
    assert.equal(profile.assessorJson.education, 'Master'); assert.equal(profile.assessorJson.jobTitle, 'Senior Engineer');
    const links = page.getByTestId('assessor-card-links');
    for (const label of ['LinkedIn', 'GitHub', 'Website / Portfolio']) await links.getByText(label, { exact: true }).waitFor();
    for (const value of ['https://www.linkedin.com/in/expert', 'https://github.com/expert', 'https://expert.test']) assert.equal(await links.getByText(value, { exact: true }).count(), 0);
    assert.equal(await links.getByTestId('assessor-brand-gitHubUrl').count(), 1); assert.equal(await links.getByTestId('assessor-brand-linkedInUrl').count(), 1);
    await page.context().route('https://github.com/expert', route => route.fulfill({ body: 'Fixture GitHub target' }));
    const popup = page.waitForEvent('popup'); await links.getByRole('link', { name: 'Mở GitHub', exact: true }).click(); const target = await popup;
    await target.waitForURL('https://github.com/expert'); await target.close();
    fs.mkdirSync('dist/assessor-profile-cards', { recursive: true });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await page.getByTestId('assessor-card-contact').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      const grid = await page.getByTestId('assessor-profile-cards').boundingBox(), contact = await page.getByTestId('assessor-card-contact').boundingBox(), job = await page.getByTestId('assessor-card-work').boundingBox();
      if (grid.width >= 700) assert.ok(Math.abs(contact.y - job.y) < 2 && job.x > contact.x); else assert.ok(job.y > contact.y && Math.abs(contact.x - job.x) < 2);
      await page.screenshot({ path: `dist/assessor-profile-cards/layout-${width}.png` }); await links.screenshot({ path: `dist/assessor-profile-cards/links-${width}.png` });
    }
    dialog = await open('work', 'Công việc & chuyên môn', 4); await dialog.getByRole('textbox', { name: 'Số năm kinh nghiệm', exact: true }).fill('-1');
    const before = mutations.length; await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await dialog.getByRole('alert').waitFor(); assert.equal(mutations.length, before); await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    dialog = await open('contact', 'Liên hệ', 3); await fill(dialog, { 'Email liên hệ': 'new@example.test', 'Điện thoại': '0987654321', 'Địa chỉ': 'Ha Noi' }); await save(dialog); assert.equal(profile.assessorJson.gitHubUrl, 'https://github.com/expert');
    dialog = await open('bio', 'Giới thiệu', 1); await fill(dialog, { 'Giới thiệu bản thân': 'New biography' }); await save(dialog); assert.equal(profile.bio, 'New biography');
    await page.reload(); await page.getByText('Senior Engineer', { exact: true }).waitFor();
    const clear = async (section, title, count, fail = false) => {
      const d = await open(section, title, count); await d.getByRole('button', { name: 'Xóa thông tin ' + title, exact: true }).click();
      if (fail) { failNext = true; await d.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await d.getByRole('alert').waitFor(); assert.equal(profile.assessorJson.gitHubUrl, 'https://github.com/expert'); }
      await d.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await d.waitFor({ state: 'hidden' });
    };
    await clear('links', 'Liên kết', 3, true); assert.equal(profile.assessorJson.gitHubUrl, null); assert.equal(profile.assessorJson.jobTitle, 'Senior Engineer');
    await clear('education', 'Học vấn', 2); assert.equal(profile.assessorJson.education, null); assert.equal(profile.assessorJson.yearsOfExperience, 7);
    await clear('work', 'Công việc & chuyên môn', 4); assert.equal(profile.assessorJson, null); assert.equal(profile.contactEmail, 'new@example.test');
    await clear('bio', 'Giới thiệu', 1); assert.equal(profile.bio, null); assert.equal(profile.phone, '0987654321');
    await clear('contact', 'Liên hệ', 3); assert.equal(profile.contactEmail, null); assert.equal(profile.phone, null); assert.equal(profile.address, null); assert.equal(profile.fullName, 'Profile Expert');
    await page.reload(); await page.getByTestId('assessor-profile-cards').waitFor(); assert.equal(await page.getByText('Legacy Expertise', { exact: true }).count(), 0);
    assert.deepEqual(errors, []); console.log('Assessor cards: five isolated CRUD popups, all nine fields, latest-profile preservation, clear/failure/retry, named brand links, targets and responsive columns passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
