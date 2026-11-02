// All API calls use fixtures; no real accounts or documents are submitted.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(12000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const profile = { id: 'partner-account-profile', fullName: 'SkillSnap company', organizationName: 'SkillSnap company', partnerType: 0, isVerified: false, websites: [] };
    const account = { id: 'partner-account', email: 'partner-account@example.test', role: 1, profileComplete: true, profile };
    let status = { id: null, status: null, rejectReason: null, submittedAt: null }, failStatus = false, submissions = 0, studentReads = 0;
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [] });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/student/verification/me')) { studentReads++; return ok({}); }
      if (path.endsWith('/partner/verification/me')) return failStatus ? route.fulfill({ status: 503, json: { message: 'Không tải được kết quả xác minh.' } }) : ok(status);
      if (path.endsWith('/partner/verification/submit-multiple')) {
        submissions++;
        assert.match(req.headers()['content-type'], /^multipart\/form-data; boundary=/);
        assert.ok(req.postData().includes('https://partner.test/registration.pdf'));
        status = { id: 'partner-request', status: 0, rejectReason: null, submittedAt: '2026-11-01T03:00:00Z' };
        return ok(status);
      }
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.goto(origin + '/settings', { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('button', { name: 'Thông tin tài khoản', exact: true });
    await row.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Xác minh tài khoản', exact: true }).count(), 0);
    await row.click();
    const panel = page.getByTestId('partner-account-panel');
    await panel.getByText('Tài khoản đối tác chưa xác minh', { exact: true }).waitFor();
    await panel.getByText(account.email, { exact: true }).waitFor();
    await panel.getByText('Đối tác', { exact: true }).waitFor();
    const originalUrl = page.url();
    fs.mkdirSync('dist/partner-account-info', { recursive: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 740 });
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 740);
      await page.screenshot({ path: `dist/partner-account-info/unverified-${width}.png`, animations: 'disabled' });
    }
    await panel.getByRole('button', { name: 'Xác minh tài khoản', exact: true }).click();
    const form = page.getByTestId('partner-verification-dialog');
    await form.getByRole('textbox', { name: 'Tên tài liệu *', exact: true }).waitFor();
    assert.equal(page.url(), originalUrl);
    await form.getByRole('button', { name: 'Hủy', exact: true }).click();
    await panel.getByText('Tài khoản đối tác chưa xác minh', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });

    status = { id: 'rejected-request', status: 2, rejectReason: 'Giấy đăng ký đã hết hiệu lực.', submittedAt: '2026-11-01T02:00:00Z' };
    await row.click();
    await panel.getByText(status.rejectReason, { exact: true }).waitFor();
    await panel.getByText('Ngày gửi', { exact: true }).waitFor();
    await page.screenshot({ path: 'dist/partner-account-info/rejected.png', animations: 'disabled' });
    await panel.getByRole('button', { name: 'Cập nhật và gửi lại', exact: true }).click();
    await form.getByRole('textbox', { name: 'Tên tài liệu *', exact: true }).fill('Business registration');
    await form.getByRole('textbox', { name: 'URL HTTPS của tài liệu *', exact: true }).fill('https://partner.test/registration.pdf');
    await form.getByRole('button', { name: 'Gửi hồ sơ xác minh', exact: true }).click();
    await panel.getByText('Yêu cầu xác minh đã được gửi', { exact: true }).waitFor();
    assert.equal(submissions, 1);
    assert.equal(await panel.getByRole('button', { name: 'Cập nhật và gửi lại', exact: true }).count(), 0);
    assert.equal(await panel.getByRole('button', { name: 'Xác minh tài khoản', exact: true }).count(), 0);
    await page.screenshot({ path: 'dist/partner-account-info/pending.png', animations: 'disabled' });
    await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();

    status = { ...status, status: 1, organizationName: 'SkillSnap verified organization', taxCode: '0123456789', representativeName: 'Verified Representative', reviewedAt: '2026-11-01T04:30:00Z' };
    profile.isVerified = true;
    await row.click();
    await panel.getByText('Đã xác minh đối tác', { exact: true }).waitFor();
    await panel.getByText('Thông tin đã được duyệt', { exact: true }).waitFor();
    await panel.getByText('SkillSnap verified organization', { exact: true }).waitFor();
    assert.equal(await panel.getByText('Loại đối tác', { exact: true }).count(), 0);
    await panel.getByText('0123456789', { exact: true }).waitFor();
    await panel.getByText('Verified Representative', { exact: true }).waitFor();
    await panel.getByText('Ngày xác minh', { exact: true }).waitFor();
    assert.equal(await panel.getByRole('button', { name: 'Xác minh tài khoản', exact: true }).count(), 0);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await panel.evaluate(node => node.scrollWidth > node.clientWidth + 1), false, 'reviewed information wraps inside the account popup');
      await panel.getByText('Thông tin đã được duyệt', { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `dist/partner-account-info/approved-${width}.png`, animations: 'disabled' });
    }
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    await page.goto(origin + '/(company)/profile', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('company-profile-hero').getByTestId('company-verified-tick').waitFor();

    failStatus = true;
    await row.click();
    await panel.getByText('Không tải được kết quả xác minh.', { exact: true }).waitFor();
    assert.equal(await panel.getByRole('button', { name: 'Xác minh tài khoản', exact: true }).count(), 0);
    failStatus = false;
    await panel.getByRole('button', { name: 'Thử tải trạng thái lại', exact: true }).click();
    await panel.getByText('Đã xác minh đối tác', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
    status = { ...status, status: 2, rejectReason: 'Vui lòng bổ sung giấy tờ mới.' };
    profile.isVerified = false;
    await row.click();
    await panel.getByText(status.rejectReason, { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Đóng thông tin tài khoản', exact: true }).click();
    await page.getByTestId('company-profile-hero').getByText('Chưa xác minh', { exact: true }).waitFor();
    assert.equal(studentReads, 0, 'partner account never requests student verification');
    assert.deepEqual(errors, []);
    console.log('Partner account information: responsive states, rejection reason, form/cancel/resubmit, pending lock, approved profile sync, status retry and removed Settings row passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
