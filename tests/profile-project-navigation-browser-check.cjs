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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = true;
    data.profile = { ...data.profile, id: 'card-profile', isVerified: true };
    data.portfolio.projects = [{ title: 'Portfolio card fixture', description: 'Saved portfolio project', coverUrl: 'https://example.com/uninet-samples/web.svg', technologies: ['React', 'TypeScript', 'CSS', 'Figma'], featured: false, role: 'Frontend', completedAt: '2026-11-16' }];
    const account = { id: 'card-account', email: 'cards@example.test', role: 0, profileComplete: true, profile: data.profile };
    const items = [0, 1, 2].map(status => ({
      id: `card-${status}`, title: `Project card ${status}`, description: 'Project description shown on the card', logoUrl: null,
      technologies: ['React', 'TypeScript', 'CSS', 'Figma', 'Canva'], origin: 0, status, visibility: 0, mode: status === 1 ? 'community' : 'personal', isOwner: true, isMember: true,
      creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null },
      members: status === 0 ? [] : [{ id: 'membership', userId: data.profile.id, fullName: data.profile.fullName, avatarUrl: null, role: 'Leader', positionId: null, status: 0, joinedAt: '2026-11-16T00:00:00Z' }],
      details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, endDate: null, completedAt: null },
      recruitment: null, myReview: null, chatRoomId: null, createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z',
    }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const ok = json => route.fulfill({ json });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/skills')) return ok(['React', 'TypeScript', 'CSS', 'Figma', 'Canva', 'C#'].map(name => ({ id: name, name, iconUrl: 'https://res.cloudinary.com/test/image/upload/' + encodeURIComponent(name) + '.png', category: 'Technology' })));
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/profile/public/' + data.profile.id)) return ok({ ...data.profile, role: 0, websites: [] });
      if (path.endsWith('/profile/portfolio/' + data.profile.id)) return ok({ ...data, isOwner: false });
      const project = items.find(item => path.endsWith('/project-hub/' + item.id));
      if (project) { assert.equal(route.request().method(), 'GET'); return ok(project); }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/student/verification/me')) return ok({ id: 'verified', status: 1, isVerified: true });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route('https://res.cloudinary.com/test/image/upload/**', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    data.portfolio.projects[0].projectId = items[2].id;
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) {
        data.portfolio.appearance.profile.template = template;
        for (const role of ['visitor', 'member', 'leader']) {
          items[2].isOwner = role === 'leader';
          items[2].isMember = role !== 'visitor';
          await page.goto(origin + '/profile/view/' + data.profile.id, { waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: 'Xem dự án Portfolio card fixture', exact: true }).click();
          await page.waitForURL('**/group/' + items[2].id);
          await page.getByTestId('project-detail-hero').waitFor();
          assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa dự án', exact: true }).count(), role === 'leader' ? 1 : 0);
          assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa nội dung dự án', exact: true }).count(), role === 'leader' ? 1 : 0);
          assert.equal(await page.getByRole('tab', { name: /Cài đặt$/ }).count(), role === 'visitor' ? 0 : 1);
          await page.getByRole('tab', { name: /Tài liệu$/ }).click();
          assert.equal(await page.getByRole('button', { name: 'Tải lên tài liệu', exact: true }).count(), role === 'visitor' ? 0 : 1);
          await page.getByRole('tab', { name: /Hình ảnh & Video demo$/ }).click();
          assert.equal(await page.getByRole('button', { name: 'Tải lên hình ảnh hoặc video', exact: true }).count(), role === 'visitor' ? 0 : 1);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('Profile project navigation passed: three templates, two widths, visitor/member/leader permissions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
