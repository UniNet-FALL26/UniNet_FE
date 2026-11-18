const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_RECRUITMENT_TEST_ORIGIN || 'http://localhost:8086';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(20000);
    const errors = [], writes = [];
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
      if (path.endsWith('/project-hub/' + project.id + '/requests')) return ok({ items: [] });
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
    const open = () => page.getByRole('button', { name: 'Tuyển', exact: true }).click();
    await open();
    const modal = page.getByRole('dialog', { name: 'Quản lý tuyển thành viên', exact: true });
    const input = modal.getByRole('textbox', { name: 'Tên vị trí 1 *', exact: true });
    await input.waitFor();
    const bounds = await modal.boundingBox(), inputBounds = await input.boundingBox();
    assert.ok(bounds.width <= 700 && inputBounds.height <= 40);
    for (const label of [/Giới thiệu tuyển/, /Mô tả công việc/, /^Công nghệ —/, /^Kỹ năng —/, /Quyền lợi/]) assert.equal(await modal.getByRole('textbox', { name: label }).count(), 0);
    assert.equal(await modal.getByRole('textbox', { name: 'Kỹ năng & công nghệ — vị trí 1', exact: true }).inputValue(), 'C#, PostgreSQL, Git, REST API');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-compact-desktop.png', animations: 'disabled' });
    await input.fill('Discard edit');
    await modal.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes.length, 0);
    await open(); await input.fill('');
    await modal.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await modal.getByRole('alert').waitFor(); assert.equal(writes.length, 0);
    await input.fill('Backend developer');
    await modal.getByRole('textbox', { name: 'Kỹ năng & công nghệ — vị trí 1', exact: true }).fill('C#, Git, Docker');
    await modal.getByRole('button', { name: 'Thêm vị trí tuyển', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Tên vị trí 3 *', exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Gỡ vị trí 3', exact: true }).click();
    await modal.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(writes[0].status, 0); assert.equal(writes[0].description, 'Existing introduction');
    assert.equal(writes[0].positions[0].jobDescription, 'Existing description');
    assert.deepEqual(writes[0].positions[0].benefits, ['Existing benefit']);
    assert.deepEqual(writes[0].positions[0].technologies, ['C#', 'Docker']);
    assert.deepEqual(writes[0].positions[0].skills, ['Git']);
    assert.deepEqual(writes[0].positions[1], position('fe', 'Frontend'));
    await page.setViewportSize({ width: 375, height: 812 });
    await open(); await input.waitFor();
    assert.equal(await input.inputValue(), 'Backend developer');
    const frame = await modal.boundingBox(); assert.ok(frame.width <= 375 && frame.x >= 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-recruitment-compact-mobile.png', animations: 'disabled' });
    await modal.getByRole('button', { name: 'Đăng tuyển', exact: true }).click();
    await modal.waitFor({ state: 'hidden' }); assert.equal(writes.at(-1).status, 1);
    await open();
    await modal.getByRole('button', { name: 'Đóng tuyển', exact: true }).click();
    await modal.waitFor({ state: 'hidden' }); assert.equal(writes.at(-1).status, 2);
    assert.deepEqual(errors, []);
    console.log('Recruitment browser checks passed: compact desktop/mobile, merged field, removed fields, cancel/validation, add/remove, draft/publish/close and preserved existing data.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
