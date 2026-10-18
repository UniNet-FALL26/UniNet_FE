// Local browser integration only: every API request is intercepted; no real accounts or documents.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const output = 'dist/student-verification';
const emptyVerification = () => ({ id: null, status: null, isVerified: false, fullName: null, schoolName: null, studentCode: null, submittedAt: null, reviewedAt: null, rejectReason: null, documentName: null });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF');

async function login(page, email) {
  if (!new URL(page.url()).pathname.includes('/login')) await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('verification-browser-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'));
}
async function settings(page) {
  await page.evaluate(() => { history.pushState({}, '', '/settings'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.getByRole('button', { name: 'Thông tin tài khoản', exact: true }).waitFor();
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
const dialog = page => page.getByRole('dialog').last();
const field = (page, name) => dialog(page).getByRole('textbox', { name, exact: true });
async function assertVisible(locator) { await locator.first().waitFor({ state: 'visible' }); }
async function chooseDocument(page, file) { await page.getByLabel('Giấy tờ xác minh', { exact: true }).setInputFiles(file); }
async function assertFits(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `page fits ${width}px`);
  const panel = page.getByTestId('student-verification-panel');
  const bounds = await panel.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `dialog fits ${width}px`);
  assert.ok(bounds.y >= -1 && bounds.y + bounds.height <= 957, 'dialog fits viewport vertically');
  assert.equal(await panel.evaluate(node => node.scrollWidth > node.clientWidth + 1), false, 'dialog has no horizontal overflow');
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let activePage;
  try {
    const context = await browser.newContext({ viewport: { width: 440, height: 956 }, serviceWorkers: 'block' });
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(12000);
    const account = { id: 'verification-browser-student', email: 'verification@example.test', role: 0, profileComplete: true, profile: { id: 'verification-browser-profile', displayName: 'KiDe', fullName: 'Trịnh Trọng Quyền', nickname: 'KiDe', isVerified: false } };
    const portfolio = { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile } };
    let verification = emptyVerification(); let reads = 0; let submissions = 0; let failSubmission = false; let expire = false; let releaseSubmission;
    const notice = { id: 'verification-notification', userVerificationId: 'request-3', message: 'Tài khoản sinh viên của bạn đã được xác minh.', createdAt: '2026-10-18T03:00:00Z' };
    const errors = []; const apiPaths = []; const payloads = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.includes('/api/')) apiPaths.push(path);
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'verification-test-access', refreshToken: 'verification-test-refresh', requiresProfileCompletion: false } });
      if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: { message: 'Phiên đăng nhập đã hết hạn.' } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: portfolio });
      if (path.endsWith('/verification-notifications')) return route.fulfill({ json: [notice] });
      if (path.endsWith('/student/verification/me')) {
        reads++;
        return route.fulfill(expire ? { status: 401, json: { message: 'Phiên đăng nhập đã hết hạn.' } } : { json: verification });
      }
      if (path.endsWith('/student/verification') && req.method() === 'POST') {
        submissions++; payloads.push({ contentType: req.headers()['content-type'], body: req.postDataBuffer().toString('utf8') });
        if (failSubmission) return route.fulfill({ status: 400, json: { message: 'Giấy tờ chưa đọc được. Vui lòng thử lại.' } });
        await new Promise(resolve => { releaseSubmission = resolve; });
        verification = { id: `request-${submissions}`, status: 0, isVerified: false, fullName: submissions === 3 ? 'Trịnh Trọng Quyền cập nhật' : 'Trịnh Trọng Quyền', schoolName: 'Đại học Bách khoa', studentCode: 'SV-2026001', documentName: submissions === 3 ? 'confirmation.pdf' : 'student.png', submittedAt: '2026-10-17T03:00:00Z', reviewedAt: null, rejectReason: null };
        return route.fulfill({ json: verification });
      }
      if (path.includes('/api/')) return route.fulfill({ json: [] });
      // Local app assets may load; all third-party traffic stays isolated from the network.
      if (url.origin !== origin) return route.fulfill({ status: 204 });
      return route.continue();
    });
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await login(page, account.email); await settings(page);
    const accountRow = button(page, 'Thông tin tài khoản');
    await assertVisible(accountRow.getByText('Chưa xác minh', { exact: true }));
    await accountRow.click();
    await assertVisible(dialog(page).getByText('Tài khoản chưa xác minh sinh viên', { exact: true }));
    await assertVisible(dialog(page).getByText(account.email, { exact: true }));
    const urlBefore = page.url();
    for (const width of [320, 440, 1440]) {
      await page.setViewportSize({ width, height: 956 }); await assertFits(page, width);
      await page.screenshot({ path: `${output}/unverified-${width}.png`, animations: 'disabled' });
      await button(page, 'Xác minh tài khoản').click();
      await assertVisible(dialog(page).getByRole('heading', { name: 'Xác minh sinh viên', exact: true }));
      assert.equal(page.url(), urlBefore, 'verification stays on settings without navigation');
      await assertFits(page, width);
      await page.screenshot({ path: `${output}/form-${width}.png`, animations: 'disabled' });
      await button(page, 'Hủy').click();
      await assertVisible(dialog(page).getByRole('heading', { name: 'Thông tin tài khoản', exact: true }));
    }
    await page.setViewportSize({ width: 440, height: 956 });
    await button(page, 'Xác minh tài khoản').click();
    await button(page, 'Đóng xác minh sinh viên').click();
    await assertVisible(dialog(page).getByRole('heading', { name: 'Thông tin tài khoản', exact: true }));
    await button(page, 'Đóng thông tin tài khoản').click();
    await dialog(page).waitFor({ state: 'hidden' });
    await accountRow.click(); await button(page, 'Xác minh tài khoản').click();
    assert.equal(await field(page, 'Họ và tên').evaluate(node => node === document.activeElement), true, 'form focuses first field');
    await page.keyboard.press('Tab');
    assert.equal(await field(page, 'Trường đại học / cao đẳng').evaluate(node => node === document.activeElement), true, 'keyboard advances through form');
    await page.keyboard.press('Escape');
    await assertVisible(dialog(page).getByRole('heading', { name: 'Thông tin tài khoản', exact: true }));
    await button(page, 'Xác minh tài khoản').click();
    await field(page, 'Họ và tên').fill('');
    await field(page, 'Trường đại học / cao đẳng').fill('');
    await button(page, 'Gửi yêu cầu xác minh').click();
    await assertVisible(dialog(page).getByRole('alert'));
    assert.equal(await dialog(page).getByRole('alert').count(), 4, 'each required field reports an accessible error');
    assert.equal(submissions, 0, 'required validation blocks requests');
    await chooseDocument(page, { name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid document') });
    await assertVisible(dialog(page).getByRole('alert').filter({ hasText: /JPG|PNG|PDF/ }));
    assert.equal(submissions, 0);
    await chooseDocument(page, { name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await assertVisible(dialog(page).getByRole('alert').filter({ hasText: /5\s*MB/ }));
    assert.equal(submissions, 0);
    await field(page, 'Họ và tên').fill('Trịnh Trọng Quyền');
    await field(page, 'Trường đại học / cao đẳng').fill('Đại học Bách khoa');
    await field(page, 'Mã số sinh viên').fill('bad<script>');
    await chooseDocument(page, { name: 'student.png', mimeType: 'image/png', buffer: png });
    await assertVisible(dialog(page).getByRole('img', { name: 'Xem trước giấy tờ đã chọn', exact: true }));
    await button(page, 'Xóa giấy tờ').click();
    assert.equal(await dialog(page).getByText('student.png', { exact: true }).count(), 0);
    await chooseDocument(page, { name: 'student.png', mimeType: 'image/png', buffer: png });
    await button(page, 'Gửi yêu cầu xác minh').click();
    assert.equal(submissions, 0, 'invalid student code blocks submission');
    await field(page, 'Mã số sinh viên').fill('SV-2026001');
    failSubmission = true;
    await button(page, 'Gửi yêu cầu xác minh').click();
    await assertVisible(dialog(page).getByText('Giấy tờ chưa đọc được. Vui lòng thử lại.', { exact: true }));
    assert.equal(await field(page, 'Họ và tên').inputValue(), 'Trịnh Trọng Quyền');
    assert.equal(await field(page, 'Trường đại học / cao đẳng').inputValue(), 'Đại học Bách khoa');
    assert.equal(await field(page, 'Mã số sinh viên').inputValue(), 'SV-2026001');
    await assertVisible(dialog(page).getByText('student.png', { exact: true }));
    failSubmission = false;
    const beforeSubmitReads = reads;
    await button(page, 'Gửi yêu cầu xác minh').click();
    await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')].some(node => node.getAttribute('aria-disabled') === 'true' && /Gửi|Đang gửi/.test(node.textContent)));
    assert.equal(submissions, 2);
    assert.ok(releaseSubmission, 'mock holds upload to observe duplicate-submit guard');
    releaseSubmission();
    await assertVisible(dialog(page).getByText('Yêu cầu xác minh đã được gửi', { exact: true }));
    assert.ok(reads > beforeSubmitReads, 'success refetches authoritative status');
    await assertVisible(dialog(page).getByText('Đại học Bách khoa', { exact: true }));
    assert.equal(await button(page, 'Xác minh tài khoản').count(), 0, 'pending has no resubmit CTA');
    assert.equal(await button(page, 'Đóng').count(), 0, 'overview has no bottom close button');
    assert.equal(await dialog(page).getByRole('img').count(), 0, 'sensitive document hidden in overview');
    for (const width of [320, 440, 1440]) {
      await page.setViewportSize({ width, height: 956 }); await assertFits(page, width);
      await page.screenshot({ path: `${output}/pending-${width}.png`, animations: 'disabled' });
    }
    await button(page, 'Đóng thông tin tài khoản').click();
    await assertVisible(accountRow.getByText('Đang xét duyệt', { exact: true }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertVisible(button(page, 'Đăng nhập'));
    assert.equal(await button(page, 'Thông tin tài khoản').count(), 0, 'reload respects memory-only login policy');
    await login(page, account.email); await settings(page);
    await assertVisible(accountRow.getByText('Đang xét duyệt', { exact: true }));
    await accountRow.click();
    await assertVisible(dialog(page).getByText('SV-2026001', { exact: true }));
    assert.equal(submissions, 2, 'reopening/reloading pending does not create another request');
    await button(page, 'Đóng thông tin tài khoản').click();

    // Server review changes are read on reopening, as on returning to the settings page.
    verification = { ...verification, status: 1, isVerified: true, reviewedAt: '2026-10-18T03:00:00Z' };
    await accountRow.click();
    await assertVisible(dialog(page).getByText('Đã xác minh sinh viên', { exact: true }));
    assert.equal(await button(page, 'Xác minh tài khoản').count(), 0);
    await page.screenshot({ path: `${output}/approved.png`, animations: 'disabled' });
    await button(page, 'Đóng thông tin tài khoản').click();
    await assertVisible(accountRow.getByText('Đã xác minh', { exact: true }));
    verification = { ...verification, status: 2, isVerified: false, rejectReason: 'Ảnh mờ, vui lòng gửi giấy xác nhận đang học.' };
    await accountRow.click();
    await assertVisible(dialog(page).getByText(verification.rejectReason, { exact: true }));
    await page.screenshot({ path: `${output}/rejected.png`, animations: 'disabled' });
    await button(page, 'Cập nhật và gửi lại').click();
    assert.equal(await field(page, 'Họ và tên').inputValue(), verification.fullName);
    assert.equal(await field(page, 'Trường đại học / cao đẳng').inputValue(), verification.schoolName);
    assert.equal(await field(page, 'Mã số sinh viên').inputValue(), verification.studentCode);
    await field(page, 'Họ và tên').fill('Trịnh Trọng Quyền cập nhật');
    await chooseDocument(page, { name: 'confirmation.pdf', mimeType: 'application/pdf', buffer: pdf });
    await assertVisible(dialog(page).getByText('confirmation.pdf', { exact: true }));
    const resubmitRequest = page.waitForRequest(request => request.url().endsWith('/student/verification') && request.method() === 'POST');
    await button(page, 'Gửi yêu cầu xác minh').click(); await resubmitRequest;
    assert.equal(submissions, 3); releaseSubmission();
    await assertVisible(dialog(page).getByText('Yêu cầu xác minh đã được gửi', { exact: true }));
    await assertVisible(dialog(page).getByText('Trịnh Trọng Quyền cập nhật', { exact: true }));
    for (const payload of payloads) {
      assert.match(payload.contentType, /^multipart\/form-data; boundary=/);
      for (const key of ['fullName', 'schoolName', 'studentCode', 'document']) assert.ok(payload.body.includes(`name="${key}"`), `multipart field ${key}`);
      assert.ok(!payload.body.includes('name="userId"'), 'ownership never posted from client');
    }
    await button(page, 'Đóng thông tin tài khoản').click();
    verification = { ...verification, status: 1, isVerified: true, reviewedAt: '2026-10-18T03:00:00Z' };
    await page.evaluate(() => { history.pushState({}, '', '/notifications'); dispatchEvent(new PopStateEvent('popstate')); });
    await button(page, notice.message).click();
    await assertVisible(dialog(page).getByText('Đã xác minh sinh viên', { exact: true }));
    assert.equal(new URL(page.url()).pathname, '/settings', 'review notification opens account details');
    await button(page, 'Đóng thông tin tài khoản').click();
    expire = true; await accountRow.click();
    await assertVisible(button(page, 'Đăng nhập'));
    await assertVisible(page.getByText('Đăng nhập để quản lý tài khoản và hồ sơ của bạn.', { exact: true }));
    assert.equal(await button(page, 'Xác minh tài khoản').count(), 0, 'expired fetch cannot offer an unverified fallback');
    await page.close();

    // Other roles retain their existing account information, without Student requests or form.
    for (const role of [1, 2]) {
      expire = false; account.role = role;
      const other = await context.newPage(); activePage = other; other.setDefaultTimeout(12000);
      const readsBefore = reads;
      await other.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await login(other, account.email); await settings(other);
      await button(other, 'Thông tin tài khoản').click();
      await assertVisible(dialog(other).getByText(role === 1 ? 'Đối tác' : 'Quản trị viên', { exact: true }));
      assert.equal(await dialog(other).getByRole('button', { name: 'Xác minh tài khoản', exact: true }).count(), 0);
      assert.equal(reads, readsBefore, 'non-Student account does not request Student verification');
      await other.close();
    }
    assert.deepEqual(errors, []);
    assert.ok(apiPaths.every(path => !path.includes('/document')), 'overview never requests sensitive document');
    console.log('PASS: Student verification states, validation, document preview/remove, keyboard/cancel/close, multipart upload, failure retention, resubmission, reload/login persistence, review notification, expired session, other roles and 320/440/1440 layouts (mock API only).');
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: `${output}/failure.png`, animations: 'disabled' }).catch(() => {});
      fs.writeFileSync(`${output}/failure.txt`, await activePage.locator('body').innerText().catch(() => 'Page unavailable'));
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
