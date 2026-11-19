const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    fs.mkdirSync('dist/api-feedback', { recursive: true });
    for (const role of [0, 1]) {
      const context = await browser.newContext({ viewport: { width: role === 0 ? 390 : 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const account = { id: `feedback-${role}`, email: `feedback-${role}@test.local`, role, profileComplete: true, profile: { id: `profile-${role}`, fullName: 'Feedback Test', displayName: 'Feedback Test', organizationName: 'Feedback Test', isVerified: true } };
      const post = { id: 'feedback-post', authorUserId: 'author', authorName: 'Community Author', description: 'API feedback fixture', mediaUrls: [], favoriteCount: 7, commentCount: 0, isFavorited: false, createdAt: '2026-11-01T00:00:00Z' };
      let mode = 'success';
      await page.route('**/api/**', route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const ok = json => route.fulfill({ json });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
        if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
        if (path.endsWith('/auth/me')) return ok(account);
        if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
        if (path.endsWith('/profile/me')) return ok({ profile: { ...account.profile, avatarUrl: null } });
        if (path.endsWith('/profile/portfolio/me')) return ok({ isOwner: true, profile: { ...account.profile, avatarUrl: null } });
        if (path.endsWith('/partner/dashboard')) return ok({ organizationName: 'Feedback Test', openJobs: [], totalJobs: 0, totalApplications: 0 });
        if (path.endsWith('/community/posts')) return ok({ data: [post], page: 1, totalPages: 1 });
        if (path.endsWith('/react')) {
          if (mode === 'business') return route.fulfill({ status: 400, json: { code: 'POST_HIDDEN', message: 'Bài viết đã bị ẩn. Bạn không thể tương tác với bài viết này.' } });
          if (mode === 'technical') return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR', message: 'System.NullReferenceException at CommunityService.cs:42' } });
          if (mode === 'validation') return route.fulfill({ status: 422, json: { errors: { Content: ['Nội dung bình luận không được để trống.'] } } });
          if (mode === 'logical') return ok({ success: false, code: 'POST_HIDDEN', message: 'Bài viết không còn cho phép tương tác.' });
          if (mode === 'network') return route.abort('failed');
          return ok({});
        }
        return ok([]);
      });
      await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      if (role === 1) await page.getByRole('tab', { name: 'Cộng đồng', exact: true }).click();
      await page.getByText(post.description, { exact: true }).waitFor();
      await page.getByText('7', { exact: true }).click();
      let notice = page.getByTestId('action-toast');
      await notice.getByText('Đã cập nhật lượt thích.', { exact: true }).waitFor();
      await page.getByText('8', { exact: true }).waitFor();
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="action-toast"]');
        return el && Number(getComputedStyle(el).opacity) === 1;
      });
      const box = await notice.boundingBox();
      assert.ok(box.y < 100 && box.x >= 0 && box.x + box.width <= (role === 0 ? 390 : 1440), 'toast stays at screen top and fits');
      await page.screenshot({ path: `dist/api-feedback/success-${role}.png` });
      await notice.waitFor({ state: 'hidden', timeout: 4500 });
      for (const [nextMode, expected] of [['business', /Bài viết đã bị ẩn/], ['technical', /bài viết cộng đồng.*dịch vụ đang gặp sự cố/], ['validation', /Nội dung bình luận không được để trống/], ['logical', /Bài viết không còn cho phép tương tác/], ['network', /kiểm tra mạng/]]) {
        mode = nextMode;
        await page.getByText('8', { exact: true }).click();
        await notice.getByText(expected).waitFor();
        const text = await notice.innerText();
        assert.ok(!/INTERNAL_ERROR|POST_HIDDEN|Exception|CommunityService\.cs|status code/.test(text));
        assert.equal(await page.getByText('8', { exact: true }).count(), 1, 'failed request does not update reaction count');
      }
      await page.waitForFunction(() => { const el = document.querySelector('[data-testid="action-toast"]'); return el && Number(getComputedStyle(el).opacity) === 1; });
      await page.screenshot({ path: `dist/api-feedback/error-${role}.png` });
      await notice.waitFor({ state: 'hidden', timeout: 4500 });
      await context.close();
    }
    console.log('API feedback: student/partner success, business/validation/server/network/logical errors, safe messages, top positioning and auto-dismiss passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
