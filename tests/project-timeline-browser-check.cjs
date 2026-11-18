const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_TIMELINE_TEST_ORIGIN || 'http://localhost:8086';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [], writes = [];
    let failNext = false;
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample); data.isOwner = true;
    const account = { id: 'timeline-owner', email: 'timeline@example.test', role: 0, profileComplete: true, profile: data.profile };
    const project = { id: 'timeline-fixture', title: 'Project timeline', description: 'Timeline fixture', technologies: [], status: 1, visibility: 1, mode: 'personal', isOwner: true, isMember: true,
      creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [],
      details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: '2026-01-01', actualEndDate: '2026-01-31', startDateIsCreationDate: false, completedAt: null },
      recruitment: null, myReview: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/project-hub/' + project.id + '/requests')) return ok({ items: [] });
      if (path.endsWith('/project-hub/' + project.id)) {
        if (method === 'PATCH') {
          const body = route.request().postDataJSON(); writes.push(body);
          if (failNext) { failNext = false; return route.fulfill({ status: 400, json: { message: 'Không thể cập nhật thời gian.' } }); }
          assert.equal(Object.hasOwn(body.timeline, 'expectedEndDate'), false);
          project.details = { ...project.details, startDate: body.timeline.startDate, actualEndDate: body.timeline.actualEndDate };
        }
        return ok(project);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    // Use the real Metro client bundle without depending on Expo SSR startup.
    await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' })
      : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const settings = async () => {
      await page.goto(origin + '/group/' + project.id, { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: /Cài đặt/ }).click();
    };
    await settings();
    assert.equal(await page.getByRole('heading', { name: 'Trạng thái dự án', exact: true }).count(), 0);
    assert.equal(await page.getByText('Ngày dự kiến kết thúc', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Dự kiến kết thúc', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Ngày kết thúc thực tế', { exact: true }).count(), 0);
    const dateControls = await Promise.all(['Cập nhật ngày bắt đầu', 'Cập nhật ngày kết thúc'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
    assert.ok(dateControls.every(box => Math.abs(box.y - dateControls[0].y) < 2), 'Desktop dates share a row');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-settings-reference-desktop.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    const completion = page.getByRole('dialog', { name: 'Hoàn thành dự án?', exact: true });
    await completion.waitFor();
    await completion.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes.length, 0);
    await page.getByRole('button', { name: 'Xóa dự án', exact: true }).click();
    const deletion = page.getByRole('dialog', { name: 'Xóa dự án?', exact: true });
    await deletion.waitFor();
    await deletion.getByRole('button', { name: 'Hủy', exact: true }).click();
    const open = label => page.getByRole('button', { name: label, exact: true }).click();
    await open('Cập nhật ngày kết thúc');
    const modal = page.getByRole('dialog', { name: 'Cập nhật ngày kết thúc', exact: true });
    await modal.waitFor();
    const calendarFrame = await modal.boundingBox();
    assert.ok(calendarFrame.width <= 440 && calendarFrame.height < 650, 'Calendar popup is compact');
    const titleSize = await modal.getByRole('heading', { name: 'Cập nhật ngày kết thúc', exact: true }).evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    assert.ok(titleSize <= 18, 'Popup title stays proportionate');
    await modal.getByRole('button', { name: 'Chọn tháng và năm', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn năm', exact: true }).click();
    await modal.getByRole('button', { name: '12 năm sau', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn năm 2028', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn tháng 2', exact: true }).click();
    assert.equal(await modal.getByRole('button', { name: 'Chọn ngày 29/02/2028', exact: true }).isDisabled(), true);
    await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes.length, 0);
    await open('Cập nhật ngày kết thúc');
    await modal.getByText('31/01/2026', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Chọn ngày 20/01/2026', exact: true }).click();
    await modal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(writes[0], { timeline: { startDate: '2026-01-01', actualEndDate: '2026-01-20' } });
    await settings();
    await open('Cập nhật ngày kết thúc');
    await modal.getByText('20/01/2026', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Tháng trước', exact: true }).click();
    assert.equal(await modal.getByRole('button', { name: 'Chọn ngày 31/12/2025', exact: true }).getAttribute('aria-disabled'), 'true');
    await modal.getByRole('button', { name: 'Tháng sau', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn ngày 21/01/2026', exact: true }).click();
    failNext = true;
    await modal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await modal.getByRole('alert').waitFor();
    await modal.getByText('21/01/2026', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileDates = await Promise.all(['Cập nhật ngày bắt đầu', 'Cập nhật ngày kết thúc'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
    assert.ok(mobileDates[0].y < mobileDates[1].y, 'Mobile dates stack');
    await page.getByRole('tabpanel', { name: 'Cài đặt dự án', exact: true }).screenshot({ path: 'C:/Users/minec/UniNet/project-settings-reference-mobile.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Xóa dự án', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-settings-management-mobile.png', animations: 'disabled' });
    await open('Cập nhật ngày kết thúc');
    const frame = await modal.boundingBox(); assert.ok(frame.width <= 375 && frame.x >= 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await modal.getByRole('button', { name: 'Chọn tháng và năm', exact: true }).click();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-calendar-quick-picker-mobile.png', animations: 'disabled' });
    await modal.getByRole('button', { name: 'Chọn năm', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn năm 2026', exact: true }).click();
    await modal.getByRole('button', { name: 'Chọn tháng 1', exact: true }).click();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-timeline-popup-mobile.png', animations: 'disabled' });
    await modal.getByRole('button', { name: 'Xóa ngày', exact: true }).click();
    await modal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).timeline.actualEndDate, null);
    await open('Cập nhật ngày bắt đầu');
    const startModal = page.getByRole('dialog', { name: 'Cập nhật ngày bắt đầu', exact: true });
    await startModal.getByRole('button', { name: 'Chọn ngày 02/01/2026', exact: true }).click();
    await startModal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await startModal.waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).timeline.startDate, '2026-01-02');
    await open('Cập nhật ngày kết thúc');
    const actualModal = page.getByRole('dialog', { name: 'Cập nhật ngày kết thúc', exact: true });
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await actualModal.getByRole('button', { name: 'Tháng sau', exact: true }).click();
    const nextMonth = new Date(`${today}T12:00:00`); nextMonth.setDate(1); nextMonth.setMonth(nextMonth.getMonth() + 1);
    const future = `01/${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`;
    assert.equal(await actualModal.getByRole('button', { name: `Chọn ngày ${future}`, exact: true }).getAttribute('aria-disabled'), 'true');
    await actualModal.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    project.details.startDateIsCreationDate = true;
    await settings();
    assert.equal(await page.getByRole('button', { name: 'Cập nhật ngày bắt đầu', exact: true }).isEnabled(), true);
    await open('Cập nhật ngày bắt đầu');
    await startModal.getByRole('button', { name: 'Chọn ngày 01/01/2026', exact: true }).click();
    await startModal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await startModal.waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).timeline.startDate, '2026-01-01');
    await settings();
    await page.getByRole('button', { name: 'Cập nhật ngày bắt đầu', exact: true }).getByText('01/01/2026', { exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open('Cập nhật ngày kết thúc');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-timeline-popup-desktop.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log('Timeline popup checks passed: editable creation start, independent dates, cancel, persistence, bounds, clear, retry, Escape and mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
