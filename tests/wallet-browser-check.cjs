const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.WALLET_TEST_ORIGIN || 'http://127.0.0.1:8087';
const guid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const role of [0, 1, 2]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await context.newPage();
      const errors = []; page.on('pageerror', e => { if (new URL(page.url()).pathname === '/login' && e.message.startsWith('Minified React error #418;')) console.warn('Known static login hydration #418.'); else errors.push(e.message); });
      const profile = { id: guid(2), fullName: 'Wallet User', nickname: 'wallet', displayName: 'Wallet User', organizationName: role === 1 ? 'Wallet Partner' : null, isVerified: false };
      const account = { id: guid(1), email: 'wallet@fixture.test', role, status: 1, profileComplete: true, profile };
      const wallet = { requestKey: guid(10), balance: { balance: '1000', reserved: '0', available: '1000' }, entries: [], withdrawals: [] };
      const attempts = []; let failFirst = true, walletReads = 0;
      await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(v => { if (String(v).includes('"protocol"')) socket.send('{}\x1e'); }));
      await page.route('**/api/**', route => {
        const request = route.request(), path = new URL(request.url()).pathname; const ok = json => route.fulfill({ json });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
        if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresAt: new Date(Date.now() + 3600000).toISOString(), requiresProfileCompletion: false });
        if (path.endsWith('/auth/me')) return ok(account);
        if (path.endsWith('/wallet')) { walletReads++; return ok(wallet); }
        if (path.endsWith('/wallet/withdrawals')) {
          attempts.push(request.postDataJSON());
          if (failFirst) { failFirst = false; return route.fulfill({ status: 503, json: { message: 'Temporary fixture failure' } }); }
          const w = { id: guid(20), amount: '600', bankName: 'Bank', bankAccountNumber: '123456', bankAccountHolder: 'OWNER', state: 0, createdAt: '2026-11-01T00:00:00Z' };
          wallet.withdrawals = [w]; wallet.balance = { balance: '1000', reserved: '600', available: '400' }; wallet.requestKey = guid(11); return ok(w);
        }
        if (path.endsWith('/cancel')) { wallet.withdrawals[0].state = 5; wallet.balance = { balance: '1000', reserved: '0', available: '1000' }; return ok(wallet.withdrawals[0]); }
        if (path.endsWith('/profile/portfolio/me')) return ok({ profile, displayPortfolio: false });
        if (path.endsWith('/profile/me')) return ok({ profile });
        if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [], totalJobs: 0, totalApplications: 0 });
        if (path.endsWith('/partner/verification/me') || path.endsWith('/student/verification/me')) return ok({ id: null, status: null, rejectReason: null, submittedAt: null });
        if (path.endsWith('/notifications/summary')) return ok({ unreadCount: 0, canManage: false });
        return ok([]);
      });
      await page.goto(origin + '/login');
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('login'));
      await page.goto(origin + '/settings');
      await page.getByRole('button', { name: 'Thông tin tài khoản', exact: true }).waitFor();
      if (role !== 2) {
        assert.equal(await page.getByRole('button', { name: 'Ví thu nhập', exact: true }).count(), 0);
        await page.goto(origin + '/wallet');
        await page.getByText('Ví thu nhập chỉ dành cho thẩm định viên.', { exact: true }).waitFor();
        assert.equal(walletReads, 0); assert.deepEqual(errors, []); await context.close();
        console.log((role ? 'Partner' : 'Student') + ' wallet entry removed and direct access denied: OK');
        continue;
      }
      await page.getByRole('button', { name: 'Ví thu nhập', exact: true }).click();
      await page.getByText('Số dư khả dụng', { exact: true }).waitFor();
      await page.getByRole('textbox', { name: 'Số tiền rút', exact: true }).fill('600'); await page.getByRole('textbox', { name: 'Ngân hàng', exact: true }).fill('Bank');
      await page.getByRole('textbox', { name: 'Số tài khoản', exact: true }).fill('123456'); await page.getByRole('textbox', { name: 'Tên chủ tài khoản', exact: true }).fill('OWNER');
      await page.getByRole('button', { name: 'Gửi yêu cầu rút tiền' }).click(); await page.getByRole('button', { name: 'Thử gửi lại yêu cầu' }).click();
      await page.getByRole('button', { name: 'Hủy yêu cầu' }).waitFor(); assert.deepEqual(attempts[0], attempts[1]); assert.equal(attempts[1].amount, '600');
      await page.getByRole('button', { name: 'Hủy yêu cầu' }).click(); await page.getByText('Đã hủy', { exact: true }).waitFor();
      fs.mkdirSync('dist/finance-check', { recursive: true }); await page.screenshot({ path: `dist/finance-check/wallet-role-${role}.png`, fullPage: true });
      await page.goto(origin + '/settings'); await page.getByText('Ví thu nhập', { exact: true }).waitFor();
      assert.deepEqual(errors, []); await context.close(); console.log('Assessor wallet navigation, request retry/idempotency and cancellation: OK');
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
