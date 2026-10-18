const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    fs.mkdirSync('dist/welcome-verification', { recursive: true });
    for (const [width, height] of [[320, 740], [390, 844], [440, 956], [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.goto(`${origin}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.locator('[data-testid="auth-campus-scene"] img, [data-testid="welcome-artwork"] img').first().waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="auth-campus-scene"] img, [data-testid="welcome-artwork"] img')].every(image => image.complete && image.naturalWidth > 0));
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no horizontal overflow at ${width}`);
      for (const label of ['Đăng nhập', 'Tạo tài khoản']) {
        const bounds = await page.getByRole('button', { name: label, exact: true }).boundingBox();
        assert.ok(bounds.width > 100 && bounds.height >= 44, `${label} tap size`);
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${label} horizontal bounds`);
        if (width >= 900) assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height, `${label} visible on desktop`);
      }
      await page.screenshot({ path: `dist/welcome-verification/welcome-${width}.png` });
      if (width < 900) {
        await page.getByRole('link', { name: 'Đăng ký đối tác →', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `dist/welcome-verification/welcome-actions-${width}.png` });
      }
    }
    for (const [label, role, path] of [['Đăng nhập', 'button', '/login'], ['Tạo tài khoản', 'button', '/register'], ['Đăng ký đối tác →', 'link', '/register-partner']]) {
      await page.goto(`${origin}/welcome`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const control = page.getByRole(role, { name: label, exact: true });
      await control.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')].some(node => Object.keys(node).some(key => key.startsWith('__reactProps') && typeof node[key]?.onClick === 'function')));
      await control.focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(url => url.pathname === path, { waitUntil: 'domcontentloaded' }).catch(() => { throw new Error(`${label}: expected ${path}, received ${new URL(page.url()).pathname}`); });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: responsive welcome at 8 sizes, loaded artwork, tap targets, no horizontal overflow, desktop CTA visibility and keyboard navigation to all auth destinations');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
