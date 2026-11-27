const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = false;
    const projects = Array.from({ length: 8 }, (_, index) => ({ projectId: `overflow-${index + 1}`, title: `Dự án hồ sơ ${index + 1}`, description: 'Mô tả dự án trong hồ sơ', technologies: ['React', 'TypeScript'], featured: false }));
    data.portfolio.projects = projects;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const ok = json => route.fulfill({ json });
      if (path.endsWith('/profile/public/' + data.profile.id)) return ok({ ...data.profile, role: 0, websites: [] });
      if (path.endsWith('/profile/portfolio/' + data.profile.id)) return ok(data);
      if (path.endsWith('/project-hub/requests/mine')) return ok({ items: [] });
      const project = projects.find(item => path.endsWith('/project-hub/' + item.projectId));
      if (project) return ok({ id: project.projectId, title: project.title, description: project.description, technologies: project.technologies, status: 2, isOwner: false, isMember: false, creator: data.profile, members: [], details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, actualEndDate: null }, recruitment: null, myReview: null, createdAt: '2026-11-27T00:00:00Z', updatedAt: '2026-11-27T00:00:00Z' });
      return ok([]);
    });
    fs.mkdirSync('dist/profile-project-overflow', { recursive: true });
    const visit = () => page.goto(origin + '/profile/view/' + data.profile.id, { waitUntil: 'domcontentloaded' });
    for (const width of [1440, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) {
        data.portfolio.appearance.profile.template = template;
        data.portfolio.appearance.profile.theme = template === 'developer-showcase' ? 'orange' : 'blue';
        data.portfolio.projects = projects;
        await visit();
        const preview = page.getByTestId('profile-projects-preview');
        await preview.waitFor();
        assert.equal(await preview.getByRole('button', { name: /^Xem dự án / }).count(), 3);
        const more = page.getByRole('button', { name: 'Xem thêm (+5)', exact: true });
        const heading = page.getByTestId('profile-projects-section').getByRole('heading', { level: 2 });
        const [buttonBox, headingBox] = await Promise.all([more.boundingBox(), heading.boundingBox()]);
        assert.ok(buttonBox.y < headingBox.y + headingBox.height && headingBox.y < buttonBox.y + buttonBox.height, 'more action must share the title row');
        await more.click();
        const modal = page.getByRole('dialog', { name: 'Tất cả dự án (8)', exact: true });
        await modal.waitFor();
        assert.equal(await modal.getByTestId('profile-project-modal-card').count(), 8);
        const scrollable = await modal.evaluate(node => [...node.querySelectorAll('*')].some(element => /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight));
        assert.equal(scrollable, true, 'all projects should scroll within the popup');
        const last = modal.getByRole('button', { name: 'Xem dự án Dự án hồ sơ 8', exact: true });
        await last.scrollIntoViewIfNeeded();
        const close = await modal.getByRole('button', { name: 'Đóng', exact: true }).boundingBox();
        assert.ok(close.y >= 0 && close.y + close.height <= 900, 'close control remains visible after scrolling');
        await modal.screenshot({ path: `dist/profile-project-overflow/${template}-${width}.png`, animations: 'disabled' });
        await modal.getByRole('button', { name: 'Đóng', exact: true }).click();
        await modal.waitFor({ state: 'hidden' });
        await more.click();
        await page.keyboard.press('Escape');
        await modal.waitFor({ state: 'hidden' });
        await more.click();
        await modal.getByRole('button', { name: 'Xem dự án Dự án hồ sơ 8', exact: true }).click();
        await page.waitForURL('**/group/overflow-8');
        await page.getByTestId('project-detail-hero').waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa dự án', exact: true }).count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    for (const count of [0, 1, 3, 4]) {
      data.portfolio.projects = projects.slice(0, count);
      await visit();
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      assert.equal(await page.getByTestId('profile-projects-preview').getByRole('button', { name: /^Xem dự án / }).count(), Math.min(count, 3));
      assert.equal(await page.getByTestId('profile-projects-more').count(), count > 3 ? 1 : 0);
      if (count === 4) assert.equal(await page.getByRole('button', { name: 'Xem thêm (+1)', exact: true }).count(), 1);
    }
    assert.deepEqual(errors, []);
    console.log('Profile project overflow passed: 3 templates, 4 widths, count limits, header action, scroll, dismiss, detail navigation and permissions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
