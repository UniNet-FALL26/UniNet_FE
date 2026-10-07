// Run with the preinstalled Playwright runtime; no dependency changes required.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const folder = path.resolve('dist/profile-verification');
  fs.mkdirSync(folder, { recursive: true });
  try {
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:8082/profile/templates');
      await page.getByRole('button', { name: 'Xem Developer Modern màu Vàng cam', exact: true }).waitFor();
      await page.getByText('Viora Social App', { exact: true }).first().waitFor({ state: 'attached' });
      await page.waitForFunction(() => [...document.images].every(image => image.complete));
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(folder, `gallery-${width}.png`) });
      const bounds = await page.getByRole('button', { name: 'Xem trước mẫu Developer Modern, màu Xanh công nghệ', exact: true }).boundingBox();
      assert.ok(bounds.width <= width * 0.52, `Gallery has two-column capacity at ${width}`);
      await page.getByRole('button', { name: 'Xem Developer Modern màu Vàng cam', exact: true }).click();
      await page.getByRole('heading', { name: 'Trịnh Trọng Quyền', exact: true }).waitFor();
      assert.ok(page.url().includes('theme=amber'));
      assert.equal(await page.getByRole('button', { name: 'Chọn màu Vàng cam', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.ok(await page.getByText('@Quyền Dev', { exact: true }).isVisible());
      assert.equal(await page.getByRole('button', { name: 'Liên hệ qua email', exact: true }).count(), 0);
      await page.waitForFunction(() => [...document.images].every(image => image.complete));
      await page.screenshot({ path: path.join(folder, `amber-${width}.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `No horizontal overflow at ${width}`);
      await page.getByRole('button', { name: 'Chọn màu Xanh công nghệ', exact: true }).click();
      assert.ok(page.url().includes('theme=blue'));
      await page.screenshot({ path: path.join(folder, `blue-${width}.png`), fullPage: true });
      if (width === 1440) {
        await page.getByRole('heading', { name: 'Kỹ năng', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(folder, 'desktop-skills.png') });
      }
      await page.getByRole('heading', { name: 'Chứng chỉ', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(folder, `certificates-${width}.png`) });
      await page.getByText('Trịnh Trọng Quyền', { exact: true }).last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(folder, `footer-${width}.png`) });
      await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
      await page.getByRole('heading', { name: 'Mẫu hồ sơ', exact: true }).waitFor();
    }
    await page.goto('http://localhost:8082/profile/preview?template=developer-modern&theme=amber');
    await page.getByRole('heading', { name: 'Trịnh Trọng Quyền', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Chọn màu Vàng cam', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Chọn màu Xanh công nghệ', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.ok(page.url().includes('theme=blue'), 'Color selection works with keyboard');
    await page.goto('http://localhost:8082/profile/preview?template=invalid&theme=invalid');
    await page.getByRole('heading', { name: 'Trịnh Trọng Quyền', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Chọn màu Xanh công nghệ', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    console.log('Verified gallery, amber/blue deep links, back and overflow at 320/375/768/1440; no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
