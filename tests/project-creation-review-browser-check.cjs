const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ timezoneId: 'Asia/Ho_Chi_Minh' });
    page.setDefaultTimeout(10000);
    const errors = [];
    let creates = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && message.text().includes('Unexpected text node')) errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'review-student', email: 'review@example.test', role: 0, profileComplete: true, profile: { id: 'profile', fullName: 'Sinh viên UniNet', nickname: 'student', isVerified: false } } });
      if (pathname.endsWith('/projects') && route.request().method() === 'POST') {
        creates++;
        return route.fulfill({ status: 400, json: { message: 'Không thể tạo dự án thử nghiệm.' } });
      }
      return route.fulfill({ json: [] });
    });
    const draft = { title: 'Nền tảng kết nối sinh viên và doanh nghiệp', specializationId: 'software', projectField: 'EdTech (Giáo dục)', description: Array.from({ length: 16 }, (_, i) => `Phần ${i + 1}: xây dựng không gian cộng tác, chia sẻ kiến thức và tìm cơ hội thực tập cho sinh viên.`).join('\n'), memberTarget: 5, minimumQuantity: 2, recruitmentDeadline: '2099-05-20T16:59:00Z', expectedOutput: '2099-06-25T08:30:00Z', visibility: 0, skillIds: [], roleRequirements: [{ role: 'Frontend Developer', quantity: 2, requirements: 'React, TypeScript và kinh nghiệm xây dựng giao diện responsive.' }, { role: 'Backend Developer', quantity: 1, requirements: 'ASP.NET Core, PostgreSQL và thiết kế API.' }, { role: 'Tester', quantity: 1, requirements: 'Kiểm thử chức năng và viết báo cáo lỗi.' }] };
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto((process.env.PROJECT_CREATE_ORIGIN || 'http://localhost:8081') + '/group/recommendations?' + new URLSearchParams({ draft: JSON.stringify(draft) }));
      await page.getByRole('heading', { name: draft.title, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Xem đầy đủ', exact: true }).click();
      const description = page.getByTestId('project-review-description');
      assert.ok((await description.boundingBox()).height > 200);
      await page.getByRole('button', { name: 'Thu gọn', exact: true }).click();
      assert.ok((await description.boundingBox()).height <= 133);
      assert.equal(await page.getByText('20/05/2099 · 23:59', { exact: true }).count(), 1);
      assert.equal(await page.getByText('25/06/2099 · 15:30', { exact: true }).count(), 1);
      assert.equal(await page.locator('[data-testid^="project-review-role-"]').count(), 3);
      assert.deepEqual(await page.locator('[role="button"],[data-testid^="project-review-role-"]').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < 0 || r.right > innerWidth + 1); }).map(el => el.textContent)), [], `Review must fit ${width}px`);
      if (process.env.REVIEW_SCREENSHOTS && [320, 1440].includes(width)) {
        await page.evaluate(() => document.querySelectorAll('*').forEach(el => { if (['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) el.scrollTop = 0; }));
        await page.screenshot({ path: path.join(process.env.REVIEW_SCREENSHOTS, `project-review-${width}.png`) });
      }
    }
    assert.equal(creates, 0, 'Opening the review must not create a project');
    await page.getByRole('button', { name: 'Tạo dự án', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Không thể tạo dự án thử nghiệm.' }).first().waitFor();
    assert.equal(creates, 1);
    assert.equal(await page.getByRole('heading', { name: draft.title, exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: responsive review, expandable description, all roles, local dates, explicit creation and retained error state.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
