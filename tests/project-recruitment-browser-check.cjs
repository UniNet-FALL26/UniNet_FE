const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_RECRUITMENT_TEST_ORIGIN || 'http://localhost:8086';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    page.setDefaultTimeout(20000);
    const errors = [], writes = [];
    let catalogFails = false;
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample); data.isOwner = true;
    const account = { id: 'recruitment-owner', email: 'recruitment@example.test', role: 0, profileComplete: true, profile: data.profile };
    const position = (id, name) => ({ id, name, quantity: 1, technologies: ['C#', 'PostgreSQL'], skills: ['Git', 'REST API'], jobDescription: 'Existing description', requirements: ['Weekly meeting'], benefits: ['Existing benefit'] });
    const project = { id: 'compact-recruitment', title: 'Recruitment fixture', description: 'Compact positions', technologies: [], origin: 0, status: 1, visibility: 1, mode: 'community', isOwner: true, isMember: true, creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [], details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, endDate: null, completedAt: null }, recruitment: { id: 'recruitment', description: 'Existing introduction', status: 1, positions: [position('be', 'Backend'), position('fe', 'Frontend')], deadline: null }, myReview: null, createdAt: '2026-11-17T00:00:00Z' };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/profile/skills')) {
        if (catalogFails) { catalogFails = false; return route.fulfill({ status: 503, json: { message: 'Catalog unavailable' } }); }
        return ok(['C#', 'PostgreSQL', 'Git', 'REST API', 'Docker'].map(name => ({ id: name, name, iconUrl: null, category: 'Backend' })));
      }
      if (path.endsWith('/project-hub/' + project.id + '/requests')) return ok({ items: [
        { id: 'applicant', fullName: 'Nguyễn Minh Anh', avatarUrl: null, role: 'Backend Developer', requestType: 0, status: 0, message: 'Mình có kinh nghiệm và muốn cùng nhóm phát triển dự án.' },
        { id: 'invited', fullName: 'Trần Ngọc Linh', avatarUrl: null, role: 'UI Designer', requestType: 1, status: 0, message: '' },
      ] });
      if (path.endsWith('/project-hub/' + project.id + '/recruitment')) {
        assert.equal(method, 'PUT');
        const body = route.request().postDataJSON(); writes.push(body);
        project.recruitment = { ...project.recruitment, ...body };
        return ok(project);
      }
      if (path.endsWith('/project-hub/' + project.id)) return ok(project);
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    if (process.env.PROJECT_RECRUITMENT_CLIENT_RENDER === '1') {
      // Exercise the real client bundle when the local Expo SSR process stalls.
      await page.route(origin + '/**', route => route.request().isNavigationRequest()
        ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' })
        : route.fallback());
    }
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('input').length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/group/' + project.id, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Thành viên/ }).click();
    await page.getByRole('button', { name: 'Lời mời', exact: true }).click();
    const requests = page.getByRole('dialog', { name: 'Lời mời', exact: true });
    await requests.getByTestId('project-request-applicant').waitFor();
    for (const name of ['Chấp nhận', 'Từ chối', 'Hủy lời mời']) {
      const bounds = await requests.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(bounds.height <= 32);
    }
    await requests.screenshot({ path: 'C:/Users/minec/UniNet/project-requests-desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 375, height: 812 });
    await requests.screenshot({ path: 'C:/Users/minec/UniNet/project-requests-mobile.png', animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (process.env.PROJECT_REQUESTS_ONLY === '1') {
      assert.deepEqual(errors, []);
      console.log('Request cards passed: applicants, invitations, compact actions, desktop/mobile.');
      return;
    }
    const open = () => page.getByRole('button', { name: 'Tuyển', exact: true }).click();
    await open();
    const overview = page.getByRole('dialog', { name: 'Thông tin tuyển thành viên', exact: true });
    await overview.waitFor();
    assert.equal(await overview.getByRole('textbox').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Lưu nháp', exact: true }).count(), 0);
    await overview.getByText('Backend', { exact: true }).waitFor();
    await overview.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Chỉnh sửa tuyển thành viên', exact: true });
    const input = modal.getByRole('textbox', { name: 'Tên vị trí 1 *', exact: true });
    await input.waitFor();
    const introduction = modal.getByRole('textbox', { name: 'Giới thiệu ngắn', exact: true });
    assert.equal(await introduction.inputValue(), 'Existing introduction');
    const bounds = await modal.boundingBox(), inputBounds = await input.boundingBox();
    assert.ok(bounds.width <= 700 && inputBounds.height <= 40);
    for (const label of [/Giới thiệu tuyển/, /Mô tả công việc/, /^Công nghệ —/, /^Kỹ năng —/, /Quyền lợi/]) assert.equal(await modal.getByRole('textbox', { name: label }).count(), 0);
    const competenciesButton = modal.getByRole('button', { name: 'Chọn kỹ năng & công nghệ — vị trí 1', exact: true });
    for (const name of ['C#', 'PostgreSQL', 'Git', 'REST API']) await competenciesButton.getByText(name, { exact: true }).waitFor();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-compact-desktop.png', animations: 'disabled' });
    await input.fill('Discard edit');
    await introduction.fill('Discard introduction');
    await modal.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes.length, 0);
    await overview.getByText('Backend', { exact: true }).waitFor();
    await overview.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    assert.equal(await input.inputValue(), 'Backend');
    assert.equal(await introduction.inputValue(), 'Existing introduction');
    await input.fill('');
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await modal.getByRole('alert').waitFor(); assert.equal(writes.length, 0);
    await input.fill('Backend developer');
    await introduction.fill('  Tuyển đồng đội cùng xây dựng sản phẩm hữu ích.  ');
    catalogFails = true;
    await competenciesButton.click();
    const competencies = page.getByRole('dialog', { name: 'Chọn kỹ năng & công nghệ', exact: true });
    await competencies.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
    await competencies.getByRole('checkbox', { name: 'Docker', exact: true }).click();
    await competencies.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(await input.inputValue(), 'Backend developer');
    for (const name of ['C#', 'PostgreSQL', 'Git', 'REST API']) await competenciesButton.getByText(name, { exact: true }).waitFor();
    await competenciesButton.click();
    await competencies.getByRole('textbox', { name: 'Tìm kỹ năng hoặc công nghệ', exact: true }).fill('Docker');
    assert.equal(await competencies.getByRole('checkbox').count(), 1);
    await competencies.getByRole('checkbox', { name: 'Docker', exact: true }).click();
    await competencies.getByRole('textbox', { name: 'Tìm kỹ năng hoặc công nghệ', exact: true }).fill('PostgreSQL');
    await competencies.getByRole('checkbox', { name: 'PostgreSQL', exact: true }).click();
    await competencies.getByRole('textbox', { name: 'Tìm kỹ năng hoặc công nghệ', exact: true }).fill('REST API');
    await competencies.getByRole('checkbox', { name: 'REST API', exact: true }).click();
    await competencies.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    for (const name of ['C#', 'Git', 'Docker']) await competenciesButton.getByText(name, { exact: true }).waitFor();
    assert.equal(await competenciesButton.getByText('PostgreSQL', { exact: true }).count(), 0);
    assert.equal(writes.length, 0);
    await modal.getByRole('button', { name: 'Chọn ngày và giờ', exact: true }).click();
    const deadlinePicker = page.getByRole('dialog', { name: 'Chọn hạn tuyển', exact: true });
    const futureDay = new Date(Date.now() + 7 * 3600000 + 2 * 86400000).toISOString().slice(0, 10);
    const todayDay = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    if (futureDay.slice(0, 7) !== todayDay.slice(0, 7)) await deadlinePicker.getByRole('button', { name: 'Tháng sau', exact: true }).click();
    await deadlinePicker.getByRole('button', { name: `Chọn ngày ${futureDay.split('-').reverse().join('/')}`, exact: true }).click();
    await deadlinePicker.getByRole('textbox', { name: 'Giờ (00–23)', exact: true }).fill('25');
    await deadlinePicker.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await deadlinePicker.getByRole('alert').waitFor();
    await deadlinePicker.getByRole('textbox', { name: 'Giờ (00–23)', exact: true }).fill('14');
    await deadlinePicker.getByRole('textbox', { name: 'Phút (00–59)', exact: true }).fill('35');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-deadline-desktop.png', animations: 'disabled' });
    await deadlinePicker.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    const deadlineLabel = `${futureDay.split('-').reverse().join('/')} · 14:35`;
    await modal.getByRole('button', { name: deadlineLabel, exact: true }).click();
    await deadlinePicker.getByRole('textbox', { name: 'Giờ (00–23)', exact: true }).fill('10');
    await deadlinePicker.getByRole('button', { name: 'Hủy', exact: true }).click();
    await modal.getByRole('button', { name: deadlineLabel, exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Thêm vị trí tuyển', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Tên vị trí 3 *', exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Gỡ vị trí 3', exact: true }).click();
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(writes[0].status, 1); assert.equal(writes[0].description, 'Tuyển đồng đội cùng xây dựng sản phẩm hữu ích.');
    assert.equal(writes[0].deadline, new Date(`${futureDay}T14:35:00+07:00`).toISOString());
    assert.equal(writes[0].positions[0].jobDescription, 'Existing description');
    assert.deepEqual(writes[0].positions[0].benefits, ['Existing benefit']);
    assert.deepEqual(writes[0].positions[0].technologies, ['C#', 'Docker']);
    assert.deepEqual(writes[0].positions[0].skills, ['Git']);
    assert.deepEqual(writes[0].positions[1], position('fe', 'Frontend'));
    await page.setViewportSize({ width: 375, height: 812 });
    await overview.getByText('Backend developer', { exact: true }).waitFor();
    await overview.getByText('Tuyển đồng đội cùng xây dựng sản phẩm hữu ích.', { exact: true }).waitFor();
    assert.equal(await overview.getByRole('textbox').count(), 0);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-overview-mobile.png', animations: 'disabled' });
    await overview.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await open();
    await overview.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await input.waitFor();
    assert.equal(await input.inputValue(), 'Backend developer');
    const frame = await modal.boundingBox(); assert.ok(frame.width <= 375 && frame.x >= 0);
    await competenciesButton.click();
    await competencies.getByRole('checkbox', { name: 'Docker', exact: true }).waitFor();
    const pickerFrame = await competencies.boundingBox(); assert.ok(pickerFrame.width <= 375 && pickerFrame.x >= 0);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-skills-mobile.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await competencies.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-compact-mobile.png', animations: 'disabled' });
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await modal.waitFor({ state: 'hidden' }); assert.equal(writes.at(-1).status, 1);
    await overview.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await open();
    assert.equal(await overview.getByRole('textbox').count(), 0);
    await overview.getByRole('button', { name: 'Đóng tuyển', exact: true }).click();
    await overview.getByText('Đã đóng tuyển', { exact: true }).waitFor();
    assert.equal(writes.at(-1).status, 2);
    await overview.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    project.recruitment = null;
    await page.goto(origin + '/group/' + project.id, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Thành viên/ }).click();
    await page.getByRole('button', { name: 'Lời mời', exact: true }).click();
    await open();
    const create = page.getByRole('dialog', { name: 'Đăng tuyển thành viên', exact: true });
    assert.equal(await create.getByRole('button', { name: 'Lưu nháp', exact: true }).count(), 0);
    await create.getByRole('textbox', { name: 'Tên vị trí 1 *', exact: true }).fill('New position');
    await create.getByRole('textbox', { name: 'Giới thiệu ngắn', exact: true }).fill('Cùng tham gia dự án mới.');
    await create.getByRole('button', { name: 'Đăng tuyển', exact: true }).click();
    await create.waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).status, 1);
    assert.equal(writes.at(-1).description, 'Cùng tham gia dự án mới.');
    await open();
    await overview.getByText('New position', { exact: true }).waitFor();
    await overview.getByText('Cùng tham gia dự án mới.', { exact: true }).waitFor();
    await overview.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await introduction.fill('   ');
    await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).description, null);
    assert.equal(await overview.getByText('Cùng tham gia dự án mới.', { exact: true }).count(), 0);
    assert.equal(await overview.getByRole('textbox').count(), 0);
    assert.ok(writes.every(body => body.status !== 0));
    assert.deepEqual(errors, []);
    console.log('Recruitment checks passed: view before edit, no draft, create/reopen/edit/cancel/update/close, date/time and catalog pickers, desktop/mobile.');
  } catch (error) {
    console.error((await page.locator('[role="dialog"]').allTextContents()).join('\n').slice(-2500));
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-error.png', animations: 'disabled' });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
