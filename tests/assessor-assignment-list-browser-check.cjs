const assert = require('node:assert/strict'), fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.ASSESSOR_TEST_ORIGIN || 'http://localhost:8086';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ timezoneId: 'Asia/Ho_Chi_Minh' }); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(origin + '/**', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(v => { if (String(v).includes('protocol')) socket.send('{}\x1e'); }));
    const titles = ['GreenSpace - Sustainable Living App', 'Nền tảng kết nối và quản lý dự án nghiên cứu liên ngành cho sinh viên đại học', 'UniStudy'];
    const rows = titles.map((_, i) => ({ id: `assignment-${i}`, status: i, assignedAt: '2026-11-02T06:19:00Z', reportDueAt: i === 1 ? null : '2026-11-30T08:30:00Z', scheduledStartAt: '2026-11-26T02:00:00Z', scheduledEndAt: '2026-11-26T03:00:00Z', meetingStartAt: null, meetingEndAt: null }));
    let fail = false, reads = 0;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      const ok = json => route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } });
      if (path.endsWith('/auth/me')) return ok({ id: 'user', role: 2, status: 1, profileComplete: true, profile: { id: 'profile', fullName: 'Chuyên gia UniNet' } });
      if (path.endsWith('/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/assignments/me')) {
        reads++;
        if (fail) return route.fulfill({ status: 503, json: { message: 'Không tải được danh sách thử nghiệm.' } });
        const filtered = url.searchParams.has('status') ? rows.filter(r => r.status === Number(url.searchParams.get('status'))) : rows;
        const number = Number(url.searchParams.get('page'));
        return ok({ page: number, pageSize: 2, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / 2), assignments: filtered.slice((number - 1) * 2, number * 2) });
      }
      const index = rows.findIndex(r => path.endsWith('/assignments/' + r.id));
      if (index >= 0) return ok({ assignment: rows[index], project: { id: `project-${index}`, title: titles[index], projectField: 'Công nghệ phần mềm', description: 'Dự án sinh viên UniNet.', status: 2 }, report: null, assessmentRubric: null });
      if (path.endsWith('/meeting')) return ok({ joinUrl: null, scheduledStartAt: rows[0].scheduledStartAt, scheduledEndAt: rows[0].scheduledEndAt });
      return ok([]);
    });
    const list = () => page.getByRole('region', { name: 'Danh sách hồ sơ thẩm định', exact: true });
    fs.mkdirSync('dist/assessor-assignment-list-check', { recursive: true });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await page.goto(origin + '/assessor-assessments');
      await list().getByRole('button', { name: 'Xem thẩm định ' + titles[0], exact: true }).waitFor();
      await list().getByText('Chưa cập nhật', { exact: true }).waitFor();
      assert.equal(await page.getByText('Thẩm định & Đánh giá', { exact: true }).count(), 0);
      assert.equal(await list().evaluate(el => el.scrollWidth > el.clientWidth), false, `list overflow ${width}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const first = list().getByRole('button', { name: 'Xem thẩm định ' + titles[0], exact: true });
      assert.equal(await first.evaluate(el => getComputedStyle(el).boxShadow), 'none');
      if (width >= 1100) assert((await first.boundingBox()).height <= 90, 'compact desktop row');
      if (width < 700) assert((await page.getByRole('button', { name: 'Trang sau', exact: true }).boundingBox()).height >= 44, 'phone pagination retains a usable touch target');
      await page.screenshot({ path: `dist/assessor-assignment-list-check/list-${width}.png` });
      await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
      await page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
      await list().getByRole('button', { name: 'Xem thẩm định ' + titles[1], exact: true }).waitFor();
      assert.equal(await list().getByRole('button').count(), 1);
      await page.getByRole('button', { name: 'Đã hủy', exact: true }).click();
      await page.getByText('Không có công việc ở trạng thái này', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
      await list().getByText(titles[0], { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
      await list().getByText(titles[2], { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
      await list().getByText(titles[0], { exact: true }).waitFor();
    }
    fail = true; await page.getByRole('button', { name: 'Tải lại danh sách thẩm định', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Không tải được danh sách thử nghiệm.' }).first().waitFor();
    fail = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await list().getByText(titles[0], { exact: true }).waitFor();
    await list().getByRole('button', { name: 'Xem thẩm định ' + titles[0], exact: true }).click();
    await page.waitForURL(/assessor-assessments\/assignment-0$/);
    await page.getByRole('region', { name: 'Chi tiết thẩm định', exact: true }).waitFor();
    assert(reads > 5); assert.deepEqual(errors, []);
    console.log('PASS: compact assignment list at five widths, status filters, pagination, retry and detail navigation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
