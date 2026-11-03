// Local navigation fixtures only; no messages, campaigns or user data are written.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const labels = ['Cộng đồng', 'Nhắn tin', 'Tuyển dụng', 'Thông báo', 'Hồ sơ'];

async function login(page, role = 1) {
  const profile = { id: `nav-profile-${role}`, fullName: 'Navigation Partner', organizationName: 'Navigation Partner', isVerified: true, websites: [], partnerType: 0 };
  const account = { id: `nav-account-${role}`, email: `navigation-${role}@example.test`, role, profileComplete: true, profile };
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const ok = json => route.fulfill({ json });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
    if (path.endsWith('/auth/me')) return ok(account);
    if (path.endsWith('/profile/me')) return ok({ profile });
    if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [], totalJobs: 0, publishedJobs: 0, draftJobs: 0, closedJobs: 0, expiringJobs: 0, totalApplications: 0, pendingApplications: 0, viewedApplications: 0, interviewApplications: 0, acceptedApplications: 0, rejectedApplications: 0 });
    if (path.endsWith('/partner/jobs')) return ok({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0, totalJobs: 0, publishedJobs: 0, draftJobs: 0, closingSoonJobs: 0, jobs: [] });
    if (path.endsWith('/partner/verification/me')) return ok({ id: 'nav-verification', status: 1, rejectReason: null, submittedAt: null });
    if (path.endsWith('/community/posts')) return ok({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0, data: [] });
    if (path.endsWith('/notifications/unread-count')) return ok({ count: 3 });
    if (path.endsWith('/notifications')) return ok({ page: 1, pageSize: 20, total: 0, unreadCount: 3, items: [] });
    if (path.endsWith('/notifications/category-counts')) return ok([]);
    if (path.endsWith('/packages')) return ok({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0, packages: [] });
    return ok([]);
  });
  await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'));
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await login(page);
    const footer = page.getByRole('tablist').and(page.getByTestId('company-footer-navigation'));
    await footer.waitFor();
    assert.deepEqual(await footer.getByRole('tab').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), labels);
    const student = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await login(student, 0);
    const studentFooter = student.getByTestId('mobile-app-footer');
    await studentFooter.waitFor();
    const referenceHeight = (await studentFooter.boundingBox()).height;
    await student.close();
    fs.mkdirSync('dist/partner-navigation', { recursive: true });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const bounds = await footer.boundingBox();
      assert.equal(bounds.height, referenceHeight, 'Partner footer matches Student footer height');
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      for (const label of labels) {
        const text = footer.getByRole('tab', { name: label, exact: true }).getByText(label, { exact: true });
        await text.waitFor();
        assert.equal(await text.evaluate(node => getComputedStyle(node).fontSize), '10px');
      }
      await footer.getByTestId('company-footer-unread-badge').getByText('3', { exact: true }).waitFor();
      assert.equal(await footer.getByRole('tab', { name: 'Quảng cáo', exact: true }).count(), 0);
      assert.equal(await footer.getByRole('tab', { name: 'Tổng quan', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/partner-navigation/footer-${width}.png`, animations: 'disabled' });
    }
    const paths = ['/company-community', '/company-messages', '/jobs', '/company-notifications', '/profile'];
    for (let index = 0; index < labels.length; index++) {
      const tab = footer.getByRole('tab', { name: labels[index], exact: true });
      await tab.click();
      await page.waitForURL(url => url.pathname === paths[index]);
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      await footer.waitFor();
      if (index === 1) await page.getByText('Các cuộc trò chuyện của bạn sẽ xuất hiện tại đây.', { exact: true }).waitFor();
      if (index === 3) await page.getByTestId('notifications-page').waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('company-profile-settings-action').click();
    await page.getByRole('button', { name: 'Quảng cáo', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/advertisement');
    await footer.waitFor();
    await footer.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const header = page.getByTestId('company-header').last();
      await header.waitFor();
      await footer.waitFor({ state: 'hidden' });
      assert.deepEqual(await page.getByTestId('company-header-navigation').getByRole('tab').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), labels.slice(0, 3));
      assert.equal(await header.getByRole('button', { name: 'Thông báo', exact: true }).count(), 1);
      assert.equal(await header.getByRole('tab', { name: 'Hồ sơ', exact: true }).count(), 1);
      assert.equal(await header.getByText('Quảng cáo', { exact: true }).count(), 0);
      assert.equal(await header.getByText('Tổng quan', { exact: true }).count(), 0);
      await header.getByRole('tab', { name: 'Nhắn tin', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/company-messages');
      assert.equal(await header.getByRole('tab', { name: 'Nhắn tin', exact: true }).getAttribute('aria-selected'), 'true');
      await header.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/partner-navigation/header-${width}.png`, animations: 'disabled' });
    }
    await page.getByTestId('company-profile-settings-column').getByRole('button', { name: 'Quảng cáo', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/advertisement');
    assert.deepEqual(errors, []);
    console.log('Partner navigation: requested order, Student-sized labeled footer, unread badge, active routes, Partner messages layout, desktop header and advertising through Settings passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
