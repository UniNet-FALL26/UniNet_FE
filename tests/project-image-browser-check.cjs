const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = true;
    const account = { id: 'image-account', email: 'image@example.test', role: 0, profileComplete: true, profile: data.profile };
    let project = {
      id: 'image-project', title: 'Image preview project', description: 'Short description', logoUrl: null,
      technologies: ['React'], origin: 0, status: 1, visibility: 0, mode: 'personal', isOwner: true, isMember: true,
      creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [],
      details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, endDate: null, completedAt: null },
      recruitment: null, myReview: null, chatRoomId: null, createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z',
    };
    let uploads = 0, saves = 0, failUpload = false, failSave = false;
    const image = fs.readFileSync('assets/images/uninet-mark.png');
    await page.route('https://res.cloudinary.com/project-test/image/upload/**', route => route.fulfill({ contentType: 'image/png', body: image }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/images') && request.method() === 'POST') {
        uploads++; writes.push('upload');
        assert.match(request.headers()['content-type'], /multipart\/form-data/);
        if (failUpload) { failUpload = false; return route.fulfill({ status: 500, json: { message: 'Image upload fixture failure' } }); }
        return ok({ imageUrl: `https://res.cloudinary.com/project-test/image/upload/cover-${uploads}.png`, publicId: `cover-${uploads}`, resourceType: 'image', fileName: 'project.png', format: 'png' });
      }
      if (path.endsWith('/project-hub/image-project')) {
        if (request.method() === 'PATCH') {
          saves++; writes.push('patch');
          const payload = request.postDataJSON();
          assert.deepEqual(Object.keys(payload), ['logoUrl']);
          if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { message: 'Image database fixture failure' } }); }
          project = { ...project, logoUrl: payload.logoUrl };
        }
        return ok(project);
      }
      if (path.endsWith('/project-hub/mine')) return ok({ items: [project], total: 1, page: 1, pageSize: 12 });
      if (path.endsWith('/profile/portfolio/me')) return ok({ ...data, portfolio: { ...data.portfolio, projects: [{ title: project.title, description: project.description, coverUrl: project.logoUrl, technologies: ['React'], featured: false }] } });
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/group/image-project', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Đổi ảnh dự án', exact: true }).waitFor();
    async function choose(button, name) {
      const event = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: button, exact: true }).click();
      await (await event).setFiles({ name, mimeType: 'image/png', buffer: image });
      await page.getByText(name, { exact: true }).waitFor();
    }
    async function confirmWithResponse(path, status) {
      const response = page.waitForResponse(value => new URL(value.url()).pathname.endsWith(path) && value.status() === status);
      await page.getByTestId('project-image-confirm').click();
      await response;
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-testid="project-image-confirm"]');
        return !button || button.getAttribute('aria-disabled') !== 'true' && !button.hasAttribute('disabled');
      });
    }
    await choose('Đổi ảnh dự án', 'first.png');
    await choose('Chọn lại ảnh', 'second.png');
    assert.equal(uploads, 0); assert.equal(saves, 0);
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByTestId('project-image-confirm').waitFor({ state: 'hidden' });
    assert.equal(uploads, 0); assert.equal(saves, 0); assert.equal(project.logoUrl, null);
    await choose('Đổi ảnh dự án', 'confirmed.png');
    if (process.env.PROJECT_IMAGE_PREVIEW_SCREENSHOT) {
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-testid="project-image-confirm"]');
        for (let node = button; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        return !!button;
      });
      await page.screenshot({ path: process.env.PROJECT_IMAGE_PREVIEW_SCREENSHOT, animations: 'disabled' });
    }
    failUpload = true; failSave = true;
    await confirmWithResponse('/images', 500);
    assert.equal(saves, 0); assert.equal(project.logoUrl, null);
    await page.getByRole('alert').last().waitFor();
    await confirmWithResponse('/project-hub/image-project', 500);
    assert.equal(uploads, 2); assert.equal(saves, 1); assert.equal(project.logoUrl, null);
    await page.getByRole('alert').last().waitFor();
    await confirmWithResponse('/project-hub/image-project', 200);
    await page.getByTestId('project-image-confirm').waitFor({ state: 'hidden' });
    assert.deepEqual(writes, ['upload', 'upload', 'patch', 'patch']);
    assert.equal(uploads, 2); assert.equal(saves, 2);
    async function assertFit() {
      await page.getByTestId('project-full-image').first().waitFor();
      const fit = await page.getByTestId('project-full-image').first().evaluate(node => {
        const styles = [...node.querySelectorAll('*')].map(element => getComputedStyle(element));
        return { contain: styles.some(style => style.backgroundSize === 'contain' || style.objectFit === 'contain'), blur: styles.some(style => style.filter.includes('blur(')) };
      });
      assert.equal(fit.contain, true); assert.equal(fit.blur, true);
    }
    await assertFit();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('img', { name: 'Ảnh dự án Image preview project', exact: true }).waitFor();
    await assertFit();
    await page.goto(origin + '/profile/projects', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Xem dự án Image preview project', exact: true }).waitFor();
    await assertFit();
    await page.goto(origin + '/(tabs)/profile', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: project.title, exact: true }).waitFor();
    await assertFit();
    project = { ...project, isOwner: false, isMember: false };
    await page.goto(origin + '/group/image-project', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: project.title, exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đổi ảnh dự án', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa dự án', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa nội dung dự án', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa tổng kết cá nhân', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa công nghệ sử dụng', exact: true }).count(), 0);
    assert.equal(await page.getByRole('tab', { name: /Cài đặt/ }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('Project image browser checks passed: local preview/reselect/cancel, upload then PATCH, failure/retry without duplicate upload, reload, full image/blur in all views, owner-only camera.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
