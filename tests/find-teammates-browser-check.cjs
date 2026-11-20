const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.FIND_TEAMMATES_TEST_ORIGIN || 'http://localhost:8095';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  const errors = [], writes = [], queries = [], applications = [];
  let failDiscover = false;
  const data = structuredClone(sample); data.isOwner = true;
  const account = { id: 'student-viewer', email: 'viewer@example.test', role: 0, profileComplete: true, profile: data.profile };
  const project = (id, title, extra = {}) => ({ id, title, description: 'Dự án kết nối sinh viên cùng học tập', logoUrl: null, technologies: ['React', 'C#'], status: 1, visibility: 1, isOwner: false, isMember: false,
    creator: { id: 'owner-' + id, fullName: 'Nguyễn Minh Anh', avatarUrl: null }, members: [],
    details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, actualEndDate: null, completedAt: null },
    recruitment: { id: 'recruit-' + id, status: 1, description: 'Tìm đồng đội xây dựng ứng dụng học tập cho sinh viên.', deadline: '2030-12-31T10:30:00Z', publishedAt: '2026-11-18T08:00:00Z', positions: [
      { id: 'backend', name: 'Backend Developer', quantity: 2, technologies: ['C#'], skills: ['Git'], requirements: ['Làm việc nhóm'], jobDescription: '', benefits: [] },
      { id: 'design', name: 'UI Designer', quantity: 1, technologies: ['Figma'], skills: [], requirements: [], jobDescription: '', benefits: [] },
    ] }, myReview: null, chatRoomId: null, createdAt: '2026-11-18T08:00:00Z', updatedAt: '2026-11-18T08:00:00Z', ...extra });
  const posts = [project('study-buddy', 'Study Buddy'), project('design-studio', 'Design Studio'), project('own-project', 'Dự án của tôi', { isOwner: true }), project('member-project', 'Dự án đang tham gia', { isMember: true })];
  const member = (userId, status = 0) => ({ id: `membership-${userId}`, userId, fullName: userId, avatarUrl: null, role: '', positionId: 'backend', status, joinedAt: '2026-11-18T08:00:00Z' });
  posts[0].members = [member(posts[0].creator.id), member('accepted-applicant'), member('kicked-applicant', 1), member('left-applicant', 2)];
  posts[0].logoUrl = 'https://fixture.test/technology/project-cover.svg';
  posts[1].members = [member(posts[1].creator.id)];
  const logoUrl = name => `https://fixture.test/technology/${encodeURIComponent(name)}.svg`;
  try {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fixture.test/technology/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#1689ff"/></svg>' }));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/profile/skills')) return ok(['React', 'C#', 'Git', 'Figma'].map(name => ({ id: name, name, iconUrl: logoUrl(name), category: 'Backend' })));
      if (path.endsWith('/project-hub/mine')) return ok({ items: [], total: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/project-hub/discover')) {
        queries.push(url.searchParams.toString());
        if (failDiscover) { failDiscover = false; return route.fulfill({ status: 503, json: { message: 'Không tải được bài tuyển.' } }); }
        const number = Number(url.searchParams.get('page') || 1), q = url.searchParams.get('q') || '';
        const items = q === 'không có' ? [] : q ? posts.filter(p => p.title.toLowerCase().includes(q.toLowerCase())) : number === 1 ? posts : [project('last-post', 'Dự án trang hai')];
        return ok({ items, total: q ? items.length : 13, page: number, pageSize: 12 });
      }
      if (path.endsWith('/project-hub/requests/mine')) return ok({ items: applications.filter(item => item.projectId === url.searchParams.get('projectId')) });
      const match = path.match(/\/project-hub\/([^/]+)(\/requests)?$/);
      if (match) {
        const p = posts.find(p => p.id === match[1]) || project(match[1], 'Dự án trang hai');
        if (match[2] && method === 'POST') {
          const body = route.request().postDataJSON(); writes.push(body);
          const request = { id: 'application-1', projectId: p.id, projectTitle: p.title, userId: data.profile.id, requestType: 0, status: 0, positionId: body.positionId, role: '', message: body.message, fullName: data.profile.fullName, avatarUrl: null, createdAt: new Date().toISOString() };
          applications.push(request); return ok(request);
        }
        return ok(p);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route(origin + '/**', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/profile/projects', { waitUntil: 'domcontentloaded' });
    const header = page.getByRole('tab', { name: 'Hợp tác', exact: true });
    await header.waitFor();
    assert.equal(await header.count(), 1, 'Student header must expose Find teammates');
    await header.click(); await page.waitForURL('**/find-teammates');
    await page.getByRole('heading', { name: 'Tìm đồng đội', exact: true }).waitFor();
    assert.equal(await header.getAttribute('aria-selected'), 'true');
    const card = id => page.getByTestId('recruitment-post-' + id);
    await card('study-buddy').getByText('Study Buddy', { exact: true }).waitFor();
    await card('study-buddy').getByText('Tìm đồng đội xây dựng ứng dụng học tập cho sinh viên.', { exact: true }).waitFor();
    const projectImage = card('study-buddy').getByRole('img', { name: 'Ảnh dự án Study Buddy', exact: true });
    await projectImage.waitFor({ state: 'attached' });
    await projectImage.evaluate(image => image.decode());
    const imageBounds = await projectImage.boundingBox();
    assert.ok(imageBounds.width >= 55 && imageBounds.height >= 55, 'project cover must have a visible frame on recruitment cards');
    assert.equal(await projectImage.getAttribute('src'), posts[0].logoUrl);
    assert.match(await card('study-buddy').textContent(), /Tuyển: 3 thành viên/);
    assert.match(await card('study-buddy').textContent(), /Đã tham gia: 1 thành viên/);
    assert.match(await card('study-buddy').textContent(), /Đã có 1 thành viên tham gia/);
    assert.match(await card('design-studio').textContent(), /Đã tham gia: 0 thành viên/);
    assert.match(await card('design-studio').textContent(), /Trở thành đồng đội đầu tiên/);
    for (const name of ['React', 'C#', 'Git', 'Figma']) {
      const logo = card('study-buddy').getByRole('img', { name: `Icon ${name}`, exact: true });
      await logo.waitFor();
      await logo.evaluate(image => image.decode());
      assert.equal(await logo.getAttribute('src'), logoUrl(name));
    }
    await page.screenshot({ path: 'C:/Users/minec/UniNet/find-teammates-desktop.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await card('last-post').waitFor();
    await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
    await card('study-buddy').waitFor();
    const search = page.getByRole('textbox', { name: 'Tìm tên hoặc mô tả dự án', exact: true });
    async function find(value) { await search.fill(value || ' '); await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click(); }
    await find('Design'); await card('design-studio').waitFor(); assert.equal(await card('study-buddy').count(), 0);
    await find('không có'); await page.getByText('Chưa tìm thấy bài tuyển phù hợp', { exact: true }).waitFor();
    failDiscover = true; await find('Study'); await page.getByRole('alert').waitFor();
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await card('study-buddy').waitFor();
    await find(''); await card('own-project').waitFor();
    const overview = page.getByRole('dialog', { name: 'Thông tin tuyển thành viên', exact: true });
    const closeOverview = () => overview.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    for (const id of ['own-project', 'member-project']) {
      await card(id).getByRole('button', { name: 'Tham gia', exact: true }).click();
      await overview.getByText('Backend Developer', { exact: true }).waitFor();
      if (id === 'own-project') await overview.screenshot({ path: 'C:/Users/minec/UniNet/recruitment-popup-desktop.png', animations: 'disabled' });
      assert.equal(await overview.getByRole('button', { name: 'Xin tham gia', exact: true }).count(), 0);
      assert.equal(await overview.getByRole('button', { name: 'Chỉnh sửa', exact: true }).count(), 0);
      await closeOverview();
    }
    posts[0].recruitment.status = 2;
    await card('study-buddy').getByRole('button', { name: 'Tham gia', exact: true }).click();
    await overview.getByText('Đã đóng tuyển', { exact: true }).waitFor();
    assert.equal(await overview.getByRole('button', { name: 'Xin tham gia', exact: true }).count(), 0);
    await closeOverview(); posts[0].recruitment.status = 1;
    await card('study-buddy').getByRole('button', { name: 'Tham gia', exact: true }).click();
    await overview.getByRole('button', { name: 'Xin tham gia', exact: true }).click();
    const apply = page.getByRole('dialog', { name: 'Ứng tuyển vào dự án', exact: true });
    await apply.getByRole('radio').filter({ hasText: 'UI Designer' }).click();
    await apply.getByRole('textbox', { name: 'Lời nhắn ứng tuyển', exact: true }).fill('  Em muốn tham gia thiết kế.  ');
    await apply.screenshot({ path: 'C:/Users/minec/UniNet/project-apply-desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await apply.getByRole('radio').filter({ hasText: 'UI Designer' }).getAttribute('aria-checked'), 'true');
    const applyBounds = await apply.boundingBox();
    assert.ok(applyBounds.width <= 355 && applyBounds.height <= 792);
    await apply.screenshot({ path: 'C:/Users/minec/UniNet/project-apply-mobile.png', animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await apply.getByRole('button', { name: 'Gửi ứng tuyển', exact: true }).click();
    await overview.getByText('Bạn đã gửi yêu cầu tham gia, đang chờ phản hồi.', { exact: true }).waitFor();
    assert.equal(writes.length, 1); assert.equal(writes[0].requestType, 0); assert.equal(writes[0].positionId, 'design'); assert.equal(writes[0].message, 'Em muốn tham gia thiết kế.');
    await closeOverview();
    await card('study-buddy').getByRole('button', { name: 'Tham gia', exact: true }).click();
    await overview.getByText('Bạn đã gửi yêu cầu tham gia, đang chờ phản hồi.', { exact: true }).waitFor();
    await page.keyboard.press('Escape'); await overview.waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 1024, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.getByRole('button', { name: 'Hợp tác', exact: true }).click();
    await card('study-buddy').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/find-teammates-mobile.png', animations: 'disabled' });
    await card('own-project').getByRole('button', { name: 'Tham gia', exact: true }).click();
    await overview.getByText('Backend Developer', { exact: true }).waitFor();
    const popupBounds = await overview.boundingBox();
    assert.ok(popupBounds.width <= 355 && popupBounds.height <= 792);
    await overview.getByRole('button', { name: 'Xem dự án', exact: true }).waitFor({ state: 'visible' });
    await overview.screenshot({ path: 'C:/Users/minec/UniNet/recruitment-popup-mobile.png', animations: 'disabled' });
    await closeOverview();
    assert.ok(queries.some(q => q.includes('page=2')));
    assert.deepEqual(errors, []);
    console.log('Find teammates checks passed: header/menu, browse/search/page, empty/retry, fresh status, application/pending, owner/member, responsive.');
  } catch (error) {
    console.error((await page.locator('[role="dialog"]').allTextContents()).join('\n').slice(-1500));
    await page.screenshot({ path: 'C:/Users/minec/UniNet/find-teammates-error.png', animations: 'disabled' }); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
