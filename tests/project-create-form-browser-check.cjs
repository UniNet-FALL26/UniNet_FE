const assert = require('node:assert/strict');
const path = require('node:path');
const runtime = process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/skills', route => route.fulfill({ json: [
      { id: 'react', name: 'React', iconUrl: null, category: 'Frontend' },
      { id: 'typescript', name: 'TypeScript', iconUrl: null, category: 'Language' },
    ] }));
    await page.route('**/specializations', route => route.fulfill({ json: [
      { id: 'software', code: 'SE', name: 'Kỹ thuật phần mềm', isActive: true },
      { id: 'data', code: 'DS', name: 'Khoa học dữ liệu', isActive: true },
    ] }));
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto((process.env.PROJECT_CREATE_ORIGIN || 'http://localhost:8081') + '/group/create');
      const title = page.getByRole('textbox', { name: 'Tên dự án *', exact: true });
      await title.waitFor();
      const react = page.getByRole('checkbox', { name: 'React', exact: true });
      await react.waitFor();
      assert.ok((await react.boundingBox()).height <= 30, 'Skill chips should be compact');
      await react.click();
      assert.equal(await react.getAttribute('aria-checked'), 'true');
      const search = page.getByRole('textbox', { name: 'Tìm trong danh mục kỹ năng', exact: true });
      await search.fill('TypeScript');
      assert.equal(await react.count(), 1, 'Selected skills should remain visible when searching');
      await search.fill('');
      const field = page.getByRole('button', { name: 'Chọn lĩnh vực dự án', exact: true });
      const cardHeight = () => title.evaluate(el => el.parentElement.parentElement.parentElement.parentElement.getBoundingClientRect().height);
      await page.waitForFunction(() => document.querySelector('input')?.getBoundingClientRect().height > 0);
      const before = await cardHeight();
      await field.click();
      const fieldDialog = page.getByRole('dialog', { name: 'Chọn lĩnh vực dự án', exact: true });
      await fieldDialog.waitFor();
      assert.equal(await cardHeight(), before, 'Opening a picker must not expand the form');
      await fieldDialog.getByRole('radio', { name: 'Khác', exact: true }).click();
      await fieldDialog.waitFor({ state: 'hidden' });
      await page.getByRole('textbox', { name: 'Tên lĩnh vực khác *', exact: true }).fill('Nghiên cứu');

      const specialization = page.getByRole('button', { name: 'Chọn chuyên ngành dự án ▾', exact: true });
      await specialization.click();
      const specializationDialog = page.getByRole('dialog', { name: 'Chọn chuyên ngành dự án', exact: true });
      await specializationDialog.getByRole('radio', { name: 'Kỹ thuật phần mềm', exact: true }).click();
      await specializationDialog.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Kỹ thuật phần mềm', exact: true }).click();
      await page.keyboard.press('Escape');
      await specializationDialog.waitFor({ state: 'hidden' });

      const description = page.getByRole('textbox', { name: 'Mô tả dự án *', exact: true });
      await description.fill('Mô tả ngắn');
      const short = (await description.boundingBox()).height;
      await description.fill(Array.from({ length: 24 }, (_, i) => `Dòng ${i + 1}: nội dung mô tả dự án.`).join('\n'));
      assert.ok((await description.boundingBox()).height > short + 200, 'Description must grow with its content');
      assert.ok(await description.evaluate(el => el.scrollHeight <= el.clientHeight + 2), 'Description must show all lines');
      await description.fill('Ngắn lại');
      assert.ok((await description.boundingBox()).height <= short + 2, 'Description must shrink after deleting text');
      const appearance = await title.evaluate(el => ({ height: el.parentElement.getBoundingClientRect().height, background: getComputedStyle(el.parentElement).backgroundColor }));
      assert.ok(appearance.height <= 42, 'Inputs should be compact');
      assert.equal(appearance.background, 'rgb(255, 255, 255)');
      assert.deepEqual(await page.locator('input,textarea').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < 0 || r.right > innerWidth + 1); }).map(el => ({ label: el.getAttribute('aria-label'), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, viewport: innerWidth }))), [], `Inputs should fit the ${width}px viewport`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: compact white inputs, growing/shrinking description, popup selection and dismissal at 320/768/1440px.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
