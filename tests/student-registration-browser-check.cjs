const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.REGISTRATION_TEST_ORIGIN || 'http://127.0.0.1:8106';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  fs.mkdirSync('dist/student-registration-check', { recursive: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } }); const page = await context.newPage(); page.setDefaultTimeout(15000);
      const account = { id: 'registration-fixture', email: 'student@fixture.test', role: 0, profileComplete: true, profile: { id: 'profile-fixture', fullName: 'Nguyễn Mai An', displayName: 'Nguyễn Mai An', nickname: 'maian', organizationName: null, isVerified: false } };
      const response = { account, accessToken: 'registration-fixture-only', refreshToken: 'refresh-fixture-only', expiresAt: '2099-01-01T00:00:00Z', requiresProfileCompletion: false };
      let registrations = 0, logins = 0, currentUserReads = 0, failRegistration = true; const errors = [], hydration = [];
      page.on('pageerror', error => { if (error.message.startsWith('Minified React error #418;')) hydration.push(error.message); else errors.push(error.message); });
      await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(message => { if (String(message).includes('"protocol"')) socket.send('{}\x1e'); }));
      await page.route('**/api/**', route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
        if (path.endsWith('/auth/register/student')) { registrations++; const body = request.postDataJSON(); assert.equal(body.email, account.email); return failRegistration ? route.fulfill({ status: 409, json: { message: 'Email đã tồn tại.' } }) : route.fulfill({ json: response }); }
        if (path.endsWith('/auth/login')) { logins++; return route.fulfill({ json: response }); }
        if (path.endsWith('/auth/me')) { currentUserReads++; return route.fulfill({ json: account }); }
        if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { count: 0 } });
        if (path.endsWith('/notifications')) return route.fulfill({ json: { items: [], unreadCount: 0, total: 0, page: 1 } });
        return route.fulfill({ json: [] });
      });
      try {
        await page.goto(origin + '/register');
        await page.getByRole('textbox', { name: 'Họ và tên *', exact: true }).fill(account.profile.fullName);
        await page.getByRole('textbox', { name: 'Email *', exact: true }).fill(account.email);
        await page.getByRole('textbox', { name: 'Mật khẩu *', exact: true }).fill('Fixture123');
        await page.getByRole('textbox', { name: 'Xác nhận mật khẩu *', exact: true }).fill('Fixture123');
        await page.getByRole('checkbox', { name: 'Đồng ý với điều khoản và chính sách' }).click();
        await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
        await page.getByText('Email đã tồn tại.', { exact: true }).first().waitFor(); assert(new URL(page.url()).pathname.includes('register'));
        failRegistration = false;
        await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
        await page.waitForURL(url => url.pathname.includes('login'));
        await page.getByText('Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.', { exact: true }).waitFor();
        assert.equal(logins, 0); assert.equal(currentUserReads, 0); assert.equal(registrations, 2);
        await page.screenshot({ path: `dist/student-registration-check/success-${width}.png`, fullPage: true });
        await page.goto(origin + '/(tabs)/workspace');
        await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor(); assert(new URL(page.url()).pathname.includes('login'));
        await page.reload(); await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor();
        assert.equal(currentUserReads, 0, 'registration response must not persist a session'); assert.equal(logins, 0);
        await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
        await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('Fixture123');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).waitFor(); assert.equal(logins, 1);
        assert.deepEqual(errors, []);
        if (hydration.length) console.warn('Existing static auth hydration #418 observed at width ' + width + '; checked separately.');
      } catch (error) { await page.screenshot({ path: `dist/student-registration-check/failure-${width}.png`, fullPage: true }); throw error; }
      finally { await context.close(); }
    }
    console.log('PASS: desktop/mobile registration error/retry, success notice, no automatic login, protected route/reload denial and explicit manual login.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
