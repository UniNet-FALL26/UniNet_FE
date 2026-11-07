const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = true;
    data.profile = { ...data.profile, id: 'student-tabs-profile', fullName: 'Nguyễn Minh Anh', displayName: 'Nguyễn Minh Anh', nickname: 'minhanh', avatarUrl: null, coverUrl: null, isVerified: true };
    const account = { id: 'student-tabs-account', email: 'student-tabs@example.test', role: 0, profileComplete: true, profile: data.profile };
    const post = { id: 'student-own-post', authorUserId: data.profile.id, authorName: data.profile.fullName, authorActorType: 0, description: 'Student profile community post', mediaUrls: [], favoriteCount: 7, commentCount: 0, isFavorited: false, isSaved: false, createdAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z' };
    let ownReads = 0, empty = false;
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/profile/portfolio/' + data.profile.id)) return ok({ ...data, isOwner: false });
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 1 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/student/verification/me')) return ok({ id: 'verified', status: 1, isVerified: true, fullName: data.profile.fullName, schoolName: 'Fixture University', documentName: 'document.png' });
      if (path.endsWith('/community/posts/mine')) { ownReads++; return ok(empty ? [] : [post, { ...post, id: 'foreign-student-post', authorUserId: 'someone-else' }]); }
      if (path.endsWith('/react')) return ok({});
      if (path.endsWith('/comments')) return ok(request.method() === 'POST' ? { id: 'student-comment', postId: post.id, authorUserId: data.profile.id, authorName: data.profile.fullName, content: request.postDataJSON().content, createdAt: post.createdAt, replies: [] } : []);
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    fs.mkdirSync('dist/student-profile-tabs', { recursive: true });
    for (const [template, heroId] of [['developer-modern', 'modern-hero'], ['developer-showcase', 'showcase-hero'], ['developer-landscape', 'landscape-hero']]) {
      data.portfolio.appearance.profile.template = template;
      await page.goto(origin + '/(tabs)/profile', { waitUntil: 'domcontentloaded' });
      const hero = page.getByTestId(heroId);
      await hero.waitFor();
      const header = page.getByTestId('student-profile-header');
      const tabs = header.getByRole('tablist', { name: 'Nội dung hồ sơ', exact: true });
      assert.equal(await tabs.getByRole('tab').count(), 2);
      assert.equal(await tabs.getByRole('tab', { name: 'Hồ sơ', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await header.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).count(), 0);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const edit = hero.getByTestId('student-profile-edit-action');
        await edit.waitFor();
        const { heroBox, editBox } = await hero.evaluate(node => ({
          heroBox: node.getBoundingClientRect().toJSON(),
          editBox: node.querySelector('[data-testid="student-profile-edit-action"]').getBoundingClientRect().toJSON(),
        }));
        assert.ok(Math.abs(heroBox.x + heroBox.width - editBox.x - editBox.width - 12) < 2);
        assert.ok(Math.abs(editBox.y - heroBox.y - 12) < 2);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await hero.screenshot({ path: `dist/student-profile-tabs/${template}-${width}.png` });
      }
    }
    assert.equal(ownReads, 0, 'post loading starts only when its tab opens');
    await page.getByTestId('student-profile-edit-action').click();
    await page.waitForURL(/profile\/editor/);
    assert.equal(new URL(page.url()).searchParams.get('template'), 'developer-landscape');
    await page.goto(origin + '/(tabs)/profile');
    const tabs = page.getByTestId('student-profile-header').getByRole('tablist', { name: 'Nội dung hồ sơ', exact: true });
    await tabs.getByRole('tab', { name: 'Bài viết', exact: true }).click();
    const card = page.getByTestId('community-post-' + post.id);
    await card.waitFor();
    assert.equal(await page.getByTestId('community-post-foreign-student-post').count(), 0);
    assert.equal(await page.getByTestId('profile-template-frame').count(), 0);
    assert.ok((await card.boundingBox()).width <= 627);
    await card.getByRole('button', { name: 'Thích', exact: true }).click();
    await card.getByLabel('8 lượt thích', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 900 });
    await card.getByRole('button', { name: 'Bình luận', exact: true }).click();
    const sheet = page.getByTestId('community-comments-sheet');
    await sheet.getByRole('textbox', { name: 'Viết bình luận', exact: true }).fill('Student tab comment');
    await sheet.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
    await sheet.getByText('Student tab comment', { exact: true }).waitFor();
    await sheet.getByRole('button', { name: 'Đóng bình luận', exact: true }).click();
    await card.getByText('1 bình luận', { exact: true }).waitFor();
    await card.screenshot({ path: 'dist/student-profile-tabs/student-post-390.png' });
    empty = true;
    await tabs.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.getByTestId('student-profile-edit-action').waitFor();
    await tabs.getByRole('tab', { name: 'Bài viết', exact: true }).click();
    await page.getByText('Chưa có bài viết', { exact: true }).waitFor();
    await page.goto(origin + '/profile/view/' + data.profile.id);
    await page.getByTestId('landscape-hero').waitFor();
    assert.equal(await page.getByTestId('student-profile-edit-action').count(), 0, 'public profile does not expose the owner edit action');
    assert.deepEqual(errors, []);
    console.log('Student profile: two tabs, edit action in all three heroes at 320–1440px, editor navigation, own posts/likes/comments/empty state and public-profile isolation passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
