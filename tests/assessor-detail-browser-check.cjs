const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const runtime = process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const root = path.resolve('dist/assessor-detail-web');
const liveOrigin = process.env.ASSESSOR_DETAIL_TEST_ORIGIN;
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (name.startsWith('assessor-assessments/')) name = 'assessor-assessments/[id]';
  let file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  else if (!fs.existsSync(file)) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', type); fs.createReadStream(file).pipe(res);
});
(async () => {
  if (!liveOrigin) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = liveOrigin || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ timezoneId: 'Asia/Ho_Chi_Minh' });
    if (liveOrigin) await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const profile = { id: 'profile', fullName: 'Chuyên gia UniNet', nickname: null, avatarUrl: null, isVerified: false };
    const account = { id: 'user', email: 'fixture@example.com', role: 2, status: 1, profileComplete: true, profile };
    const rubric = { code: 'project', version: '1', passingScore: 65, criteria: Array.from({ length: 4 }, (_, i) => ({ code: `c${i}`, name: ['Vấn đề và yêu cầu', 'Kiến trúc và thiết kế', 'Chất lượng mã nguồn', 'Khả năng triển khai'][i], weight: 25 })), conditions: [{ code: 'demo', description: 'Có demo, sản phẩm hoặc tài liệu để kiểm tra' }] };
    const data = { project: { id: 'project', title: 'GreenSpace - Sustainable Living App', projectField: 'Environmental Technology', description: 'Ứng dụng giúp người dùng xây dựng thói quen sống xanh, theo dõi tác động môi trường và tham gia các hoạt động cộng đồng.', status: 2 }, assignment: { id: 'fixture', status: 1, assignedAt: '2026-11-02T06:19:00Z', scheduledStartAt: '2026-11-02T08:00:00Z', meetingStartAt: '2026-11-02T08:00:00Z', meetingEndAt: '2026-11-02T09:00:00Z', completedAt: '2026-11-04T08:36:00Z' }, report: { summary: 'Dự án đáp ứng yêu cầu đánh giá.', recommendations: 'Bổ sung kiểm thử phân quyền và xử lý lỗi.', submittedAt: '2026-11-04T08:36:00Z', outcome: 1, assessment: { rubric, totalScore: 72, outcome: 1, scores: rubric.criteria.map(c => ({ code: c.code, score: 72, reason: 'Đã kiểm tra theo tài liệu dự án.', evidence: 'Báo cáo thử nghiệm.' })), conditions: [{ code: 'demo', passed: true, reason: 'Đã kiểm tra bản demo.' }] } }, evidenceModeration: null };
    for (let i = 2; i <= 4; i++) {
      rubric.conditions.push({ code: `condition-${i}`, description: `Required condition ${i}` });
      data.report.assessment.conditions.push({ code: `condition-${i}`, passed: true, reason: `Verified condition ${i}` });
    }
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(v => { if (String(v).includes('protocol')) socket.send('{}\x1e'); }));
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      let json = [];
      if (pathname.endsWith('/auth/me')) json = account;
      else if (pathname.endsWith('/assignments/fixture')) json = data;
      else if (pathname.endsWith('/meeting')) json = { assignmentId: 'fixture', meetingStartAt: data.assignment.meetingStartAt, meetingEndAt: data.assignment.meetingEndAt };
      else if (pathname.endsWith('/unread-count')) json = { count: 0 };
      await route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    const output = path.join(root, 'checks'); fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + '/assessor-assessments/fixture');
      await page.getByRole('heading', { name: 'Tổng quan kết quả', exact: true }).waitFor();
      const hero = page.getByRole('region', { name: 'Chi tiết thẩm định', exact: true });
      assert.equal(await hero.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'Light, neutral project header');
      assert.equal(await page.getByRole('tab', { name: 'Minh chứng', exact: true }).count(), 0);
      await page.getByText('Required condition 4', { exact: true }).waitFor();
      await page.getByText('Verified condition 4', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Chi tiết tiêu chí Vấn đề và yêu cầu', exact: true }).click();
      await page.getByText('Đã kiểm tra theo tài liệu dự án.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Xem tất cả|Thu gọn/ }).count(), 0, 'All result rows appear without a show-all control');
      await page.getByText('Khả năng triển khai', { exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      await page.screenshot({ path: path.join(output, `results-${width}.png`), fullPage: true });
      await page.getByRole('tab', { name: 'Thông tin', exact: true }).click();
      await page.getByRole('heading', { name: 'Giới thiệu dự án', exact: true }).waitFor();
      assert.equal(await page.getByText('Hạn báo cáo', { exact: true }).count(), 0);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `info overflow at ${width}`);
      await page.screenshot({ path: path.join(output, `info-${width}.png`), fullPage: true });
      await page.getByTestId('assessor-content').getByRole('tab', { name: 'Lịch làm việc', exact: true }).click();
      const schedule = page.getByRole('region', { name: 'Lịch và phòng thẩm định', exact: true });
      await schedule.waitFor();
      const borders = await schedule.evaluate(el => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderTopColor, s.borderLeftColor]; });
      assert.deepEqual(borders.slice(0, 4), ['1px', '1px', '1px', '1px'], 'No thick accent border');
      assert.equal(borders[4], borders[5], 'Neutral, equal card borders');
      await page.getByRole('tab', { name: 'Nhật ký', exact: true }).click();
      await page.getByRole('heading', { name: 'Nhật ký thẩm định', exact: true }).waitFor();
    }
    data.report = null; data.assignment.status = 0; data.assignment.completedAt = null;
    data.assignment.meetingEndAt = null; data.assessmentRubric = rubric;
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + '/assessor-assessments/fixture');
      const meeting = page.getByRole('region', { name: 'Lịch và phòng thẩm định', exact: true });
      await meeting.waitFor();
      const meetingButton = page.getByRole('button', { name: 'Tạo / lấy phòng họp', exact: true });
      assert.ok((await meetingButton.boundingBox()).height <= (width < 700 ? 44 : 36));
      assert.equal(await meeting.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({ path: path.join(output, `schedule-${width}.png`), fullPage: false });
      await page.getByRole('tab', { name: 'Lập báo cáo', exact: true }).click();
      const report = page.getByRole('region', { name: 'Báo cáo thẩm định', exact: true });
      await report.waitFor();
      assert.equal(await report.evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
      await page.getByRole('textbox', { name: 'Tóm tắt thẩm định', exact: true }).fill('Báo cáo thử nghiệm giao diện.');
      assert.equal(await report.evaluate(el => el.scrollWidth > el.clientWidth), false, `Report fits ${width}px`);
      const button = page.getByRole('button', { name: 'Gửi báo cáo', exact: true });
      assert.ok((await button.boundingBox()).height <= (width < 700 ? 44 : 36));
      await page.screenshot({ path: path.join(output, `report-${width}.png`), fullPage: false });
    }
    assert.deepEqual(errors, []); console.log('PASS: detail tabs, expanding criteria, missing fields, and responsive layouts at 1440/1024/768/390/320px');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
