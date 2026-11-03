const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.ASSESSOR_TEST_ORIGIN || 'http://127.0.0.1:8088';
const guid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const labels = ['Cộng đồng', 'Nhắn tin', 'Danh sách thẩm định', 'Thông báo', 'Hồ sơ'];
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage(); page.setDefaultTimeout(15000); const errors = [], startupErrors = [];
  page.on('pageerror', e => {
    // UI-only checks exclude the login hydration error reproduced in the unchanged baseline.
    // Keep it visible in output; unexpected login errors and every Assessor page error still fail.
    if (process.env.ASSESSOR_UI_ONLY === '1' && new URL(page.url()).pathname === '/login' && e.message.startsWith('Minified React error #418;')) startupErrors.push(e.message);
    else errors.push(e.message);
  });
  try {
    const profile = { id: guid(2), fullName: 'Nguyễn Minh An', nickname: 'minhan', displayName: 'Nguyễn Minh An', organizationName: null, avatarUrl: null, coverUrl: null, isVerified: false, bio: 'Chuyên gia công nghệ phần mềm. Đồng hành cùng sinh viên trong việc đánh giá và hoàn thiện dự án.', major: 'Kỹ thuật phần mềm', universityName: 'Đại học Công nghệ', phone: '0900000000' };
    const account = { id: guid(1), email: 'assessor@fixture.test', role: 2, status: 1, profileComplete: true, profile };
    const assignment = { id: guid(10), projectVerificationId: guid(11), assignedToUserId: profile.id, status: 0, assignedAt: '2026-11-01T00:00:00Z', scheduledStartAt: '2026-11-03T02:00:00Z', scheduledEndAt: '2026-11-03T03:00:00Z', meetingStartAt: null, meetingEndAt: null, reportDueAt: null, assignmentDueAt: null };
    const detail = { assignment, project: { id: guid(12), title: 'Nền tảng hỗ trợ học tập SkillSnap', projectField: 'Công nghệ phần mềm', description: 'Ứng dụng giúp sinh viên xây dựng kế hoạch học tập và phát triển kỹ năng thông qua các dự án thực tế.', status: 3, leaderId: guid(13) }, evidenceModeration: null, report: null };
    const post = { id: guid(20), authorUserId: guid(21), authorName: 'Cộng đồng UniNet', authorActorType: 0, description: 'Chia sẻ kinh nghiệm xây dựng sản phẩm và chuẩn bị hồ sơ thẩm định dự án cùng cộng đồng sinh viên.', mediaUrls: [], favoriteCount: 12, commentCount: 0, isFavorited: false, isSaved: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
    const notification = { id: guid(30), recipientUserId: account.id, type: 'verification.assignment.created', category: 'Verification', title: 'Bạn được phân công thẩm định', message: 'Mở hồ sơ để xem lịch và chi tiết dự án.', audience: 'personal', createdAt: '2026-11-01T00:00:00Z', readAt: null, targetType: 'ProjectVerification', targetId: assignment.projectVerificationId, targetUrl: null };
    let reads = 0, portfolioReads = 0, failList = false, reports = 0, createdSlots = 0, deletedSlots = 0; let slots = [];
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(v => { if (String(v).includes('"protocol"')) socket.send('{}\x1e'); }));
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname; const ok = json => route.fulfill({ json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'assessor-fixture', refreshToken: 'assessor-refresh', expiresAt: new Date(Date.now() + 3600000).toISOString(), requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/me')) return ok({ profile });
      if (path.endsWith('/profile/portfolio/me')) { portfolioReads++; return route.fulfill({ status: 403, json: { message: 'Student-only API' } }); }
      if (path.endsWith('/community/posts')) return ok({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1, data: [post] });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 3 });
      if (path.endsWith('/notifications/' + notification.id + '/target')) return ok({ targetUrl: '/assessor-assessments/' + assignment.id });
      if (path.endsWith('/notifications')) return ok({ items: [notification], page: 1, pageSize: 20, total: 1, unreadCount: 3 });
      if (path.endsWith('/read') || path.endsWith('/read-all')) return route.fulfill({ status: 204 });
      if (path.endsWith('/assignments/me')) { reads++; if (failList) return route.fulfill({ status: 503, json: { message: 'Không tải được danh sách thử nghiệm' } }); const assignments = url.searchParams.has('status') && Number(url.searchParams.get('status')) !== assignment.status ? [] : [assignment]; return ok({ page: 1, pageSize: 10, totalItems: assignments.length, totalPages: assignments.length ? 1 : 0, assignments }); }
      if (path.endsWith('/assignments/' + assignment.id)) return ok(detail);
      if (path.endsWith('/meeting/start')) { assignment.meetingStartAt = new Date().toISOString(); return ok({ ...assignment, assignmentId: assignment.id }); }
      if (path.endsWith('/meeting/end')) { assignment.meetingEndAt = new Date().toISOString(); return ok({ ...assignment, assignmentId: assignment.id }); }
      if (path.endsWith('/reports') && request.method() === 'POST') { const body = request.postDataJSON(); assert.equal(body.assignmentId, assignment.id); assert.equal(body.outcome, 1); reports++; assignment.status = 1; detail.report = { id: guid(40), ...body, submittedAt: new Date().toISOString() }; return ok(detail.report); }
      if (path.endsWith('/verificators/me/availability')) {
        if (request.method() === 'POST') { createdSlots++; const slot = { id: guid(50), ...request.postDataJSON() }; slots.push(slot); return ok(slot); }
        return ok(slots);
      }
      if (path.endsWith('/availability/' + guid(50)) && request.method() === 'DELETE') { deletedSlots++; slots = []; return route.fulfill({ status: 204 }); }
      if (path.endsWith('/target')) return ok({ targetUrl: null });
      return ok([]);
    });
    await page.goto(origin + '/login');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(/assessor-community/);
    await page.getByText(post.description, { exact: true }).waitFor();
    const desktopNav = page.getByTestId('assessor-header-navigation').and(page.getByRole('tablist'));
    assert.deepEqual(await desktopNav.getByRole('tab').evaluateAll(tabs => tabs.map(tab => tab.getAttribute('aria-label'))), labels);
    assert.equal(portfolioReads, 0, 'Assessor must not call student portfolio APIs');
    fs.mkdirSync('dist/assessor-check', { recursive: true }); await page.screenshot({ path: 'dist/assessor-check/community-desktop.png', fullPage: true });
    if (process.env.ASSESSOR_UI_ONLY === '1') {
      const destinations = [
        { key: 'community', label: labels[0], ready: () => page.getByText(post.description, { exact: true }) },
        { key: 'messages', label: labels[1], ready: () => page.getByRole('heading', { name: 'Chưa có cuộc trò chuyện', exact: true }) },
        { key: 'assessments', label: labels[2], ready: () => page.getByText(detail.project.title, { exact: true }) },
        { key: 'notifications', label: labels[3], ready: () => page.getByText(notification.title, { exact: true }) },
        { key: 'profile', label: labels[4], ready: () => page.getByRole('heading', { name: profile.fullName, exact: true }) },
      ];
      for (const width of [1920, 1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
        const nav = page.getByTestId(width >= 1024 ? 'assessor-header-navigation' : 'assessor-footer-navigation').and(page.getByRole('tablist'));
        if (width >= 1024) {
          assert.equal(await page.getByTestId('assessor-header-main').getByRole('tab').count(), 3);
          const actions = page.getByTestId('assessor-header-actions');
          assert.equal(await actions.getByRole('tab').count(), 2);
          assert.equal(await actions.getByText('Thông báo', { exact: true }).count(), 0, 'desktop notification uses an icon action like Student');
          assert.equal(await actions.getByText('Hồ sơ', { exact: true }).count(), 0, 'desktop profile uses an icon action like Student');
          const navBox = await nav.boundingBox(), actionsBox = await actions.boundingBox();
          assert(Math.abs(navBox.x + navBox.width - actionsBox.x - actionsBox.width) < 2, 'account actions align to the right');
        }
        for (const destination of destinations) {
          await nav.getByRole('tab', { name: destination.label, exact: true }).click();
          await destination.ready().waitFor();
          assert.equal(await nav.getByRole('tab', { name: destination.label, exact: true }).getAttribute('aria-selected'), 'true');
          await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
          assert.equal(await page.locator('h1, [role="heading"][aria-level="1"], [role="header"][aria-level="1"]').count(), destination.key === 'community' ? 0 : 1, destination.key + ' uses its expected heading layout');
          if (destination.key === 'community') {
            assert.equal(await page.getByText('Đồng hành cùng dự án', { exact: true }).count(), 0);
            assert.equal(await page.getByText('KHÔNG GIAN CHUYÊN GIA', { exact: true }).count(), 0);
          }
          if (destination.key === 'notifications') {
            assert.equal(await page.getByTestId('notification-category-trigger').count(), 0);
            await page.getByText('Những cập nhật dành cho bạn trên UniNet.', { exact: true }).waitFor();
            assert.equal(await page.getByText('Đồng hành cùng dự án', { exact: true }).count(), 0);
            assert.equal(await page.getByText('Truy cập nhanh', { exact: true }).count(), 0);
          }
          if (destination.key === 'profile') {
            const rail = page.getByTestId('assessor-profile-settings-column');
            if (width >= 1200) {
              const railBox = await rail.boundingBox(), mainBox = await page.getByTestId('assessor-profile-main-column').boundingBox();
              assert.equal(Math.round(railBox.width), 400, 'settings matches Student desktop width');
              assert(Math.abs(railBox.y - mainBox.y) < 2, 'profile and settings start on the same row');
              assert(Math.abs(railBox.x - mainBox.x - mainBox.width - 24) < 2, 'Student-style 24px column gap');
              assert(Math.abs(width - railBox.x - railBox.width - (Math.max((width - 1800) / 2, 0) + 16)) < 2, 'Student-style right inset');
              assert(railBox.y + railBox.height <= 981, 'settings fits above the desktop bottom inset');
              const heroBox = await page.getByTestId('assessor-profile-hero').boundingBox();
              const contentWidth = Math.min(mainBox.width, 1000);
              assert(Math.abs(heroBox.x - mainBox.x - (mainBox.width - contentWidth) / 2 - 24) < 2, 'profile content has centered reference insets');
              assert(Math.abs(heroBox.width - contentWidth + 48) < 2, 'profile content keeps 24px internal side padding');
              await rail.getByRole('button', { name: 'Ví thu nhập', exact: true }).waitFor();
            } else {
              assert.equal(await rail.count(), 0);
              await page.getByRole('button', { name: 'Mở cài đặt', exact: true }).waitFor();
            }
          }
          if (width === 1920 || width === 1440 || width === 390 || width === 320) await page.screenshot({ path: `dist/assessor-check/${destination.key}-${width}.png`, fullPage: true });
          if (destination.key === 'messages') {
            await page.getByRole('tab', { name: 'Lời mời trò chuyện', exact: true }).focus();
            await page.keyboard.press('Enter');
            await page.getByRole('heading', { name: 'Chưa có lời mời trò chuyện', exact: true }).waitFor();
            await page.getByRole('tab', { name: 'Hộp thư', exact: true }).click();
            await destination.ready().waitFor();
          }
          if (destination.key === 'assessments') {
            const filter = await page.getByRole('button', { name: 'Tất cả', exact: true }).boundingBox();
            assert(filter && filter.height >= 44 && filter.height <= 56, 'status filters keep a compact touch target');
            const card = await page.getByRole('button', { name: 'Xem thẩm định ' + detail.project.title }).boundingBox();
            assert(card && card.x >= 0 && card.x + card.width <= width, 'assignment cards fit without clipping');
          }
          if (width < 1024) {
            const box = await nav.boundingBox();
            assert(box && box.y >= 0 && box.y + box.height <= (width < 700 ? 845 : 1001), 'footer remains in viewport');
          }
        }
      }
      const nav = page.getByTestId('assessor-footer-navigation').and(page.getByRole('tablist'));
      await nav.getByRole('tab', { name: labels[2], exact: true }).click();
      await page.getByRole('button', { name: 'Quá hạn', exact: true }).click();
      await page.getByText('Không có công việc ở trạng thái này', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
      failList = true;
      await page.getByRole('button', { name: 'Tải lại danh sách thẩm định', exact: true }).click();
      await page.getByText('Không tải được danh sách thử nghiệm', { exact: true }).first().waitFor();
      failList = false;
      await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await page.getByText(detail.project.title, { exact: true }).waitFor();
      profile.major = null;
      await nav.getByRole('tab', { name: labels[4], exact: true }).click();
      await page.getByText('Chưa cập nhật', { exact: true }).waitFor();
      assert.equal(portfolioReads, 0); assert.deepEqual(errors, []);
      if (startupErrors.length) console.warn('Known baseline issue: login emits React hydration #418 before entering Assessor; no Assessor runtime errors.');
      console.log('Five Assessor pages: 320/390/768/1024/1440/1920px, desktop profile geometry, headings, selected tabs, inbox states, list empty/error/retry, fixed footer and screenshots: OK');
      return;
    }
    await desktopNav.getByRole('tab', { name: 'Danh sách thẩm định', exact: true }).click();
    await page.getByText(detail.project.title, { exact: true }).waitFor(); await page.screenshot({ path: 'dist/assessor-check/assessments-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Quá hạn', exact: true }).click(); await page.getByText('Không có công việc ở trạng thái này', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click(); await page.getByRole('button', { name: 'Xem thẩm định ' + detail.project.title }).click();
    await page.getByRole('heading', { name: detail.project.title }).waitFor();
    await page.getByRole('button', { name: 'Bắt đầu buổi thẩm định' }).click(); await page.getByRole('button', { name: 'Kết thúc buổi thẩm định' }).click();
    await page.getByRole('textbox', { name: 'Tóm tắt thẩm định' }).fill('Báo cáo đang soạn, cần được giữ khi chuyển trang.');
    await desktopNav.getByRole('tab', { name: 'Nhắn tin', exact: true }).click(); await page.getByRole('heading', { name: 'Nhắn tin', exact: true }).waitFor();
    await desktopNav.getByRole('tab', { name: 'Danh sách thẩm định', exact: true }).click(); await page.getByRole('button', { name: 'Xem thẩm định ' + detail.project.title }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Tóm tắt thẩm định' }).inputValue(), 'Báo cáo đang soạn, cần được giữ khi chuyển trang.');
    await page.getByRole('textbox', { name: 'Kết quả kiểm tra', exact: true }).fill('Sản phẩm đáp ứng các yêu cầu đánh giá.'); await page.getByRole('textbox', { name: 'Khuyến nghị', exact: true }).fill('Bổ sung hướng dẫn sử dụng và tiếp tục phát triển.');
    await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận gửi báo cáo' }).click(); await page.getByText('Báo cáo đang soạn, cần được giữ khi chuyển trang.', { exact: true }).waitFor(); assert.equal(reports, 1);
    await desktopNav.getByRole('tab', { name: 'Thông báo', exact: true }).click(); await page.getByText(notification.title, { exact: true }).click(); await page.waitForURL(/assessor-assessments\//); await page.getByRole('heading', { name: detail.project.title }).waitFor();
    await page.reload(); await page.getByRole('heading', { name: detail.project.title }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.getByTestId('assessor-footer-navigation').and(page.getByRole('tablist')); await mobileNav.waitFor();
    assert.equal(await mobileNav.getByRole('tab').count(), 5); const before = await mobileNav.boundingBox(); assert(before.y + before.height <= 845);
    await mobileNav.getByRole('tab', { name: 'Hồ sơ', exact: true }).click(); await page.getByRole('heading', { name: profile.fullName, exact: true }).waitFor();
    await page.getByText('Thông tin cá nhân', { exact: true }).scrollIntoViewIfNeeded(); const after = await mobileNav.boundingBox(); assert.equal(Math.round(after.y), Math.round(before.y));
    await page.screenshot({ path: 'dist/assessor-check/profile-mobile.png', fullPage: true });
    await mobileNav.getByRole('tab', { name: 'Danh sách thẩm định', exact: true }).click(); await page.getByText(detail.project.title, { exact: true }).waitFor(); await page.screenshot({ path: 'dist/assessor-check/assessments-mobile.png', fullPage: true });
    failList = true; await page.getByRole('button', { name: 'Tải lại danh sách thẩm định' }).click(); await page.getByText('Không tải được danh sách thử nghiệm', { exact: true }).first().waitFor(); failList = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByText(detail.project.title, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lịch làm việc', exact: true }).click();
    const future = new Date(Date.now() + 2 * 86400000); const pad = n => String(n).padStart(2, '0'); const day = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;
    await page.getByRole('textbox', { name: 'Bắt đầu khung giờ' }).fill(day + ' 09:00'); await page.getByRole('textbox', { name: 'Kết thúc khung giờ' }).fill(day + ' 11:00'); await page.getByRole('button', { name: 'Thêm khung giờ', exact: true }).click();
    await page.getByRole('button', { name: 'Xóa khung giờ', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await page.getByText('Chưa có khung giờ rảnh', { exact: true }).waitFor(); assert.equal(createdSlots, 1); assert.equal(deletedSlots, 1);
    for (const width of [320, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); const nav = page.getByTestId(width >= 1024 ? 'assessor-header-navigation' : 'assessor-footer-navigation').and(page.getByRole('tablist')); await nav.getByRole('tab', { name: 'Cộng đồng', exact: true }).click(); await page.getByText(post.description, { exact: true }).waitFor(); }
    assert(reads > 0); assert.equal(portfolioReads, 0); assert.deepEqual(errors, []); console.log('Assessor login, five tabs, assignment lifecycle, draft retention, notifications, profile and responsive navigation: OK');
  } catch (e) { fs.mkdirSync('dist/assessor-check', { recursive: true }); await page.screenshot({ path: 'dist/assessor-check/failure.png', fullPage: true }); fs.writeFileSync('dist/assessor-check/failure.txt', await page.locator('body').innerText()); throw e; }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
