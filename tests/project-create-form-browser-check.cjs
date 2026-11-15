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
    page.on('console', message => { if (message.type() === 'error' && message.text().includes('Unexpected text node')) errors.push(message.text()); });
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
      const roleNames = page.getByRole('textbox', { name: 'Tên vai trò *', exact: true });
      assert.equal(await page.getByText('Vai trò 1', { exact: true }).count(), 1);
      await roleNames.first().fill('Front');
      await page.getByText('Front', { exact: true }).waitFor();
      await roleNames.first().fill('Frontend Developer');
      await page.getByText('Frontend Developer', { exact: true }).waitFor();
      await page.getByRole('button', { name: '+ Thêm vai trò', exact: true }).click();
      await page.getByText('Vai trò 2', { exact: true }).waitFor();
      await roleNames.nth(1).fill('Backend Developer');
      await page.getByText('Backend Developer', { exact: true }).waitFor();
      await roleNames.first().fill('');
      await page.getByText('Vai trò 1', { exact: true }).waitFor();
      assert.equal(await page.getByText('Backend Developer', { exact: true }).count(), 1);
      await roleNames.nth(1).fill('   ');
      await page.getByText('Vai trò 2', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Xóa vai trò 2', exact: true }).click();
      for (const [triggerName, dialogName, dateTime, display] of [
        ['Chọn hạn chót nộp đơn tham gia', 'Hạn chót nộp đơn tham gia', '2099-05-20T14:30', '20/05/2099 14:30'],
        ['Chọn ngày dự kiến bàn giao sản phẩm', 'Ngày dự kiến bàn giao sản phẩm', '2099-06-25T09:15', '25/06/2099 09:15'],
      ]) {
        const trigger = page.getByRole('button', { name: triggerName, exact: true });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
        await dialog.waitFor({ timeout: 3000 });
        const modalBounds = await dialog.boundingBox();
        assert.ok(modalBounds.x >= 0 && modalBounds.x + modalBounds.width <= width + 1, 'Date popup must fit the viewport');
        assert.equal(await dialog.locator('input[type="datetime-local"]').count(), 0, 'Calendar must use the custom Vietnamese layout');
        const [datePart, timePart] = dateTime.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');
        await dialog.getByRole('combobox', { name: 'Năm', exact: true }).selectOption(year);
        await dialog.getByRole('combobox', { name: 'Tháng', exact: true }).selectOption(String(Number(month) - 1));
        await dialog.getByRole('button', { name: `Chọn ngày ${day}/${month}/${year}`, exact: true }).click();
        await dialog.getByRole('textbox', { name: 'Giờ', exact: true }).fill(hours);
        await dialog.getByRole('textbox', { name: 'Phút', exact: true }).fill(minutes);
        await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        assert.ok((await trigger.innerText()).includes(display));
        await trigger.click();
        assert.equal(await dialog.getByRole('button', { name: `Chọn ngày ${day}/${month}/${year}`, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(await dialog.getByRole('textbox', { name: 'Giờ', exact: true }).inputValue(), hours);
        assert.equal(await dialog.getByRole('textbox', { name: 'Phút', exact: true }).inputValue(), minutes);
        await dialog.getByRole('textbox', { name: 'Giờ', exact: true }).fill('10');
        await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
        assert.ok((await trigger.innerText()).includes(display), 'Cancel must preserve the saved date');
        await trigger.click();
        await dialog.getByRole('combobox', { name: 'Năm', exact: true }).selectOption('2028');
        await dialog.getByRole('combobox', { name: 'Tháng', exact: true }).selectOption('1');
        assert.equal(await dialog.getByRole('button', { name: 'Chọn ngày 29/02/2028', exact: true }).count(), 1, 'Calendar must include leap day');
        await dialog.getByRole('button', { name: 'Tháng sau', exact: true }).click();
        assert.equal(await dialog.getByRole('combobox', { name: 'Tháng', exact: true }).inputValue(), '2');
        await dialog.getByRole('textbox', { name: 'Giờ', exact: true }).fill('25');
        assert.equal(await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled(), true);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
      }
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
    await page.setViewportSize({ width: 640, height: 360 });
    await page.getByRole('button', { name: 'Chọn hạn chót nộp đơn tham gia', exact: true }).click();
    const shortDialog = page.getByRole('dialog', { name: 'Hạn chót nộp đơn tham gia', exact: true });
    const footerBounds = await shortDialog.getByRole('button', { name: 'Xác nhận', exact: true }).boundingBox();
    assert.ok(footerBounds.y >= 0 && footerBounds.y + footerBounds.height <= 360, 'Confirmation stays visible on short screens');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    console.log('PASS: compact white inputs, growing/shrinking description, popup selection and dismissal at 320/768/1440px.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
