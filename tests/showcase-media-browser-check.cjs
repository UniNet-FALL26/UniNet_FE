const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  try {
    await page.route('**/*developer-portrait*', route => route.abort());
    await page.goto('http://localhost:8082/profile/preview?template=developer-showcase&theme=mint');
    await page.getByLabel('Ảnh đại diện bằng chữ viết tắt Trịnh Trọng Quyền', { exact: true }).waitFor();
    assert.equal(await page.getByRole('img', { name: 'Ảnh đại diện Trịnh Trọng Quyền', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    fs.mkdirSync('dist/showcase-verification', { recursive: true });
    await page.screenshot({ path: 'dist/showcase-verification/portrait-fallback.png' });
    console.log('Broken portrait request falls back to initials; no broken portrait or overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
