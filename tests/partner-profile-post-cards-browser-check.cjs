const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const profile = { id: 'partner-post-profile', fullName: 'Partner Author', organizationName: 'Partner Author', partnerType: 0, industry: 'Software', bio: 'Profile fixture', websites: [], isVerified: true, avatarUrl: origin + '/profile-image.png' };
    const account = { id: 'partner-post-account', email: 'partner-posts@example.test', role: 1, profileComplete: true, profile };
    let post = { id: 'partner-own-post', authorUserId: profile.id, authorName: profile.organizationName, authorAvatar: profile.avatarUrl, authorActorType: 1, description: 'Partner organization community post', mediaUrls: [origin + '/profile-image.png', origin + '/profile-wide.png', origin + '/profile-image.png'], favoriteCount: 7, commentCount: 1, isFavorited: false, isSaved: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
    let writes = [], pages = [], failDelete = true;
    await page.route('**/profile-image.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.route('**/profile-wide.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/student-starter-cover.png') }));
    await page.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (method !== 'GET') writes.push([method, path]);
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile });
      if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile });
      if (path.endsWith('/partner/verification/me')) return ok({ status: 1 });
      if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [] });
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 1 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/community/posts/mine')) {
        const pageNumber = Number(url.searchParams.get('page')); pages.push(pageNumber);
        return ok(pageNumber === 1 ? [post, ...Array.from({ length: 8 }, (_, i) => ({ ...post, id: `other-own-${i}`, description: `Own post ${i}`, mediaUrls: [] })), { ...post, id: 'foreign-post', authorUserId: 'someone-else' }] : [post, { ...post, id: 'second-page-post', description: 'Second page post', mediaUrls: [] }]);
      }
      if (path.endsWith('/community/posts')) return ok({ data: [post], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (path.endsWith('/react')) { post = { ...post, isFavorited: !post.isFavorited, favoriteCount: post.favoriteCount + (post.isFavorited ? -1 : 1) }; return ok({}); }
      if (path.endsWith('/bookmark')) { post = { ...post, isSaved: !post.isSaved }; return ok({ message: post.isSaved ? 'Saved' : 'Unsaved' }); }
      if (path.endsWith('/comments')) return ok(method === 'POST' ? { id: 'new-profile-comment', postId: post.id, authorUserId: profile.id, authorName: profile.organizationName, content: request.postDataJSON().content, createdAt: post.createdAt, replies: [] } : []);
      if (path.endsWith('/community/posts/' + post.id) && method === 'PUT') { post = { ...post, description: 'Updated profile post' }; return ok(post); }
      if (path.endsWith('/community/posts/' + post.id) && method === 'DELETE') {
        if (failDelete) { failDelete = false; return route.fulfill({ status: 503, json: { message: 'Fixture delete failed' } }); }
        return route.fulfill({ status: 204 });
      }
      return ok([]);
    });
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
    const card = page.getByTestId('community-post-' + post.id);
    await card.waitFor();
    const feedWidth = (await card.boundingBox()).width;
    await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
    await page.getByRole('tab', { name: 'Bài viết', exact: true }).click();
    await card.waitFor();
    assert.equal(await page.getByTestId('community-post-foreign-post').count(), 0);
    fs.mkdirSync('dist/partner-profile-posts', { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      assert.ok(box.width <= feedWidth + 1, 'profile card does not stretch wider than the community card');
      if (width === 1440) assert.ok(Math.abs(box.width - feedWidth) < 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await card.screenshot({ path: `dist/partner-profile-posts/card-${width}.png` });
    }
    await card.getByRole('button', { name: 'Thích', exact: true }).click();
    await card.getByLabel('8 lượt thích', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    assert.equal(await card.getByRole('menuitem', { name: 'Báo cáo bài viết', exact: true }).count(), 0);
    await card.getByRole('menuitem', { name: 'Lưu bài viết', exact: true }).click();
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await card.getByRole('menuitem', { name: 'Bỏ lưu bài viết', exact: true }).waitFor();
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await card.getByRole('button', { name: 'Mở ảnh 3', exact: true }).click();
    await page.getByTestId('community-media-lightbox').getByRole('img', { name: 'Ảnh bài viết 3', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
    await page.getByTestId('community-media-lightbox').getByRole('img', { name: 'Ảnh bài viết 1', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng xem ảnh bài viết', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 900 });
    await card.getByRole('button', { name: 'Bình luận', exact: true }).click();
    const sheet = page.getByTestId('community-comments-sheet');
    await sheet.getByRole('textbox', { name: 'Viết bình luận', exact: true }).fill('Comment from partner profile');
    await sheet.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
    await sheet.getByText('Comment from partner profile', { exact: true }).waitFor();
    await sheet.getByRole('button', { name: 'Đóng bình luận', exact: true }).click();
    await card.getByText('2 bình luận', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await card.getByRole('menuitem', { name: 'Sửa bài viết', exact: true }).click();
    await page.getByText('Chỉnh sửa bài viết', { exact: true }).waitFor();
    await page.getByPlaceholder('Bạn muốn chia sẻ điều gì với cộng đồng?').fill('Updated profile post');
    await page.getByText('Lưu thay đổi', { exact: true }).click();
    await card.getByText('Updated profile post', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem thêm bài viết', exact: true }).click();
    await page.getByTestId('community-post-second-page-post').waitFor();
    assert.equal(await card.count(), 1);
    assert.ok(pages.includes(2));
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await card.getByRole('menuitem', { name: 'Xóa bài viết', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Xóa bài viết', exact: true });
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes.filter(([method]) => method === 'DELETE').length, 0);
    await card.getByRole('button', { name: 'Tùy chọn bài viết', exact: true }).click();
    await card.getByRole('menuitem', { name: 'Xóa bài viết', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    assert.ok((await dialog.getByRole('alert').textContent()).trim().length > 0);
    assert.equal(await card.count(), 1);
    await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
    await card.waitFor({ state: 'detached' });
    assert.equal(writes.filter(([method]) => method === 'DELETE').length, 2);
    assert.deepEqual(errors, []);
    console.log('Partner profile reuses community cards: matched widths, gallery indexes, likes, saves, comments, edit, confirmed delete and pagination passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
