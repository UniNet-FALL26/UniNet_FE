const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.ASSESSOR_TEST_ORIGIN || 'http://localhost:8081';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1100 } }); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const profile = { id: 'profile', fullName: 'Assessor', nickname: 'hidden-nickname', bio: 'Thẩm định viên với kinh nghiệm trong đánh giá dự án công nghệ.', contactEmail: 'assessor@example.test', phone: '0901234567', address: 'TP. Hồ Chí Minh', isVerified: true, assessorJson: { jobTitle: 'Chuyên gia thẩm định', companyName: 'UniNet', yearsOfExperience: 5, expertise: ['Đánh giá dự án', 'Phân tích yêu cầu', 'Kiểm thử phần mềm'], education: 'Thạc sĩ', university: 'Đại học FPT', linkedInUrl: 'https://linkedin.com/in/assessor', gitHubUrl: 'https://github.com/assessor', portfolioUrl: 'https://example.test' } };
    const account = { id: 'owner', email: profile.contactEmail, role: 2, status: 1, profileComplete: true, createdAt: '2026-03-10T00:00:00Z' };
    let mode = 'empty', likes = 0, saves = 0; const pages = [];
    const post = id => ({ id, authorUserId: profile.id, authorName: profile.fullName, authorAvatar: null, description: 'Đánh giá dự án công nghệ ' + id, mediaUrls: [], favoriteCount: 8, commentCount: 2, isFavorited: false, isSaved: false, createdAt: '2026-11-01T09:00:00Z' });
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(value => { if (String(value).includes('"protocol"')) socket.send('{}\x1e'); }));
    await page.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname, ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account: { ...account, profile }, accessToken: 'fixture', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return ok({ ...account, profile });
      if (path.endsWith('/profile/assessor') && request.method() === 'PUT') { Object.assign(profile, request.postDataJSON()); return ok({ ...account, profile }); }
      if (path.endsWith('/posts/mine')) {
        const number = Number(url.searchParams.get('page')); pages.push(number);
        if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Chưa tải được bài viết.' } });
        if (mode === 'empty') return ok([]);
        return ok(number === 1 ? [...Array.from({ length: 9 }, (_, i) => post(String(i))), { ...post('foreign'), authorUserId: 'another-profile' }] : [post('0'), post('next')]);
      }
      if (path.endsWith('/react')) { likes++; return ok({}); }
      if (path.endsWith('/bookmark')) { saves++; return ok({}); }
      if (path.endsWith('/notifications/summary')) return ok({ unreadCount: 0, canManage: false });
      return ok([]);
    });
    await page.goto(origin + '/login');
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(/assessor-community/);
    await page.goto(origin + '/assessor-profile'); await page.getByTestId('assessor-posts-empty').waitFor();
    assert.equal(await page.getByTestId('assessor-profile-hero').getByRole('tab').count(), 0);
    fs.mkdirSync('dist/assessor-profile-feed', { recursive: true });
    for (const width of [1920, 1440, 1200, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 }); await page.getByTestId('assessor-profile-content').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await page.waitForFunction(() => { const root = document.querySelector('[data-testid="assessor-profile-content"]'), summary = document.querySelector('[data-testid="assessor-profile-summary-column"]'), feed = document.querySelector('[data-testid="assessor-profile-feed-column"]'); if (!root || !summary || !feed) return false; const a=summary.getBoundingClientRect(), b=feed.getBoundingClientRect(); return root.getBoundingClientRect().width >= 760 ? b.x > a.x && Math.abs(a.y-b.y)<2 : b.y > a.y; });
      assert.equal(await page.getByTestId('assessor-profile-settings-column').count(), width >= 1200 ? 1 : 0);
      await page.getByTestId('assessor-profile-hero').scrollIntoViewIfNeeded(); await page.screenshot({ path: `dist/assessor-profile-feed/layout-${width}.png` });
    }
    mode = 'error'; await page.getByRole('button', { name: 'Tải lại bài đăng cộng đồng' }).click(); await page.getByRole('button', { name: 'Thử lại bài đăng' }).waitFor(); assert.equal(await page.getByTestId('assessor-posts-empty').count(), 0);
    mode = 'posts'; await page.getByRole('button', { name: 'Thử lại bài đăng' }).click(); const first = page.getByTestId('assessor-post-0'); await first.waitFor(); assert.equal(await page.getByTestId('assessor-post-foreign').count(), 0);
    await first.getByRole('button', { name: 'Thích bài viết', exact: true }).click(); await first.getByText('9 lượt thích', { exact: true }).waitFor(); assert.equal(likes, 1);
    await first.getByRole('button', { name: 'Lưu bài viết', exact: true }).click(); await first.getByText('Đã lưu', { exact: true }).waitFor(); assert.equal(saves, 1);
    await page.getByRole('button', { name: 'Xem thêm bài viết', exact: true }).click(); await page.getByTestId('assessor-post-next').waitFor(); assert.equal(await page.getByTestId('assessor-post-0').count(), 1); assert.ok(pages.includes(2));
    await first.waitFor(); await page.setViewportSize({ width: 1920, height: 1100 }); await page.getByTestId('assessor-profile-hero').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'dist/assessor-profile-feed/posts-desktop.png' });
    const openCard = async (section, title, fields) => {
      await page.getByTestId('assessor-summary-' + section).getByRole('button', { name: 'Chỉnh sửa ' + title, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa ' + title, exact: true }); await dialog.waitFor();
      assert.deepEqual(await dialog.getByRole('textbox').evaluateAll(inputs => inputs.map(input => input.getAttribute('aria-label'))), fields);
      return dialog;
    };
    const save = async dialog => { await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); };
    const intro = page.getByTestId('assessor-summary-bio');
    await intro.getByText('Đang làm việc tại', { exact: true }).waitFor();
    assert.equal(await intro.getByText('Đơn vị / trường', { exact: true }).count(), 0);
    let dialog = await openCard('bio', 'Giới thiệu', ['Giới thiệu bản thân', 'Chức danh nghề nghiệp', 'Công ty đang làm việc', 'Địa chỉ']);
    await dialog.getByRole('textbox', { name: 'Chức danh nghề nghiệp', exact: true }).fill('Senior Assessor');
    await dialog.getByRole('textbox', { name: 'Địa chỉ', exact: true }).fill('Hà Nội');
    profile.phone = '0988888888'; await save(dialog);
    assert.equal(profile.phone, '0988888888'); assert.equal(profile.address, 'Hà Nội'); assert.equal(profile.assessorJson.jobTitle, 'Senior Assessor'); assert.equal(profile.assessorJson.yearsOfExperience, 5); assert.equal(profile.assessorJson.gitHubUrl, 'https://github.com/assessor');
    await page.getByTestId('assessor-summary-bio').getByText('Senior Assessor', { exact: true }).waitFor();
    dialog = await openCard('work', 'Kỹ năng chuyên môn', ['Các lĩnh vực chuyên môn']);
    await dialog.getByRole('textbox').fill('Cloud, Backend'); await save(dialog); assert.deepEqual(profile.assessorJson.expertise, ['Cloud', 'Backend']); assert.equal(profile.assessorJson.jobTitle, 'Senior Assessor');
    dialog = await openCard('contact', 'Liên hệ', ['Email liên hệ', 'Điện thoại']); await dialog.getByRole('textbox', { name: 'Điện thoại', exact: true }).fill('0912345678'); await save(dialog); assert.equal(profile.address, 'Hà Nội');
    dialog = await openCard('links', 'Liên kết', ['LinkedIn', 'GitHub', 'Website / Portfolio']); await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    dialog = await openCard('bio', 'Giới thiệu', ['Giới thiệu bản thân', 'Chức danh nghề nghiệp', 'Công ty đang làm việc', 'Địa chỉ']);
    await dialog.getByRole('button', { name: 'Xóa thông tin Giới thiệu', exact: true }).click(); await dialog.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(profile.bio, null); assert.equal(profile.address, null); assert.equal(profile.assessorJson.jobTitle, null); assert.equal(profile.assessorJson.companyName, null); assert.equal(profile.assessorJson.university, 'Đại học FPT');
    assert.equal(await intro.getByText('Đang làm việc tại', { exact: true }).count(), 0);
    assert.equal(await intro.getByText('Đại học FPT', { exact: true }).count(), 0, 'An attended university is not shown as a current workplace');
    assert.equal(profile.phone, '0912345678'); assert.equal(profile.assessorJson.education, 'Thạc sĩ'); assert.deepEqual(profile.assessorJson.expertise, ['Cloud', 'Backend']);
    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      dialog = await openCard('bio', 'Giới thiệu', ['Giới thiệu bản thân', 'Chức danh nghề nghiệp', 'Công ty đang làm việc', 'Địa chỉ']);
      await page.waitForFunction(() => { const dialog = document.querySelector('[role="dialog"]'); if (!dialog) return false; for (let el=dialog; el; el=el.parentElement) if (Number(getComputedStyle(el).opacity)<1) return false; return true; });
      const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width); assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 901);
      await dialog.screenshot({ path: `dist/assessor-profile-feed/intro-editor-${width}.png` });
      await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    }
    assert.deepEqual(errors, []); console.log('Assessor profile: responsive layout, owner feed/interactions and card-matched popup fields, saves, scoped clears and latest-data preservation passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
