const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    let mutations = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/api/**', route => {
      if (route.request().method() !== 'GET') mutations++;
      const pathname = new URL(route.request().url()).pathname;
      return route.fulfill({ json: pathname.endsWith('/auth/me') ? { id: 'upload-student', email: 'upload@example.test', role: 0, profileComplete: true, profile: { id: 'profile', fullName: 'Student', nickname: 'student', isVerified: false } } : [] });
    });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto((process.env.PROJECT_CREATE_ORIGIN || 'http://localhost:8081') + '/group/create');
      const importButton = page.getByRole('button', { name: 'Thêm dự án có sẵn', exact: true });
      await importButton.scrollIntoViewIfNeeded();
      assert.ok((await importButton.boundingBox()).height <= 42);
      assert.equal(await page.getByText('Bạn có dự án đã hoàn thành?', { exact: true }).count(), 1);
      if (process.env.UPLOAD_SCREENSHOTS && width === 1440) await page.screenshot({ path: path.join(process.env.UPLOAD_SCREENSHOTS, 'external-project-callout.png') });
      await importButton.click();
      await page.getByRole('heading', { name: 'Tài liệu dự án', exact: true }).waitFor();
      const next = page.getByRole('button', { name: 'Tiếp tục', exact: true });
      assert.equal(await next.isDisabled(), true);
      const chooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Chọn tài liệu', exact: true }).click();
      await (await chooserPromise).setFiles({ name: 'tai-lieu-mo-ta-du-an-va-cac-chuc-nang-chinh.txt', mimeType: 'text/plain', buffer: Buffer.from('Tai lieu mo ta du an UniNet') });
      await page.getByText('Đã chọn 1/10 tài liệu', { exact: true }).waitFor();
      assert.equal(await next.isDisabled(), false);
      assert.ok((await next.boundingBox()).height <= 42);
      assert.deepEqual(await page.locator('input,[role="button"]').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < 0 || r.right > innerWidth + 1); }).map(el => el.getAttribute('aria-label'))), [], `Controls must fit ${width}px`);
      if (process.env.UPLOAD_SCREENSHOTS && [320, 1440].includes(width)) await page.screenshot({ path: path.join(process.env.UPLOAD_SCREENSHOTS, `external-project-upload-${width}.png`) });
      await page.getByRole('button', { name: 'Bỏ tài liệu tai-lieu-mo-ta-du-an-va-cac-chuc-nang-chinh.txt', exact: true }).click();
      assert.equal(await next.isDisabled(), true);
      assert.equal(await page.getByText('Đã chọn 1/10 tài liệu', { exact: true }).count(), 0);
    }
    assert.equal(mutations, 0, 'Visual checks must not upload files or create drafts');
    assert.deepEqual(errors, []);
    console.log('PASS: responsive import callout and upload screen, local file selection/removal and Continue state at 320/768/1440px.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
