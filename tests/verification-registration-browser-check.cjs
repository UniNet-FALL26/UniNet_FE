const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.VERIFICATION_TEST_ORIGIN || 'http://localhost:8086';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [], creates = [], holds = [], paymentCreates = [], renewals = [];
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'booking-owner', email: 'booking@example.test', role: 0, profileComplete: true, profile: sample.profile };
    const project = { id: 'registration-fixture', title: 'Ứng dụng quản lý học tập UniStudy', status: 2, isCreator: true, isMember: true, creator: sample.profile, roleRequirements: [], skills: [], members: [] };
    const servicePackage = { id: 'package-only', name: 'Thẩm định dự án với chuyên viên', code: 'VERIFY', type: 0, role: 0, price: 100000, durationInDays: 30, isActive: true };
    let packages = [servicePackage], pending = null;
    const detail = { verification: { id: 'registration-created', status: 0, bookingStatus: 0, reservedUntil: null, scheduledStartAt: null }, assignments: [], payments: [], meetingEndAt: null };
    detail.packageId = servicePackage.id; detail.project = { id: project.id, title: project.title };
    const tomorrow = new Date(Date.now() + 86400000); tomorrow.setUTCHours(3, 0, 0, 0);
    const slots = Array.from({ length: 4 }, (_, index) => ({ startAt: new Date(tomorrow.getTime() + Math.floor(index / 2) * 86400000 + (index % 2) * 3600000).toISOString(), endAt: new Date(tomorrow.getTime() + Math.floor(index / 2) * 86400000 + (index % 2 + 1) * 3600000).toISOString(), remainingCapacity: 1 }));
    let transaction = null, failPaymentCreate = false, renewalReady = false;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok({ ...sample, isOwner: true });
      if (path.endsWith('/packages')) return ok({ packages, totalPages: 1 });
      if (path.endsWith('/packages/' + servicePackage.id)) return ok(servicePackage);
      if (path.endsWith('/projects/' + project.id)) return ok(project);
      if (path.endsWith('/projects/' + project.id + '/verifications')) {
        if (method === 'POST') { creates.push(route.request().postDataJSON()); pending = detail; return ok(detail); }
        return ok({ verifications: pending ? [pending.verification] : [], totalPages: 1 });
      }
      if (path.endsWith('/verifications/' + detail.verification.id)) return ok(detail);
      if (path.endsWith('/meeting-slots')) return ok({ timeZoneId: 'Asia/Ho_Chi_Minh', slots });
      if (path.endsWith('/verifications/' + detail.verification.id + '/meeting') && method === 'PUT') {
        const body = route.request().postDataJSON(); holds.push(body);
        detail.verification = { ...detail.verification, bookingStatus: 1, scheduledStartAt: body.startAt, scheduledEndAt: body.endAt, reservedUntil: new Date(Date.now() + 600000).toISOString() };
        return ok(detail);
      }
      if (path.endsWith('/project-verifications/' + detail.verification.id + '/payments/renew')) {
        renewals.push(route.request().postData());
        if (renewalReady) {
          transaction = { ...transaction, id: 'renewed-payment', expiredAt: new Date(Date.now() + 600000).toISOString(), qrCode: 'RENEWED-BANK-QR' };
          detail.verification.reservedUntil = transaction.expiredAt;
          detail.verification.bookingStatus = 1;
          detail.payments = [{ transactionId: transaction.id, status: 0, requiresManualReview: false }];
        }
        return ok(transaction);
      }
      if (path.endsWith('/project-verifications/' + detail.verification.id + '/payments')) {
        if (method === 'POST') {
          paymentCreates.push(route.request().postData());
          if (failPaymentCreate) return route.fulfill({ status: 503, json: { message: 'Dịch vụ tạo mã tạm thời chưa sẵn sàng.' } });
          transaction = { id: 'payment-fixture', verificationId: detail.verification.id, packageId: servicePackage.id, amountVnd: servicePackage.price, currency: 'VND', status: 0, requiresReview: false, reconciliationRequired: false, expiredAt: detail.verification.reservedUntil, checkoutUrl: 'https://pay.example.test/fixture', qrCode: 'FIXTURE-QR-PAYLOAD' };
          detail.payments = [{ transactionId: transaction.id, status: 0, requiresManualReview: false }];
          return ok(transaction);
        }
        return ok({ transactions: transaction ? [transaction] : [], totalPages: 1 });
      }
      if (transaction && path.endsWith('/payments/' + transaction.id)) return ok(transaction);
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const load = async () => {
      await page.goto(origin + '/group/verification/' + project.id, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Đăng ký thẩm định dự án', exact: true }).waitFor();
      await page.getByText('Đang tải dữ liệu mới nhất…', { exact: true }).waitFor({ state: 'hidden' });
    };
    await load();
    const next = page.getByRole('button', { name: 'Tiếp tục chọn lịch', exact: true });
    assert.equal(await next.isEnabled(), true, 'Only package is selected automatically');
    assert.equal(await page.getByRole('radio').count(), 0, 'Single package is not a redundant choice');
    assert.equal(creates.length, 0, 'No registration or payment on page load');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const summary = page.getByRole('region', { name: 'Tóm tắt đăng ký', exact: true });
      const service = page.getByRole('region', { name: 'Dịch vụ thẩm định', exact: true });
      await summary.getByText(project.title, { exact: true }).waitFor();
      await summary.getByText(servicePackage.name, { exact: true }).waitFor();
      await summary.getByText('100.000 ₫', { exact: true }).waitFor();
      const left = await service.boundingBox(), right = await summary.boundingBox();
      if (width >= 900) assert.ok(right.x > left.x && Math.abs(right.y - left.y) < 2, 'Desktop summary sits beside service');
      else assert.ok(right.y > left.y, 'Narrow summary stacks below service');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const layout = page.getByTestId('verification-registration');
      assert.equal(await layout.evaluate(el => el.scrollWidth > el.clientWidth), false, `Registration fits at ${width}px`);
      const style = await next.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, shadow: getComputedStyle(el).boxShadow }));
      assert.deepEqual(style, { background: 'none', shadow: 'none' }, 'Flat primary button');
      if (width === 375 || width === 1440) await page.screenshot({ path: `C:/Users/minec/UniNet/verification-registration-${width}.png`, animations: 'disabled' });
    }
    packages = []; await load();
    await page.getByText('Dịch vụ thẩm định hiện chưa mở đăng ký.', { exact: true }).waitFor();
    assert.equal(await next.isDisabled(), true);
    packages = [{ ...servicePackage, isActive: false }]; await load();
    assert.equal(await next.isDisabled(), true, 'Inactive package cannot be selected');
    packages = [servicePackage, { ...servicePackage, id: 'second-package', name: 'Gói thứ hai', price: 200000 }]; await load();
    assert.equal(await next.isDisabled(), true, 'Multiple packages still require a choice');
    await page.getByRole('radio', { name: 'Gói thứ hai', exact: true }).click();
    assert.equal(await next.isEnabled(), true);
    packages = [servicePackage]; await load();
    await next.click();
    await page.getByRole('heading', { name: 'Chọn lịch thẩm định', exact: true }).waitFor();
    assert.deepEqual(creates, [{ packageId: servicePackage.id }]);
    await page.reload();
    await page.getByRole('heading', { name: 'Chọn lịch thẩm định', exact: true }).waitFor();
    assert.equal(creates.length, 1, 'Pending registration is resumed without duplicate creation');
    const calendar = page.getByRole('region', { name: 'Lịch hẹn thẩm định', exact: true });
    const status = page.getByRole('region', { name: 'Hồ sơ thẩm định', exact: true });
    const reserve = page.getByRole('button', { name: 'Xác nhận giữ lịch', exact: true });
    await calendar.waitFor();
    assert.equal(await reserve.isDisabled(), true);
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await status.count(), 0, 'No unselected schedule status card');
      assert.equal(await page.getByRole('button', { name: 'Làm mới hồ sơ', exact: true }).count(), 0);
      assert.equal(await page.getByText('Hồ sơ đã sẵn sàng. Tiếp tục chọn lịch xác minh.', { exact: true }).count(), 0);
      assert.equal(await calendar.evaluate(el => el.scrollWidth > el.clientWidth), false, 'Calendar fits');
      await page.getByRole('button', { name: 'Quay lại', exact: true }).last().waitFor();
      assert.ok(await calendar.getByTestId('verification-icon-calendar').count() > 0);
      assert.ok(await calendar.getByTestId('verification-icon-clock').count() > 0);
      if (width === 375 || width === 1440) await page.screenshot({ path: `C:/Users/minec/UniNet/verification-schedule-${width}.png`, animations: 'disabled' });
    }
    await calendar.getByRole('radio', { name: /10:00 – 11:00/ }).click();
    assert.equal(await reserve.isEnabled(), true);
    await reserve.click();
    const checkout = page.getByRole('region', { name: 'Thanh toán thẩm định', exact: true });
    const summary = page.getByRole('region', { name: 'Tóm tắt thanh toán', exact: true });
    const qr = page.getByRole('img', { name: 'Mã QR chuyển khoản thanh toán PayOS', exact: true });
    await qr.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đổi lịch hẹn', exact: true }).isDisabled(), true, 'Pending payment locks schedule changes');
    assert.deepEqual(holds[0], { startAt: slots[0].startAt, endAt: slots[0].endAt });
    assert.equal(paymentCreates.length, 1, 'QR is prepared automatically');
    assert.equal(await page.getByRole('button', { name: 'Tạo mã QR thanh toán', exact: true }).count(), 0);
    await page.reload();
    await qr.waitFor();
    assert.equal(paymentCreates.length, 1, 'Reload reuses the existing transaction');
    assert.deepEqual(paymentCreates, [null], 'Payment creation sends no client amount');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const left = await checkout.boundingBox(), right = await summary.boundingBox();
      if (width >= 900) assert.ok(right.x > left.x && Math.abs(right.y - left.y) < 2);
      else assert.ok(right.y > left.y, 'Payment summary stacks below payment');
      assert.equal(await checkout.evaluate(el => el.scrollWidth > el.clientWidth), false, `Checkout fits at ${width}`);
      const qrBox = await qr.boundingBox(); assert.ok(qrBox.x >= 0 && qrBox.x + qrBox.width <= width);
      const button = page.getByRole('button', { name: 'Mở PayOS', exact: true });
      assert.ok((await button.boundingBox()).height <= 44);
      if (width === 375 || width === 1440) await page.screenshot({ path: `C:/Users/minec/UniNet/verification-checkout-${width}.png`, animations: 'disabled' });
    }
    transaction.status = 1; transaction.paidAt = new Date().toISOString(); detail.verification.bookingStatus = 2;
    detail.payments = [{ transactionId: transaction.id, status: 1, requiresManualReview: false, amount: servicePackage.price }];
    await page.getByRole('button', { name: 'Kiểm tra trạng thái', exact: true }).click();
    await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor();
    await summary.waitFor();
    assert.equal(await qr.count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Mở PayOS', exact: true }).count(), 0);
    transaction.requiresReview = true;
    await page.getByRole('button', { name: 'Kiểm tra trạng thái', exact: true }).click();
    await page.getByRole('heading', { name: 'Thanh toán cần đối soát', exact: true }).waitFor();
    await summary.waitFor();
    assert.equal(await qr.count(), 0);
    transaction.requiresReview = false; transaction.status = 0;
    transaction.expiredAt = new Date(Date.now() - 60000).toISOString();
    detail.verification.reservedUntil = transaction.expiredAt; detail.verification.bookingStatus = 1;
    detail.payments = [{ transactionId: transaction.id, status: 0, requiresManualReview: false }];
    await page.getByRole('button', { name: 'Kiểm tra trạng thái', exact: true }).click();
    await page.getByRole('heading', { name: 'Mã QR đã hết hạn', exact: true }).waitFor();
    assert.equal(await qr.count(), 0, 'Expired payment cannot show a usable QR');
    assert.equal(await page.getByRole('button', { name: 'Mở PayOS', exact: true }).count(), 0);
    assert.equal(paymentCreates.length, 1);
    const recreate = page.getByRole('button', { name: 'Tạo lại mã QR', exact: true });
    await recreate.waitFor(); assert.equal(renewals.length, 0, 'Expiry does not automatically renew');
    await recreate.click();
    await page.getByText('Giao dịch cũ đang được kiểm tra.', { exact: false }).waitFor();
    assert.equal(await qr.count(), 0, 'Unresolved old payment cannot produce another QR');
    renewalReady = true;
    await recreate.click();
    await qr.waitFor();
    assert.deepEqual(renewals, [null, null], 'Renew only on explicit clicks with no client data');
    assert.ok(Date.parse(transaction.expiredAt) > Date.now());
    await page.reload(); await qr.waitFor();
    assert.equal(renewals.length, 2, 'Reload reuses renewed payment');
    transaction = null; detail.payments = []; detail.verification.bookingStatus = 1;
    detail.verification.reservedUntil = new Date(Date.now() + 600000).toISOString();
    failPaymentCreate = true;
    await page.reload();
    const retryQR = page.getByRole('button', { name: 'Tạo mã QR thanh toán', exact: true });
    await retryQR.waitFor();
    await page.getByText(/Không thể tự chuẩn bị mã QR/).waitFor();
    assert.equal(paymentCreates.length, 2, 'One automatic attempt after a failed creation');
    await page.getByRole('button', { name: 'Kiểm tra trạng thái', exact: true }).click();
    await retryQR.waitFor();
    assert.equal(paymentCreates.length, 2, 'State refresh does not automatically retry');
    failPaymentCreate = false;
    await retryQR.click();
    await qr.waitFor();
    assert.equal(paymentCreates.length, 3, 'Manual retry remains available after failure');
    assert.deepEqual(errors, []);
    console.log('Verification flow checks passed: registration, responsive scheduling/checkout, automatic QR, reload without duplicate creation, pending/paid/review/expiry states.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
