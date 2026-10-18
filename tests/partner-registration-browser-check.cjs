const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const labels = ['Doanh nghiệp', 'Trường học', 'Cửa hàng / Thương hiệu', 'Trung tâm đào tạo', 'Đối tác khác'];

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(20000);
    await page.addInitScript(() => {
      window.__partnerMotion = [];
      const sample = () => {
        const form = document.querySelector('[data-testid="partner-registration-form"]');
        if (form) {
          const opacity = Number(getComputedStyle(form).opacity);
          window.__partnerMotion.push(opacity);
          if (opacity === 1) return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const errors = []; let registrations = 0;
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'partner-design-test', email: 'partner@example.test', role: 1, profileComplete: true, profile: { id: 'partner-design-profile', fullName: 'Đối tác kiểm thử', displayName: 'Đối tác kiểm thử', organizationName: 'Đối tác kiểm thử', nickname: 'partner', isVerified: false } };
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/register/partner')) {
        registrations++;
        const body = route.request().postDataJSON();
        assert.equal(body.partnerType, 4); assert.equal(body.organizationName, 'Đối tác kiểm thử');
        return route.fulfill({ json: { account, accessToken: 'partner-design-access', refreshToken: 'partner-design-refresh', requiresProfileCompletion: false } });
      }
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      return route.fulfill({ json: [] });
    });
    fs.mkdirSync('dist/partner-registration-verification', { recursive: true });
    const go = async path => {
      await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => {
        const form = document.querySelector('[data-testid="partner-registration-form"]');
        return form && Number(getComputedStyle(form).opacity) === 1;
      });
    };
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width >= 900 ? 768 : 960 });
      await go('/register-partner');
      await page.getByRole('radio', { name: labels[0], exact: true }).waitFor();
      await page.waitForFunction(() => { const images = [...document.querySelectorAll('img')]; return images.length >= 3 && images.every(image => image.complete && image.naturalWidth > 0); });
      await page.evaluate(() => Promise.all([...document.querySelectorAll('img')].map(image => image.decode().catch(() => {}))));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `selection fits ${width}`);
      assert.equal(await page.getByRole('radio').count(), 5);
      assert.equal(await page.getByRole('img', { name: 'Logo UniNet', exact: true }).count(), 0);
      if (width >= 900) {
        const card = await page.getByTestId('partner-registration-card').boundingBox();
        assert.equal(card.x, 0); assert.equal(card.y, 0); assert.equal(card.width, width); assert.equal(card.height, 768);
        const cta = await page.getByRole('button', { name: 'Ti\u1ebfp t\u1ee5c', exact: true }).boundingBox();
        assert.ok(cta.y + cta.height <= 768, `selection CTA visible ${width}`);
      }
      await page.screenshot({ path: `dist/partner-registration-verification/selection-${width}.png` });
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).scrollIntoViewIfNeeded();
      if (width < 900) {
        const action = await page.getByRole('button', { name: 'Ti\u1ebfp t\u1ee5c', exact: true }).boundingBox();
        assert.ok(action.y >= 0 && action.y + action.height <= 960, `mobile action reachable ${width}`);
      }
      await page.screenshot({ path: `dist/partner-registration-verification/selection-actions-${width}.png` });
      await go('/register-partner-details?partnerType=0&type=Doanh%20nghi%E1%BB%87p');
      await page.getByRole('textbox', { name: 'Tên tổ chức / đối tác *', exact: true }).waitFor();
      await page.waitForFunction(() => { const images = [...document.querySelectorAll('img')]; return images.length >= 3 && images.every(image => image.complete && image.naturalWidth > 0); });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `account form fits ${width}`);
      if (width >= 900) {
        const login = page.getByRole('link', { name: '\u0110\u0103ng nh\u1eadp', exact: true });
        const before = await login.boundingBox();
        assert.ok(before.y + before.height <= 768, `account footer visible ${width}: ${JSON.stringify(before)}`);
        await login.hover(); await page.mouse.wheel(0, 600); await page.waitForTimeout(150);
        assert.deepEqual(await login.boundingBox(), before, `desktop form stays fixed ${width}`);
      }
      await page.screenshot({ path: `dist/partner-registration-verification/account-${width}.png` });
    }
    assert.ok(await page.evaluate(() => window.__partnerMotion.some(value => value > 0 && value < 1)), 'normal entrance animates');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/register-partner');
    assert.ok(await page.evaluate(() => window.__partnerMotion.every(value => value === 0 || value === 1)), 'reduced motion skips intermediate animation');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const [type, label] of labels.entries()) {
      await go('/register-partner');
      const radio = page.getByRole('radio', { name: label, exact: true });
      await page.waitForFunction(() => [...document.querySelectorAll('[role="radio"]')].some(node => Object.keys(node).some(key => key.startsWith('__reactProps') && typeof node[key]?.onClick === 'function')));
      await radio.click(); assert.equal(await radio.getAttribute('aria-checked'), 'true');
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/register-partner-details');
      assert.equal(new URL(page.url()).searchParams.get('partnerType'), String(type));
      assert.equal(new URL(page.url()).searchParams.get('type'), label);
    }
    await page.getByRole('button', { name: 'Tạo tài khoản đối tác', exact: true }).click();
    await page.getByText('Vui lòng điền đầy đủ và kiểm tra lại thông tin.', { exact: true }).waitFor();
    assert.equal(registrations, 0);
    await page.getByRole('textbox', { name: 'Tên tổ chức / đối tác *', exact: true }).fill('Đối tác kiểm thử');
    await page.getByRole('textbox', { name: 'Email đăng nhập *', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu *', exact: true }).fill('partner-test-123');
    await page.getByRole('textbox', { name: 'Xác nhận mật khẩu *', exact: true }).fill('partner-test-123');
    await page.getByRole('checkbox', { name: 'Đồng ý với điều khoản và chính sách', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo tài khoản đối tác', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/register-partner'));
    assert.equal(registrations, 1);
    assert.deepEqual(errors, []);
    console.log('PASS: partner selection/account layouts at 6 sizes, loaded artwork, all 5 type IDs, required-field validation and successful mocked registration');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
