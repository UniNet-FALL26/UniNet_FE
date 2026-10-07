const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('dist/profile-verification', { recursive: true });
  try {
    for (const theme of ['blue', 'amber']) {
      for (const width of [320, 375, 430, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`http://localhost:8082/profile/preview?template=developer-modern&theme=${theme}`);
        const heading = page.getByRole('heading', { name: sample.profile.fullName, exact: true });
        await heading.waitFor();
        await page.getByRole('img', { name: `\u1ea2nh \u0111\u1ea1i di\u1ec7n ${sample.profile.fullName}`, exact: true }).evaluate(image => image.decode());
        await page.screenshot({ path: `dist/profile-verification/hero-${theme}-${width}.png` });
        const visibleName = await heading.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects()) {
              if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) return false;
            }
          }
          return bounds.right <= innerWidth && bounds.left >= 0;
        });
        assert.ok(visibleName, `Full name is visible: ${theme}/${width}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.getByText('Code\nCreate\nLearn\nGrow\nTogether.', { exact: true }).count(), 1, `Handwritten decoration: ${theme}/${width}`);
        if (width < 720) {
          const avatar = page.getByRole('img', { name: `\u1ea2nh \u0111\u1ea1i di\u1ec7n ${sample.profile.fullName}`, exact: true });
          const bounds = await avatar.boundingBox();
          assert.ok(bounds.width >= width * 0.7 && bounds.height >= 230, `Avatar size: ${theme}/${width}`);
          const decoration = await avatar.evaluate(image => {
            let scene = image.parentElement;
            while (scene && !scene.textContent.includes('Together.')) scene = scene.parentElement;
            return scene ? [...scene.querySelectorAll('*')].filter(element => element.tagName === 'IMG' || getComputedStyle(element).backgroundImage !== 'none').length : 0;
          });
          assert.ok(decoration >= 2, `Portrait cover decoration: ${theme}/${width}`);
          const placement = await avatar.evaluate(image => {
            let scene = image.parentElement;
            while (scene && !scene.textContent.includes('Together.')) scene = scene.parentElement;
            const cover = [...scene.querySelectorAll('img')].find(element => element !== image);
            const avatarBounds = image.getBoundingClientRect();
            const coverBounds = cover.getBoundingClientRect();
            return { topOffset: coverBounds.top - avatarBounds.top, coverCenter: coverBounds.left + coverBounds.width / 2, avatarCenter: avatarBounds.left + avatarBounds.width / 2 };
          });
          assert.ok(placement.topOffset <= 0, `Code decoration starts above the avatar, like desktop: ${theme}/${width}`);
          assert.ok(placement.coverCenter > placement.avatarCenter, `Code decoration stays to the right of the avatar: ${theme}/${width}`);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('Hero verified in both themes at 320/375/430/768/1440: full name, decorations, no overflow or page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
