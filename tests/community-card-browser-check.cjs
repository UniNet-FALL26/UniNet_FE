const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'card-partner', email: 'cards@example.test', role: 1, profileComplete: true, profile: { id: 'card-profile', fullName: 'Card Partner', organizationName: 'Card Partner', isVerified: true } };
    const post = { id: 'card-post', authorUserId: 'student', authorName: 'Student Author', authorActorType: 0, description: 'Community card preview', mediaUrls: [origin + '/card-photo.png'], favoriteCount: 7, commentCount: 1, isFavorited: false, isSaved: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
    const ad = { id: 'card-ad', companyName: 'UniNet Partner', title: 'Sponsored card preview', content: '', mediaUrl: origin + '/card-photo.png', destinationUrl: 'https://example.test/campaign' };
    let reactions = 0;
    await page.route('**/card-photo.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/student-starter-cover.png') }));
    await page.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/advertisements/feed')) return ok([ad]);
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
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile: account.profile });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: 'Card Partner', openJobs: [] });
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    const card = page.getByTestId('community-post-card-post');
    await card.waitFor();
    await card.getByLabel('7 lượt thích', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Thích', exact: true }).click();
    await card.getByLabel('8 lượt thích', { exact: true }).waitFor();
    assert.equal(reactions, 1);
    const adCard = page.getByTestId('community-ad-card-ad');
    await adCard.waitFor();
    await adCard.getByText('Quảng cáo', { exact: true }).waitFor();
    for (const name of ['Thích', 'Bình luận', 'Chia sẻ']) assert.equal(await adCard.getByRole('button', { name, exact: true }).count(), 0);
    await adCard.getByRole('link', { name: 'Xem ngay', exact: true }).waitFor();
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
        assert.ok(first.height >= (id === 2 ? 220 : 180) - 1);
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
