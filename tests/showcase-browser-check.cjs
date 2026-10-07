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
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  fs.mkdirSync('dist/showcase-verification', { recursive: true });
  const visibleImagesReady = () => page.locator('img').evaluateAll(images => Promise.all(images.filter(image => { const box = image.getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; }).map(image => image.decode())));
  try {
    for (const theme of ['mint', 'orange']) {
      for (const width of [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://localhost:8082/profile/preview?template=developer-showcase&theme=${theme}`);
        const template = page.getByTestId('developer-showcase');
        await template.waitFor();
        const heading = template.getByRole('heading', { level: 1 });
        assert.equal((await heading.innerText()).replace(/\s+/g, ' '), sample.profile.fullName);
        const nameLayout = await heading.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          const probe = element.cloneNode(true);
          probe.style.position = 'absolute';
          probe.style.width = 'max-content';
          probe.style.whiteSpace = 'nowrap';
          probe.style.visibility = 'hidden';
          element.parentElement.appendChild(probe);
          const naturalWidth = probe.getBoundingClientRect().width;
          probe.remove();
          const tops = new Set();
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects()) {
              if (rect.width) tops.add(Math.round(rect.top));
              if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) return { fits: false };
            }
          }
          return { fits: true, naturalWidth, availableWidth: bounds.width, lines: tops.size };
        });
        assert.ok(nameLayout.fits, `Name text stays inside its heading ${theme}/${width}`);
        if (nameLayout.naturalWidth <= nameLayout.availableWidth) assert.equal(nameLayout.lines, 1, `Name stays on one line when it fits ${theme}/${width}`);
        else assert.ok(nameLayout.lines > 1, `Name wraps when space runs out ${theme}/${width}`);
        const hero = template.getByTestId('showcase-hero');
        assert.equal(await hero.getByRole('button', { name: 'Xem dự án của tôi', exact: true }).count(), 0);
        for (const skill of sample.portfolio.skills.slice(0, 5)) assert.equal(await hero.getByText(skill.name, { exact: true }).count(), 0);
        const avatar = template.getByRole('img', { name: `Ảnh đại diện ${sample.profile.fullName}`, exact: true });
        await avatar.evaluate(image => image.decode());
        const nameBounds = await heading.boundingBox();
        const avatarBounds = await avatar.boundingBox();
        assert.ok(nameBounds.x + nameBounds.width <= width + 1, `Name fits ${theme}/${width}`);
        assert.ok(nameBounds.x + nameBounds.width <= avatarBounds.x + 1 || nameBounds.y + nameBounds.height <= avatarBounds.y + 1, `Portrait cannot cover name ${theme}/${width}`);
        assert.equal(await template.getByRole('navigation').count(), 0);
        assert.equal(await template.getByText(/Xin chào|Clean Code|User-Centered|Problem Solving|Continuous Learning|DỰ ÁN NỔI BẬT|DỰ ÁN KHÁC/).count(), 0);
        assert.equal(await template.getByText('Mobile App', { exact: true }).count(), 0);
        assert.equal(await template.getByText('Web Platform', { exact: true }).count(), 0);
        const cards = template.getByTestId('showcase-project-card');
        assert.equal(await cards.count(), sample.portfolio.projects.length);
        if (width >= 1024) {
          const firstRow = await cards.evaluateAll(elements => elements.slice(0, 4).map(element => element.getBoundingClientRect().top));
          assert.ok(firstRow.every(top => Math.abs(top - firstRow[0]) < 1), `Four projects per desktop row ${theme}/${width}`);
        }
        assert.equal(await page.getByRole('link', { name: 'Liên hệ qua email', exact: true }).count(), 0, 'Sample email never acts as real contact');
        assert.equal(await template.getByRole('link', { name: /Xem chi tiết|Đọc bài viết|Xem chứng chỉ/ }).count(), 0, 'Example project/article/certificate URLs are noninteractive');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No page overflow ${theme}/${width}`);
        const spills = await template.evaluate(root => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll('[role="heading"],img,button')].filter(el => { const r = el.getBoundingClientRect(); return r.left < bounds.left - 1 || r.right > bounds.right + 1; }).map(el => el.textContent || el.getAttribute('alt'));
        });
        assert.deepEqual(spills, [], `No clipped content ${theme}/${width}`);
        await template.getByTestId('showcase-contact').scrollIntoViewIfNeeded();
        await visibleImagesReady();
        await page.screenshot({ path: `dist/showcase-verification/contact-${theme}-${width}.png` });
        await template.getByTestId('showcase-hero').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `dist/showcase-verification/hero-${theme}-${width}.png` });
        if ([375, 768, 1440].includes(width)) {
          await template.getByRole('heading', { name: sample.portfolio.projects[0].title, exact: true }).scrollIntoViewIfNeeded();
          await visibleImagesReady();
          await page.screenshot({ path: `dist/showcase-verification/projects-${theme}-${width}.png` });
          await template.getByRole('heading', { name: 'Hành trình phát triển', exact: true }).scrollIntoViewIfNeeded();
          await visibleImagesReady();
          await page.screenshot({ path: `dist/showcase-verification/journey-${theme}-${width}.png` });
        }
      }
    }
    await page.setViewportSize({ width: 812, height: 375 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:8082/profile/preview?template=developer-showcase&theme=mint');
    await page.getByTestId('developer-showcase').waitFor();
    await page.getByRole('button', { name: 'Chọn màu Sunset Orange', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.ok(page.url().includes('theme=orange'));
    assert.equal(await page.getByRole('button', { name: 'Chọn màu Sunset Orange', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.goto('http://localhost:8082/profile/templates');
    await page.getByRole('button', { name: 'Xem Developer Showcase màu Sunset Orange', exact: true }).click();
    await page.getByTestId('developer-showcase').waitFor();
    assert.ok(page.url().includes('template=developer-showcase') && page.url().includes('theme=orange'));
    await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
    await page.getByRole('button', { name: 'Xem trước Developer Modern', exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await visibleImagesReady();
    await page.screenshot({ path: 'dist/showcase-verification/gallery.png' });
    assert.deepEqual(errors, []);
    console.log('Showcase: both themes, 10 widths, natural name wrapping, removed hero chips/project action, landscape/reduced motion, keyboard, gallery/back, media bounds, sample actions; no console/page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
