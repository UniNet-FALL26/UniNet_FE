const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      return route.fulfill({ json: pathname.endsWith('/auth/me') ? { id: 'filter-student', email: 'filters@example.test', role: 0, profileComplete: true, profile: { id: 'profile', fullName: 'Student', nickname: 'student', isVerified: false } } : pathname.endsWith('/opportunities') ? { page: 1, pageSize: 15, totalItems: 0, totalPages: 1, jobs: [] } : [] });
    });
    for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.goto((process.env.OPPORTUNITY_TEST_ORIGIN || 'http://localhost:8081') + '/opportunities');
      const trigger = page.getByRole('button', { name: 'Bộ lọc', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Bộ lọc cơ hội', exact: true });
      await dialog.waitFor();
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, `Dialog must fit ${width}x${height}`);
      assert.deepEqual(await dialog.locator('*').evaluateAll(elements => elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)).map(el => el.tagName)), [], 'No horizontal scrolling');
      await dialog.getByRole('checkbox', { name: 'Từ xa', exact: true }).click();
      await dialog.getByRole('checkbox', { name: 'Bán thời gian', exact: true }).click();
      await dialog.getByRole('textbox', { name: 'Lương tối thiểu, triệu đồng mỗi tháng', exact: true }).fill('5');
      await dialog.getByRole('textbox', { name: 'Lương tối đa, triệu đồng mỗi tháng', exact: true }).fill('15');
      assert.equal(await dialog.getByRole('checkbox', { name: 'Từ xa', exact: true }).getAttribute('aria-checked'), 'true');
      if (process.env.OPPORTUNITY_FILTER_SCREENSHOTS && [390, 1440].includes(width)) await page.screenshot({ path: path.join(process.env.OPPORTUNITY_FILTER_SCREENSHOTS, `opportunity-filters-${width}.png`) });
      const done = dialog.getByRole('button', { name: 'Xong', exact: true });
      const doneBounds = await done.boundingBox();
      assert.ok(doneBounds.y >= 0 && doneBounds.y + doneBounds.height <= height, 'Footer must stay visible');
      await done.click();
      await dialog.waitFor({ state: 'hidden' });
      await trigger.click();
      assert.equal(await dialog.getByRole('textbox', { name: 'Lương tối đa, triệu đồng mỗi tháng', exact: true }).inputValue(), '15');
      await dialog.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
      assert.equal(await dialog.getByRole('textbox', { name: 'Lương tối thiểu, triệu đồng mỗi tháng', exact: true }).inputValue(), '');
      assert.equal(await dialog.getByRole('checkbox', { name: 'Từ xa', exact: true }).getAttribute('aria-checked'), 'false');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: six viewport sizes, no horizontal scroll, visible footer, selection, salary, clear, persistence and Escape.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
