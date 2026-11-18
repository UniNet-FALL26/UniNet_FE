const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_CREATE_TEST_ORIGIN || 'http://localhost:8088';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(30000);
    const errors = [], writes = [], projects = []; let failCatalog = false;
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample); data.isOwner = true;
    const account = { id: 'technology-owner', email: 'technology@example.test', role: 0, profileComplete: true, profile: data.profile };
    const catalog = ['React', 'C#', ...Array.from({ length: 21 }, (_, i) => 'Technology ' + String(i).padStart(2, '0'))].map(name => ({ id: name, name, iconUrl: null, category: 'Technology' }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method(), ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/profile/skills')) {
        if (failCatalog) { failCatalog = false; return route.fulfill({ status: 500, json: { message: 'Catalog unavailable' } }); }
        return ok(catalog);
      }
      if (path.endsWith('/project-hub/mine')) return ok({ items: projects, total: projects.length, page: 1, pageSize: 12 });
      if (path.endsWith('/project-hub/created-project')) return ok(projects[0]);
      if (path.endsWith('/projects/created-project')) return ok({ ...projects[0], isCreator: true, roleRequirements: [], skills: [] });
      if (path.endsWith('/projects/created-project/verifications')) return ok({ verifications: [], page: 1, pageSize: 1, totalPages: 0, totalItems: 0 });
      if (path.endsWith('/packages')) return ok({ packages: [], totalPages: 0 });
      if (path.endsWith('/project-hub') && method === 'POST') {
        const body = route.request().postDataJSON(); writes.push(body);
        assert.equal(Object.hasOwn(body, 'origin'), false); assert.equal(Object.hasOwn(body, 'mode'), false);
        assert.equal(body.status, 1);
        assert.equal(Object.hasOwn(body, 'expectedEndDate'), false);
        assert.ok(body.technologies.every(name => catalog.some(item => item.name === name)));
        const project = { ...body, id: 'created-project', mode: 'personal', isOwner: true, isMember: false, creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [], details: { features: [], results: {}, documents: [], media: [], links: [] }, recruitment: null, createdAt: '2026-11-17T00:00:00Z' };
        projects.push(project); return ok(project);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/profile/projects', { waitUntil: 'domcontentloaded' });
    const open = () => page.getByTestId('profile-add-project').click();
    failCatalog = true; await open();
    const modal = page.getByRole('dialog', { name: 'Tạo dự án mới', exact: true });
    assert.equal(await modal.getByRole('radiogroup', { name: 'Loại dự án', exact: true }).count(), 0);
    assert.equal(await modal.getByRole('button', { name: 'Chọn công nghệ', exact: true }).count(), 0);
    await modal.getByRole('button', { name: 'Tải lại danh sách công nghệ', exact: true }).click();
    await modal.getByRole('checkbox', { name: 'React', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Tìm công nghệ', exact: true }).fill('c#');
    await modal.getByRole('checkbox', { name: 'C#', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Tìm công nghệ', exact: true }).fill('react');
    await modal.getByRole('checkbox', { name: 'React', exact: true }).click();
    assert.equal(await modal.getByRole('checkbox', { name: 'React', exact: true }).getAttribute('aria-checked'), 'false');
    await modal.getByRole('checkbox', { name: 'React', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Tìm công nghệ', exact: true }).fill('Unlisted technology');
    await page.keyboard.press('Enter'); assert.equal(writes.length, 0);
    await modal.getByText('Không có công nghệ phù hợp trong danh sách.', { exact: true }).waitFor();
    assert.equal(await modal.getByRole('button', { name: 'Thêm công nghệ', exact: true }).count(), 0);
    await page.getByTestId('project-create-title').fill('Catalog technologies');
    const descriptionInput = page.getByTestId('project-create-description');
    const initialHeight = (await descriptionInput.boundingBox()).height;
    await descriptionInput.fill(Array.from({ length: 12 }, (_, i) => 'Description line ' + i).join('\n'));
    await page.waitForFunction(() => document.querySelector('[data-testid="project-create-description"]').getBoundingClientRect().height > 200);
    assert.ok((await descriptionInput.boundingBox()).height > initialHeight);
    assert.equal(await descriptionInput.evaluate(node => node.scrollHeight <= node.clientHeight + 2), true);
    await page.getByTestId('project-create-description').fill('Only select from the system catalog.');
    assert.equal(await modal.getByLabel('Ngày dự kiến kết thúc', { exact: true }).count(), 0);
    assert.equal(await modal.getByText('Không bắt buộc. Ngày bắt đầu được lấy theo ngày tạo dự án.', { exact: true }).count(), 0);
    await page.waitForFunction(() => document.querySelector('[data-testid="project-create-description"]').getBoundingClientRect().height <= 90);
    await modal.getByRole('textbox', { name: 'Tìm công nghệ', exact: true }).fill('');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-create-catalog-desktop.png', animations: 'disabled' });
    await modal.getByRole('textbox', { name: 'Tìm công nghệ', exact: true }).fill('Unlisted technology');
    await page.getByTestId('project-create-submit').click(); await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(writes[0].technologies, ['C#', 'React']);
    await page.waitForURL(url => url.pathname === '/group/created-project');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(origin + '/profile/projects', { waitUntil: 'domcontentloaded' }); await open();
    await modal.getByRole('checkbox', { name: 'React', exact: true }).waitFor();
    for (let i = 0; i < 20; i++) await modal.getByRole('checkbox', { name: 'Technology ' + String(i).padStart(2, '0'), exact: true }).click();
    assert.equal(await modal.getByRole('checkbox', { name: 'React', exact: true }).getAttribute('aria-disabled'), 'true');
    await modal.getByRole('checkbox', { name: 'Technology 00', exact: true }).click();
    await modal.getByRole('checkbox', { name: 'React', exact: true }).click();
    await modal.getByText('Đã chọn 20/20', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-create-catalog-mobile.png', animations: 'disabled' });
    await modal.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes.length, 1);
    assert.deepEqual(errors, []);
    console.log('Create technology catalog checks passed: API retry, search-only input, multi-select/removal, canonical payload, 20-item limit and mobile/cancel.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
