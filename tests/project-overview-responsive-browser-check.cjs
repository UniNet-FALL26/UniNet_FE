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
    await page.goto(origin + '/group/card-2', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('project-detail-hero').waitFor();
    fs.mkdirSync('dist/project-overview-responsive', { recursive: true });
    for (const width of [320, 375, 599, 600, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const id of ['project-problem-solution', 'project-personal-review']) {
        await page.waitForFunction(({ id, stacked }) => {
          const parent = document.querySelector(`[data-testid="${id}"]`);
          if (!parent || parent.children.length !== 2) return false;
          const [a, b] = [...parent.children].map(node => node.getBoundingClientRect());
          return stacked ? b.top >= a.bottom && Math.abs(a.width - parent.getBoundingClientRect().width) < 2 : Math.abs(a.top - b.top) < 2;
        }, { id, stacked: width < 600 });
        await page.getByTestId(id).screenshot({ path: `dist/project-overview-responsive/${id}-${width}.png`, animations: 'disabled' });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log('Project overview responsive checks passed: both card pairs stack below 600px and retain columns on larger screens.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
