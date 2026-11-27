const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    fs.mkdirSync('dist/profile-interests', { recursive: true });
    for (const width of [1440, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) {
        await page.goto(`${origin}/profile/preview?template=${template}`, { waitUntil: 'domcontentloaded' });
        const section = page.getByTestId('profile-interests');
        await section.getByRole('heading', { name: 'Sở thích cá nhân', exact: true }).waitFor();
        for (const interest of sample.portfolio.interests) assert.equal(await section.getByText(interest, { exact: true }).count(), 1);
        assert.equal(await section.getByTestId('profile-interest-icon').count(), sample.portfolio.interests.length);
        const tags = await section.getByTestId('profile-interest-tag').all();
        const boxes = await Promise.all(tags.map(tag => tag.boundingBox()));
        assert.ok(boxes.every(box => box.height >= 36 && box.height <= 44));
        if (width < 768) assert.ok(boxes.at(-1).y > boxes[0].y, 'many interests should wrap on phones');
        assert.equal(await section.getByRole('button').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const bounds = await section.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        assert.ok(boxes.every(box => box.x >= bounds.x - 1 && box.x + box.width <= bounds.x + bounds.width + 1));
        await section.screenshot({ path: `dist/profile-interests/${template}-${width}.png`, animations: 'disabled' });
      }
    }
    await page.goto(origin + '/profile/templates', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('profile-interests').nth(2).waitFor({ state: 'attached' });
    assert.equal(await page.getByTestId('profile-interests').count(), 3);
    assert.deepEqual(errors, []);
    console.log('Interests sample previews passed: 3 templates, desktop/mobile, gallery thumbnails, no overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
