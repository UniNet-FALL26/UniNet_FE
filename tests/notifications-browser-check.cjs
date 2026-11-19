const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const role of [0, 1]) {
      const account = { id: `notification-account-${role}`, email: `notifications-${role}@example.test`, role, profileComplete: true, profile: { id: `profile-${role}`, displayName: 'Notification Test', fullName: 'Notification Test', isVerified: true } };
      const row = id => ({ id, recipientUserId: account.id, type: 'verification.approved', category: 'verification', title: `Thông báo dành cho ${role === 0 ? 'sinh viên' : 'đối tác'}`, message: 'Yêu cầu xác minh tài khoản đã được xử lý.', audience: 'personal', readAt: null, createdAt: '2026-10-25T00:00:00Z', targetType: 'UserVerification', targetId: '00000000-0000-4000-8000-000000000001' });
      const rows = [{ ...row('one'), targetType: null, targetId: null }]; let socket, connectionCount = 0;
      let holdReads = true;
      const heldReads = [];
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      await page.clock.install({ time: new Date('2026-10-25T12:00:00+07:00') });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.routeWebSocket('**/hubs/notifications*', ws => {
        socket = ws; connectionCount++;
        ws.onMessage(message => {
          if (String(message).includes('"protocol"')) ws.send('{}\x1e');
          if (String(message).includes('"type":6')) ws.send('{"type":6}\x1e');
        });
      });
      await page.route('**/*', route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname;
        const unread = rows.filter(row => !row.readAt).length;
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
        if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'test-access', refreshToken: 'test-refresh', requiresProfileCompletion: false } });
        if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
        if (path.endsWith('/notifications/negotiate')) return route.fulfill({ json: { negotiateVersion: 1, connectionId: 'test', connectionToken: 'test', availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }] } });
        if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { count: unread } });
        if (path.endsWith('/notifications/read-all')) { rows.forEach(row => { row.readAt = new Date().toISOString(); }); return route.fulfill({ status: 204 }); }
        if (/\/notifications\/[^/]+\/read$/.test(path)) {
          if (holdReads) { heldReads.push(route); return; }
          const row = rows.find(row => path.endsWith(`/${row.id}/read`)); if (row) row.readAt = new Date().toISOString(); return route.fulfill({ status: 204 });
        }
        if (/\/notifications\/[^/]+\/target$/.test(path)) return route.fulfill({ status: 403, json: { message: 'Bạn không còn quyền truy cập.' } });
        if (path.endsWith('/notifications')) {
          const filtered = rows.filter(row => (!url.searchParams.get('category') || row.category === url.searchParams.get('category')) && (url.searchParams.get('unreadOnly') !== 'true' || !row.readAt) && (url.searchParams.get('readOnly') !== 'true' || !!row.readAt));
          const number = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('pageSize') || 20);
          return route.fulfill({ json: { items: filtered.slice((number - 1) * size, number * size), page: number, pageSize: size, total: filtered.length, unreadCount: unread } });
        }
        if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile } } });
        if (path.endsWith('/partner/dashboard')) return route.fulfill({ status: 503, json: { message: 'Tổng quan chưa khả dụng trong kiểm thử.' } });
        if (path.includes('/api/')) return route.fulfill({ json: [] });
        if (url.origin !== origin) return route.fulfill({ status: 204 });
        return route.continue();
      });
      await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function'))).catch(async error => { console.error((await page.locator('body').innerText()).slice(0, 1800), errors); throw error; });
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.getByTestId('notification-unread-badge').getByText('1', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
      await page.waitForURL(url => url.pathname === (role === 0 ? '/notifications' : '/company-notifications'), { timeout: 5000 });
      assert.equal(await page.getByTestId('notifications-popup').count(), 0, 'bell opens a dedicated page without a popup');
      const inbox = page.getByTestId('notifications-page'); await inbox.waitFor();
      assert.equal(await inbox.getByTestId('notification-category-trigger').count(), 0, 'category dropdown has been removed');
      await inbox.getByTestId('notification-one').waitFor();
      await page.screenshot({ path: `dist/notifications/list-role-${role}.png` });
      if (await page.getByTestId('action-toast').count()) {
        await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).click();
        await page.getByTestId('action-toast').waitFor({ state: 'detached' });
      }
      assert.ok(page.url().includes(role === 0 ? '/notifications' : '/company-notifications'));
      await inbox.getByTestId('notification-one').click();
      await inbox.getByTestId('notification-unread-one').waitFor({ state: 'detached' });
      await page.getByTestId('notification-unread-badge').waitFor({ state: 'detached' });
      assert.equal(rows[0].readAt, null, 'row and badge update before read PATCH completes');
      assert.equal(await page.getByTestId('action-toast').count(), 0, 'no read success toast');
      for (let i = 0; i < 100 && !heldReads.length; i++) await page.waitForTimeout(10);
      assert.equal(heldReads.length, 1);
      socket.send('{"type":1,"target":"NotificationChanged","arguments":[{"reason":"changed"}]}\x1e');
      await heldReads.shift().fulfill({ status: 503, json: { message: 'Không lưu được trạng thái đọc.' } });
      await page.getByTestId('action-toast').getByText('Không lưu được trạng thái đọc.', { exact: true }).waitFor();
      await inbox.getByTestId('notification-unread-one').waitFor();
      await page.getByTestId('notification-unread-badge').getByText('1', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).click();
      rows[0].targetUrl = '/settings';
      const linkedRefresh = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/notifications'));
      socket.send('{"type":1,"target":"NotificationChanged","arguments":[{"reason":"changed"}]}\x1e');
      await linkedRefresh;
      await inbox.getByTestId('notification-one').click();
      await page.waitForURL(url => url.pathname === '/settings');
      assert.equal(rows[0].readAt, null, 'linked target opens before read PATCH completes');
      for (let i = 0; i < 100 && !heldReads.length; i++) await page.waitForTimeout(10);
      await heldReads.shift().fulfill({ status: 503, json: { message: 'Không lưu được trạng thái đọc.' } });
      await page.getByTestId('action-toast').getByText('Không lưu được trạng thái đọc.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).click();
      rows[0].targetUrl = null;
      await page.goBack();
      await inbox.getByTestId('notification-unread-one').waitFor();
      await page.getByTestId('notification-unread-badge').getByText('1', { exact: true }).waitFor();
      holdReads = false;
      const successfulRead = page.waitForResponse(response => /\/notifications\/[^/]+\/read$/.test(new URL(response.url()).pathname) && response.status() === 204);
      await inbox.getByTestId('notification-one').click();
      await successfulRead;
      if (new URL(page.url()).pathname === '/settings') await page.goBack();
      await inbox.waitFor({ state: 'visible' });
      await inbox.getByTestId('notification-unread-one').waitFor({ state: 'detached' });
      assert.equal(await inbox.getByRole('alert').count(), 0, 'unavailable destinations are silent');
      assert.equal(await page.getByTestId('notification-unread-badge').count(), 0);
      rows.unshift(row('two'));
      assert.ok(socket, 'authenticated SignalR websocket established');
      socket.send('{"type":1,"target":"NotificationChanged","arguments":[{"notificationId":"two","reason":"created"}]}\x1e');
      await inbox.getByTestId('notification-two').waitFor();
      await page.getByTestId('notification-unread-badge').getByText('1', { exact: true }).waitFor();
      socket.close({ code: 1012, reason: 'test reconnect' });
      await page.waitForTimeout(250);
      for (let i = 0; i < 50 && connectionCount < 2; i++) await page.waitForTimeout(100);
      assert.ok(connectionCount >= 2, 'SignalR reconnect establishes a fresh connection');
      await inbox.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
      await page.getByTestId('notification-unread-badge').waitFor({ state: 'detached' });
      await inbox.getByRole('tab', { name: 'Chưa đọc', exact: true }).click();
      await inbox.getByText('Bạn đã đọc hết thông báo', { exact: true }).waitFor();
      await inbox.getByRole('tab', { name: 'Đã đọc', exact: true }).click();
      await inbox.getByTestId('notification-one').waitFor();
      assert.equal(await inbox.getByTestId('notification-unread-one').count(), 0);
      await inbox.getByRole('tab', { name: 'Tất cả', exact: true }).click();
      const fixtures = [
        ['like', 'community.post.liked', 'community', 'Nguyễn Thị Mai đã thích bài viết của bạn', '“Kinh nghiệm học .NET cho người mới bắt đầu”', '2026-10-25T04:55:00Z'],
        ['comment', 'community.comment.created', 'community', 'Trần Minh Đức đã bình luận bài viết của bạn', '“Kinh nghiệm học .NET cho người mới bắt đầu”', '2026-10-25T04:45:00Z'],
        ['mention', 'community.mentioned', 'community', 'Lê Anh Thư đã tag bạn trong một bài viết', '“Các tài nguyên học lập trình web”', '2026-10-25T04:00:00Z'],
        ['reply', 'community.comment.replied', 'community', 'Phạm Quốc Bảo đã trả lời bình luận của bạn', '“Bạn có thể chia sẻ thêm về phần cài đặt không?”', '2026-10-25T03:00:00Z'],
        ['job', 'recruitment.posting.approved', 'recruitment', 'Tin tuyển dụng được duyệt', 'Tin tuyển dụng “Frontend Developer” của bạn đã được duyệt.', '2026-10-24T04:00:00Z'],
        ['verification', 'verification.student.approved', 'verification', 'Xác minh tài khoản thành công', 'Tài khoản của bạn đã được xác minh thành công.', '2026-10-24T03:00:00Z'],
        ['follow', 'community.user.followed', 'community', 'Nguyễn Văn Nam đã bắt đầu theo dõi bạn', 'Sinh viên · FPT University', '2026-10-24T02:00:00Z'],
        ['project', 'project.invitation.received', 'project', 'Bạn được mời tham gia dự án', 'Nguyễn Hoàng đã mời bạn tham gia “Hệ thống quản lý học tập”.', '2026-10-22T04:00:00Z'],
        ['system', 'SystemAnnouncement', 'system', 'Thông báo bảo trì hệ thống', 'UniNet sẽ bảo trì hệ thống vào ngày 25/10/2026 từ 01:00 đến 04:00.', '2026-10-20T04:00:00Z'],
      ];
      rows.splice(0, rows.length, ...fixtures.map(([id, type, category, title, message, createdAt], index) => ({ ...row('design-' + id), type, category, title, message, createdAt, readAt: index > 2 ? createdAt : null })));
      socket.send('{"type":1,"target":"NotificationChanged","arguments":[{"reason":"created"}]}\x1e');
      await inbox.getByTestId('notification-design-like').waitFor();
      for (const label of ['Hôm nay', 'Trước đó']) await inbox.getByTestId('notification-group-' + label).waitFor();
      await inbox.getByTestId('notification-design-project').waitFor();
      assert.equal(await inbox.locator('[data-testid^="notification-tab-count-"]').count(), 0, 'tabs display labels without counts');
      await inbox.getByRole('tab', { name: 'Đã đọc', exact: true }).click();
      await inbox.getByTestId('notification-design-project').waitFor();
      assert.equal(await inbox.getByTestId('notification-design-like').count(), 0, 'read tab excludes unread rows');
      await inbox.getByRole('tab', { name: 'Chưa đọc', exact: true }).click();
      await inbox.getByTestId('notification-design-like').waitFor();
      assert.equal(await inbox.getByTestId('notification-design-project').count(), 0, 'unread tab excludes read rows');
      await inbox.getByRole('tab', { name: 'Tất cả', exact: true }).click();
      await inbox.getByTestId('notification-design-project').waitFor();
      assert.equal(await inbox.getByRole('button', { name: /^Tùy chọn thông báo:/ }).count(), 0, 'row option menus are removed');
      await inbox.getByTestId('notification-design-comment').click();
      await inbox.getByTestId('notification-unread-design-comment').waitFor({ state: 'detached' });
      await inbox.getByTestId('notification-design-comment').waitFor();
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const controls = await Promise.all([inbox.getByRole('tablist', { name: 'Trạng thái thông báo', exact: true }), inbox.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true })].map(control => control.boundingBox()));
        const rowCenters = controls.map(box => box.y + box.height / 2);
        assert.ok(Math.max(...rowCenters) - Math.min(...rowCenters) < 8, `controls share a row at ${width}px`);
        await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth).catch(async error => { await page.screenshot({ path: `dist/notifications/overflow-role-${role}-${width}.png` }); throw error; });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no page overflow at ${width}px for role ${role}`);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `dist/notifications/role-${role}-${width}.png` });
      }
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await page.screenshot({ path: `dist/notifications/role-${role}-landscape.png` });
      await page.setViewportSize({ width: 1440, height: 900 });
      rows.push(...Array.from({ length: 22 }, (_, index) => ({ ...row('page-' + index), category: 'system', type: 'SystemAnnouncement', createdAt: '2026-09-01T00:00:00Z' })));
      socket.send('{"type":1,"target":"NotificationChanged","arguments":[{"reason":"created"}]}\x1e');
      await inbox.getByTestId('notification-page-0').waitFor();
      assert.equal(await inbox.getByTestId('notification-page-21').count(), 0, 'server totals include notifications beyond the loaded page');
      await inbox.getByRole('button', { name: 'Xem thêm thông báo', exact: true }).click();
      await inbox.getByTestId('notification-page-21').waitFor();
      await inbox.getByTestId('notification-group-Trước đó').waitFor();
      if (role === 0) {
        await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
        await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
        await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor();
        assert.equal(await page.getByTestId('notification-unread-badge').count(), 0);
        account.id = 'replacement-account'; account.email = 'replacement@example.test';
        rows.splice(0, rows.length);
        await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
        await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('test-password');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
        await page.getByTestId('notifications-page').getByText('Chưa có thông báo', { exact: true }).waitFor();
        assert.equal(await page.getByTestId('notification-one').count(), 0, 'old account notifications removed');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Student/Partner inbox: reference layout, central icons, categories/counts, date groups, row actions, pagination, realtime, reconnect and account isolation verified.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
