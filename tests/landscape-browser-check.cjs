const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const baseUrl = process.env.LANDSCAPE_BASE_URL || 'http://localhost:8082';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  fs.mkdirSync('dist/landscape-verification', { recursive: true });
  try {
    for (const theme of ['blue', 'pink', 'mint']) {
      console.log(`Checking ${theme}`);
      for (const width of (process.env.LANDSCAPE_SCREENSHOTS_ONLY ? [390, 1440] : [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440])) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${baseUrl}/profile/preview?template=developer-landscape&theme=${theme}`, { waitUntil: 'domcontentloaded' });
        const root = page.getByTestId('developer-landscape');
        await root.waitFor();
        const hero = root.getByTestId('landscape-hero');
        const nickname = hero.getByTestId('landscape-nickname');
        assert.equal(await nickname.innerText(), sample.profile.nickname);
        assert.equal(await hero.getByText(/Xin chào|👋/).count(), 0);
        const fullNameBounds = await hero.getByRole('heading', { level: 1 }).boundingBox();
        const nicknameBounds = await nickname.boundingBox();
        const headlineBounds = await hero.getByText(sample.portfolio.headline, { exact: true }).boundingBox();
        assert.ok(nicknameBounds.y >= fullNameBounds.y + fullNameBounds.height - 1, `nickname below name ${theme}/${width}`);
        assert.ok(nicknameBounds.y + nicknameBounds.height <= headlineBounds.y + 1, `nickname above headline ${theme}/${width}`);
        assert.equal(await hero.getByRole('button').count(), 0);
        assert.equal(await hero.getByRole('link').count(), 0);
        for (const skill of sample.portfolio.skills.slice(0, 5)) assert.equal(await hero.getByText(skill.name, { exact: true }).count(), 0);
        assert.equal((await root.getByRole('heading', { level: 1 }).innerText()).replace(/\s+/g, ' '), sample.profile.fullName);
        assert.equal(await root.getByRole('navigation').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `page overflow ${theme}/${width}`);
        const spill = await root.evaluate(root => {
          const outer = root.getBoundingClientRect();
          return [...root.querySelectorAll('h1,h2,h3,[data-testid="landscape-project"],[data-testid="landscape-skill"]')].filter(el => {
            const b = el.getBoundingClientRect(); return b.x < outer.x - 1 || b.right > outer.right + 1 || el.scrollWidth > el.clientWidth + 1;
          }).map(el => el.textContent.slice(0, 70));
        });
        assert.deepEqual(spill, [], `content overflow ${theme}/${width}`);
        const name = await root.getByRole('heading', { level: 1 }).boundingBox();
        const portrait = await root.getByTestId('landscape-portrait').boundingBox();
        assert.ok(name.x + name.width <= portrait.x + 1 || name.y + name.height <= portrait.y + 1, `portrait/name overlap ${theme}/${width}`);
        const milestones = root.getByTestId('landscape-milestone');
        const positions = await milestones.evaluateAll(items => items.map(item => item.getBoundingClientRect().y));
        assert.ok(positions.every((y,i) => !i || y > positions[i-1]), 'Journey is vertical');
        const skills = root.getByTestId('landscape-skills');
        if (width < 768) {
          const firstRowCount = await skills.getByTestId('landscape-skill').evaluateAll(items => {
            const firstY = items[0].getBoundingClientRect().y;
            return items.filter(item => Math.abs(item.getBoundingClientRect().y - firstY) < 1).length;
          });
          assert.equal(firstRowCount, 3, `Three mobile skills per row ${theme}/${width}`);
          const filter = await skills.getByRole('button', { name: 'Tất cả', exact: true }).boundingBox();
          assert.ok(filter.height <= 36, `Compact mobile filters ${theme}/${width}`);
        }
        await skills.getByRole('button', { name: 'Backend', exact: true }).click();
        assert.equal(await root.getByTestId('landscape-skill').count(), sample.portfolio.skills.filter(skill => skill.category === 'Backend').length);
        await skills.getByRole('button', { name: 'Tất cả', exact: true }).click();
        assert.equal(await root.getByTestId('landscape-skill').count(), sample.portfolio.skills.length);
        await root.getByTestId('landscape-hero').scrollIntoViewIfNeeded();
        assert.equal(await root.getByRole('heading', { name: 'Dự án nổi bật', exact: true }).count(), 0);
        assert.equal(await root.getByRole('heading', { name: 'Dự án bản thân', exact: true }).count(), 1);
        assert.equal(await root.getByRole('heading', { name: 'Dự án khác', exact: true }).count(), 0);
        const projects = sample.portfolio.projects.filter(project => !project.featured);
        const projectCards = root.getByTestId('landscape-project');
        const firstRowCount = await projectCards.evaluateAll(cards => {
          const firstY = cards[0].getBoundingClientRect().y;
          return cards.filter(card => Math.abs(card.getBoundingClientRect().y - firstY) < 1).length;
        });
        const contentWidth = await projectCards.first().evaluate(card => card.parentElement.getBoundingClientRect().width);
        assert.equal(firstRowCount, Math.min(projects.length, contentWidth >= 900 ? 4 : contentWidth >= 600 ? 2 : 1), `project columns ${theme}/${width}`);
        for (let index = 0; index < projects.length; index++) {
          const card = projectCards.nth(index);
          if (projects[index].type) assert.equal(await card.getByText(projects[index].type, { exact: true }).count(), 0);
          if (projects[index].technologies.length) {
            const technologies = card.getByRole('group', { name: 'Công nghệ sử dụng', exact: true });
            for (const technology of projects[index].technologies) assert.equal(await technologies.getByText(technology, { exact: true }).count(), 1);
          }
        }
        if (width === 1440 || width === 390) {
          await root.getByTestId('landscape-hero').scrollIntoViewIfNeeded();
          const portraitImage = root.getByRole('img', { name: `Ảnh đại diện ${sample.profile.fullName}`, exact: true });
          await portraitImage.evaluate(async element => {
            const image = element.tagName === 'IMG' ? element : element.querySelector('img');
            if (image) await Promise.race([image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
          });
          await page.screenshot({ path: `dist/landscape-verification/hero-${theme}-${width}.png` });
          await root.getByTestId('landscape-skills').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `dist/landscape-verification/skills-${theme}-${width}.png` });
          await root.getByRole('heading', { name: 'Dự án bản thân', exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: `dist/landscape-verification/projects-${theme}-${width}.png` });
          await root.getByTestId('landscape-contact').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `dist/landscape-verification/footer-${theme}-${width}.png` });
        }
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 900, height: 430 });
    await page.goto(`${baseUrl}/profile/preview?template=developer-landscape&theme=blue`, { waitUntil: 'domcontentloaded' });
    const pink = page.getByRole('button', { name: 'Chọn màu Pink Sunset' });
    await pink.focus(); await page.keyboard.press('Enter');
    assert.ok(page.url().includes('theme=pink'));
    await page.goto(`${baseUrl}/profile/templates`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Xem Developer Landscape màu Mint Forest' }).click();
    await page.getByRole('heading', { level: 1, name: sample.profile.fullName, exact: true }).waitFor();
    assert.ok(page.url().includes('template=developer-landscape') && page.url().includes('theme=mint'));
    assert.deepEqual(errors, []);
    console.log(`Landscape: 3 themes / ${process.env.LANDSCAPE_SCREENSHOTS_ONLY ? 2 : 10} widths; nickname below name, simplified hero, filters, vertical journey, gallery, keyboard, reduced motion and no overflow/runtime errors.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
