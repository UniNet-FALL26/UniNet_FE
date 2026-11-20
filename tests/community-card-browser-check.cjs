const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const profileSample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
    const account = { id: 'card-viewer', email: 'cards@example.test', role: 0, profileComplete: true, profile: { ...profileSample.profile, id: 'card-profile', fullName: 'Card Viewer', isVerified: true } };
    const post = { id: 'card-post', authorUserId: 'student', authorName: 'Student Author', authorActorType: 0, description: 'Community card preview', mediaUrls: [origin + '/card-photo.png'], favoriteCount: 7, commentCount: 1, isFavorited: false, isSaved: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
    const ad = { id: 'card-ad', companyName: 'UniNet Partner', title: 'Sponsored card preview', content: '', mediaUrl: origin + '/card-photo.png', destinationUrl: 'https://example.test/campaign' };
    const authorProfile = { ...structuredClone(profileSample), isOwner: false, profile: { ...profileSample.profile, id: 'student', fullName: post.authorName } };
    authorProfile.portfolio.appearance.profile = { ...authorProfile.portfolio.appearance.profile, template: 'developer-landscape', theme: 'mint', hiddenSections: [], showPortfolio: false };
    let reactions = 0;
    let friendship = { accountId: 'student-account', profileId: 'student', fullName: post.authorName, nickname: '', avatarUrl: null, role: 0, relationship: 'none', friendshipId: null, friendshipVersion: null, mutualFriendsCount: 0 };
    await page.route('**/card-photo.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/student-starter-cover.png') }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/friendships/relationship/student')) return ok(friendship);
      if (path.endsWith('/friendships/requests') && request.method() === 'POST') {
        assert.equal(request.postDataJSON().receiverAccountId, friendship.accountId);
        friendship = { ...friendship, relationship: 'outgoing', friendshipId: 'friendship-request', friendshipVersion: 1 };
        return ok(friendship);
      }
      if (path.endsWith('/advertisements/feed')) return ok([ad]);
      if (path.endsWith('/community/posts') && new URL(request.url()).searchParams.has('authorUserId')) return ok([post]);
      if (path.endsWith('/community/posts')) return ok({ page: 1, pageSize: 10, totalItems: 5, totalPages: 1, data: [post, ...[2, 3, 4, 5].map(id => ({ ...post, id: 'card-post-' + id, description: 'Post ' + id, mediaUrls: Array.from({ length: id === 5 ? 7 : id }, () => origin + '/card-photo.png') }))] });
      if (path.endsWith('/community/posts/card-post')) return ok(post);
      if (path.endsWith('/community/posts/card-post/react') && request.method() === 'POST') { reactions++; return ok({}); }
      if (path.endsWith('/comments')) {
        const other = path.includes('card-post-2');
        const comment = { id: 'comment-' + (other ? 'other' : 'first'), postId: other ? 'card-post-2' : post.id, authorUserId: 'commenter', authorName: 'Comment Author', content: other ? 'Other post comment' : 'First post comment', createdAt: post.createdAt, updatedAt: post.createdAt, replies: [] };
        return ok(request.method() === 'POST' ? { ...comment, id: 'new-comment', authorUserId: account.id, content: request.postDataJSON().content } : [comment]);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 1 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/profile/me')) return ok({ profile: { ...account.profile, websites: [] } });
      if (path.endsWith('/profile/portfolio/me')) return ok({ ...structuredClone(profileSample), isOwner: true, profile: account.profile });
      if (path.endsWith('/profile/portfolio/student')) return ok(authorProfile);
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: 'Card Partner', openJobs: [] });
      return ok([]);
    });
    if (process.env.COMMUNITY_CLIENT_RENDER === '1') await page.route(origin + '/**', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('community-post-card-post');
    await card.waitFor();
    const author = card.getByRole('link', { name: `Xem hồ sơ của ${post.authorName}`, exact: true });
    await author.waitFor();
    await author.getByText(post.authorName, { exact: true }).click();
    await page.waitForURL(url => url.pathname === '/profile/view/student');
    await page.getByRole('heading', { name: post.authorName, exact: true }).waitFor();
    await page.getByTestId('landscape-hero').getByText(authorProfile.portfolio.headline, { exact: true }).waitFor();
    await page.getByTestId('landscape-hero').getByText(authorProfile.profile.bio, { exact: true }).waitFor();
    await page.getByTestId('developer-landscape').getByText('React', { exact: true }).first().waitFor();
    await page.getByTestId('developer-landscape').screenshot({ path: 'C:/Users/minec/UniNet/community-author-portfolio.png', animations: 'disabled' });
    const profileHeader = page.getByTestId('profile-view-header');
    assert.equal(await profileHeader.getByRole('tab', { name: 'Hồ sơ', exact: true }).getAttribute('aria-selected'), 'true');
    await profileHeader.getByRole('button', { name: 'Nhắn tin', exact: true }).waitFor();
    await profileHeader.getByRole('button', { name: 'Kết bạn', exact: true }).click();
    await profileHeader.getByRole('button', { name: 'Hủy lời mời', exact: true }).waitFor();
    await profileHeader.getByRole('tab', { name: 'Bài viết', exact: true }).click();
    await page.getByRole('tabpanel', { name: 'Bài viết', exact: true }).getByText(post.description, { exact: true }).waitFor();
    assert.equal(await page.getByTestId('developer-landscape').count(), 0);
    await profileHeader.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.getByTestId('landscape-hero').waitFor();
    for (const width of [1440, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const actionBounds = await page.getByTestId('profile-view-actions').boundingBox();
      assert.ok(actionBounds.x >= 0 && actionBounds.x + actionBounds.width <= width + 1);
      if (width === 1440) {
        const tabBounds = await profileHeader.getByRole('tablist').boundingBox();
        assert.ok(tabBounds.x + tabBounds.width < actionBounds.x, 'tabs on left, actions on right');
      }
      await profileHeader.screenshot({ path: `C:/Users/minec/UniNet/profile-view-header-${width}.png`, animations: 'disabled' });
    }
    await profileHeader.getByRole('button', { name: 'Nhắn tin', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/messages' && url.searchParams.get('profileId') === 'student');
    await page.goBack();
    await page.getByTestId('landscape-hero').waitFor();
    await page.goBack();
    await card.waitFor();
    await author.locator('[data-testid="community-author-avatar"]').click();
    await page.waitForURL(url => url.pathname === '/profile/view/student');
    await page.getByRole('heading', { name: post.authorName, exact: true }).waitFor();
    await page.goBack();
    await card.waitFor();
    await card.getByLabel('7 lượt thích', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Thích', exact: true }).click();
    await card.getByLabel('8 lượt thích', { exact: true }).waitFor();
    assert.equal(reactions, 1);
    const adCard = page.getByTestId('community-ad-card-ad');
    await adCard.waitFor();
    await adCard.getByText('Quảng cáo', { exact: true }).waitFor();
    assert.equal(await adCard.getByRole('link', { name: /Xem hồ sơ/ }).count(), 0);
    const feedUrl = page.url();
    await adCard.getByText(ad.companyName, { exact: true }).click();
    assert.equal(page.url(), feedUrl, 'advertiser name does not navigate');
    for (const name of ['Thích', 'Bình luận', 'Chia sẻ']) assert.equal(await adCard.getByRole('button', { name, exact: true }).count(), 0);
    await adCard.getByRole('link', { name: 'Xem ngay', exact: true }).waitFor();
    if (process.env.COMMUNITY_AUTHOR_ONLY === '1') {
      assert.deepEqual(errors, []);
      console.log('Community author links passed: name/avatar open profile; advertiser identity stays noninteractive.');
      return;
    }
    fs.mkdirSync('dist/community-cards', { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width < 600) {
        await page.waitForFunction(() => {
          const card = document.querySelector('[data-testid="community-post-card-post"]');
          if (!card) return false;
          const box = card.getBoundingClientRect();
          return Math.abs(box.left) < 1 && Math.abs(box.right - innerWidth) < 1;
        });
      }
      for (const [name, node] of [['post', card], ['ad', adCard]]) {
        await node.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (name === 'post') {
          const buttons = await Promise.all(['Thích', 'Bình luận', 'Chia sẻ'].map(name => node.getByRole('button', { name, exact: true }).boundingBox()));
          assert.ok(Math.max(...buttons.map(box => box.y)) - Math.min(...buttons.map(box => box.y)) < 2);
        }
        await node.screenshot({ path: `dist/community-cards/${name}-${width}.png` });
      }
      for (const id of [2, 3, 4, 5]) {
        const gallery = page.getByTestId('community-post-card-post-' + id);
        await gallery.scrollIntoViewIfNeeded();
        const tiles = gallery.locator('[data-testid^="community-media-tile-"]');
        assert.equal(await tiles.count(), Math.min(4, id));
        const first = await tiles.first().boundingBox();
        if (id === 2) {
          const single = await card.getByTestId('community-media-tile-0').boundingBox();
          for (const tile of await tiles.all()) assert.ok(Math.abs((await tile.boundingBox()).height - single.height) < 1, 'two-image tiles match the single-image height');
        } else assert.ok(first.height >= 179);
        assert.equal(await gallery.locator('[style*="blur(24px)"]').count(), Math.min(4, id));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await gallery.screenshot({ path: `dist/community-cards/gallery-${id}-${width}.png` });
      }
    }
    await card.getByRole('button', { name: 'Bình luận', exact: true }).click();
    await page.getByPlaceholder('Viết bình luận...').waitFor();
    const viewer = page.getByTestId('community-comment-media');
    assert.equal(await viewer.locator('[style*="blur(24px)"]').count(), 1);
    await page.waitForFunction(() => {
      let node = document.querySelector('[data-testid="community-comment-media"]');
      if (!node) return false;
      while (node) { if (Number(getComputedStyle(node).opacity) < 1) return false; node = node.parentElement; }
      return true;
    });
    await viewer.screenshot({ path: 'dist/community-cards/comment-media-1440.png' });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      const sheet = page.getByTestId('community-comments-sheet');
      await sheet.waitFor();
      await page.waitForFunction(() => {
        const node = document.querySelector('[data-testid="community-comments-sheet"]');
        if (!node) return false;
        const box = node.getBoundingClientRect();
        return box.top > 100 && Math.abs(box.bottom - innerHeight) < 2;
      });
      const box = await sheet.boundingBox();
      assert.ok(box.y > 100 && Math.abs(box.y + box.height - 1000) < 2, 'sheet is attached to the bottom');
      assert.equal(await sheet.getByTestId('community-comment-media').count(), 0);
      assert.equal(await sheet.getByText(post.description, { exact: true }).count(), 0);
      assert.equal(await sheet.getByText(post.authorName, { exact: true }).count(), 0);
      await sheet.getByText('First post comment', { exact: true }).waitFor();
      await sheet.screenshot({ path: `dist/community-cards/comments-sheet-${width}.png` });
    }
    const sheet = page.getByTestId('community-comments-sheet');
    await sheet.getByRole('textbox', { name: 'Viết bình luận', exact: true }).fill('New sheet comment');
    await sheet.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
    await sheet.getByText('New sheet comment', { exact: true }).waitFor();
    await sheet.getByRole('button', { name: 'Đóng bình luận', exact: true }).click();
    await sheet.waitFor({ state: 'detached' });
    await page.getByTestId('community-post-card-post-2').getByRole('button', { name: 'Bình luận', exact: true }).click();
    await sheet.getByText('Other post comment', { exact: true }).waitFor();
    assert.equal(await sheet.getByText('First post comment', { exact: true }).count(), 0);
    await page.goto(origin + '/post/card-post', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Viết bình luận...').waitFor();
    assert.deepEqual(errors, []);
    console.log('Community cards: post likes/comments, ads without social actions, CTA and responsive screenshots passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
