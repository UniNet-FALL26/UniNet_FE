const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.FRIEND_TEST_ORIGIN || 'http://localhost:8084';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample); data.isOwner = true;
    const account = { id: 'own-account', email: 'friends@example.test', role: 0, profileComplete: true, profile: data.profile };
    const person = (key, relationship = 'none') => ({ accountId: key, profileId: 'profile-' + key, fullName: key, nickname: key.toLowerCase(), avatarUrl: null, role: 0, mutualFriendsCount: 3, relationship, friendshipId: relationship === 'none' ? null : 'friend-' + key, friendshipVersion: 1 });
    const people = [person('Friend', 'friends'), person('Alice', 'incoming'), person('Bob', 'incoming'), person('New person'), person('Other friend', 'friends')];
    let removals = 0, uncertainSend = false, failRejection = false, failList = false;
    const projectInvites = [], projectRequests = [];
    const project = { id: 'friends-project', title: 'Friends project', description: 'Invite team', technologies: [], origin: 1, status: 2, visibility: 0, mode: 'personal', isOwner: true, isMember: true, creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [], details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, endDate: null, completedAt: null }, recruitment: null, myReview: null, createdAt: '2026-11-17T00:00:00Z' };
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = decodeURIComponent(url.pathname), method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.includes('/profile/portfolio/')) { const target = people.find(p => path.endsWith('/' + p.profileId)); return ok({ ...data, isOwner: false, profile: { ...data.profile, ...target, id: target?.profileId } }); }
      if (path.includes('/friendships/relationship/')) return ok(people.find(p => path.endsWith('/' + p.profileId)));
      if (path.endsWith('/friendships/requests') && method === 'POST') {
        const target = people.find(p => p.accountId === route.request().postDataJSON().receiverAccountId);
        target.relationship = 'outgoing'; target.friendshipId = 'friend-' + target.accountId; target.friendshipVersion++;
        if (uncertainSend) { uncertainSend = false; return route.fulfill({ status: 500, json: { message: 'Uncertain response' } }); }
        return ok(target);
      }
      if (path.includes('/friendships/') && method !== 'GET') {
        const target = people.find(p => path.split('/')[3] === p.friendshipId); assert.ok(target);
        assert.equal(route.request().postDataJSON().version, target.friendshipVersion);
        if (path.endsWith('/reject') && failRejection) { failRejection = false; return route.fulfill({ status: 500, json: { message: 'Không thể từ chối lúc này.' } }); }
        target.friendshipVersion++;
        if (path.endsWith('/accept')) target.relationship = 'friends';
        else { target.relationship = 'none'; if (method === 'DELETE') removals++; }
        return ok(target);
      }
      if (path.includes('/friendships')) {
        if (failList) { failList = false; return route.fulfill({ status: 500, json: { message: 'Không thể tải danh sách.' } }); }
        const kind = path.endsWith('/received') ? 'incoming' : path.endsWith('/sent') ? 'outgoing' : path.endsWith('/people') ? null : 'friends';
        let items = people.filter(p => !kind || p.relationship === kind);
        if (url.searchParams.get('projectId')) items = items.filter(p => !projectInvites.includes(p.profileId));
        const q = url.searchParams.get('q')?.toLowerCase(); if (q) items = items.filter(p => p.fullName.toLowerCase().includes(q));
        const currentPage = Number(url.searchParams.get('page') || 1);
        return ok({ items: items.slice((currentPage - 1) * 20, currentPage * 20), page: currentPage, pageSize: 20, total: items.length });
      }
      if (path.endsWith('/project-hub/' + project.id + '/requests')) {
        if (method === 'POST') {
          const body = route.request().postDataJSON();
          assert.equal(body.requestType, 1); assert.equal(body.role, 'UX researcher'); assert.equal(body.positionId, undefined);
          assert.ok(!projectInvites.includes(body.invitedUserId)); projectInvites.push(body.invitedUserId); projectRequests.push({ ...body, id: 'invite-' + projectInvites.length, projectId: project.id, userId: body.invitedUserId, fullName: people.find(p => p.profileId === body.invitedUserId).fullName, status: 0 });
          return ok({ ...body, id: 'invite-' + projectInvites.length });
        }
        return ok({ items: projectRequests });
      }
      if (path.endsWith('/project-hub/requests/mine')) return ok({ items: projectRequests.filter(r => r.userId === data.profile.id) });
      const decision = projectRequests.find(r => path.endsWith('/project-hub/requests/' + r.id + '/decision'));
      if (decision) {
        const action = route.request().postDataJSON().decision;
        assert.equal(decision.userId, data.profile.id);
        decision.status = action === 'accept' ? 1 : 2;
        if (action === 'accept') {
          project.isMember = true; project.mode = 'community';
          project.members.push({ id: 'accepted-member', userId: data.profile.id, fullName: data.profile.fullName, role: decision.role, status: 0 });
        }
        return ok(decision);
      }
      if (path.endsWith('/project-hub/' + project.id)) return ok(project);
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    if (process.env.FRIEND_CLIENT_RENDER === '1') await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('input').length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/profile/friends');
    const profileTabs = page.getByRole('tablist', { name: 'Nội dung hồ sơ', exact: true });
    await page.getByTestId('friend-person-Friend').waitFor();
    await page.getByRole('heading', { name: 'Kết nối với bạn bè trên UniNet', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Tìm bạn bè', exact: true }).count(), 0);
    await page.getByRole('tab', { name: 'Bạn bè', exact: true }).first().waitFor();
    assert.deepEqual(await profileTabs.getByRole('tab').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label'))), ['Hồ sơ', 'Bài viết', 'Dự án', 'Bạn bè']);
    await page.getByTestId('friend-person-Friend').waitFor();
    const listTabs = page.getByRole('tablist', { name: 'Danh sách bạn bè', exact: true });
    assert.deepEqual(await listTabs.getByRole('tab').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label'))), ['Bạn bè', 'Lời mời kết bạn']);
    const bannerBox = await page.getByTestId('friends-banner').boundingBox(), tabsBox = await listTabs.boundingBox();
    assert.ok(tabsBox.y >= bannerBox.y && tabsBox.y + tabsBox.height <= bannerBox.y + bannerBox.height + 1);
    await page.getByTestId('friends-banner').screenshot({ path: 'C:/Users/minec/UniNet/friends-banner-check.png', animations: 'disabled' });
    await page.getByTestId('friend-person-Friend').getByText('3 bạn chung', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('friend-person-Friend').getByText('@friend').count(), 0);
    const menuTrigger = page.getByTestId('friend-person-Friend').getByRole('button', { name: 'Tùy chọn bạn bè với Friend', exact: true });
    await menuTrigger.focus(); await page.keyboard.press('Enter');
    await page.getByRole('menuitem', { name: 'Hủy kết bạn' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('menu').waitFor({ state: 'hidden' });
    assert.equal(await menuTrigger.evaluate(node => node === document.activeElement), true);
    await menuTrigger.click();
    await page.getByRole('menu').waitFor();
    await page.mouse.click(8, 8);
    await page.getByRole('menu').waitFor({ state: 'hidden' });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width < 600) await page.getByTestId('friends-banner').waitFor({ state: 'detached' });
      else await page.getByTestId('friends-banner').waitFor();
      assert.equal(await listTabs.getByRole('tab').count(), 2);
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    const searchBox = await page.getByTestId('friends-search').boundingBox();
    assert.ok(searchBox.width <= 200 && searchBox.height <= 38);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/friends-desktop.png', animations: 'disabled' });
    await page.getByTestId('friend-person-Friend').getByRole('button', { name: 'Tùy chọn bạn bè với Friend', exact: true }).click(); await page.getByRole('menuitem', { name: 'Hủy kết bạn', exact: true }).click();
    assert.equal(removals, 0); await page.getByRole('button', { name: 'Giữ kết bạn', exact: true }).click(); assert.equal(removals, 0);
    await page.getByTestId('friend-person-Friend').getByRole('button', { name: 'Tùy chọn bạn bè với Friend', exact: true }).click(); await page.getByRole('menuitem', { name: 'Hủy kết bạn', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận hủy kết bạn', exact: true }).click();
    await page.getByTestId('friend-person-Friend').waitFor({ state: 'hidden' }); assert.equal(removals, 1);
    await page.getByRole('tab', { name: 'Lời mời kết bạn', exact: true }).click();
    await page.getByTestId('friend-person-Alice').waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'C:/Users/minec/UniNet/friends-requests-mobile.png', animations: 'disabled' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'C:/Users/minec/UniNet/friends-requests-desktop.png', animations: 'disabled' });
    await page.getByTestId('friend-person-Alice').getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByTestId('friend-person-Alice').waitFor({ state: 'hidden' });
    failRejection = true;
    await page.getByTestId('friend-person-Bob').getByRole('button', { name: 'Xóa', exact: true }).click();
    await page.getByTestId('friend-person-Bob').getByRole('alert').waitFor();
    assert.equal(people.find(p => p.accountId === 'Bob').relationship, 'incoming');
    await page.getByTestId('friend-person-Bob').getByRole('button', { name: 'Xóa', exact: true }).click(); await page.getByTestId('friend-person-Bob').waitFor({ state: 'hidden' });
    await page.getByText('Bạn chưa có lời mời kết bạn mới.', { exact: true }).waitFor();
    failList = true;
    await listTabs.getByRole('tab', { name: 'Bạn bè', exact: true }).click();
    await page.getByRole('alert').waitFor();
    await page.getByRole('button', { name: 'Thử lại', exact: true }).first().click();
    await page.getByTestId('friend-person-Alice').waitFor();
    await page.goto(origin + '/profile/view/profile-New%20person');
    await page.getByRole('button', { name: 'Kết bạn', exact: true }).waitFor(); uncertainSend = true;
    await page.getByRole('button', { name: 'Kết bạn', exact: true }).click(); await page.getByRole('button', { name: 'Hủy lời mời', exact: true }).waitFor();
    await page.reload(); await page.getByRole('button', { name: 'Hủy lời mời', exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 812 }); await page.goto(origin + '/profile/friends');
    await page.getByTestId('friend-person-Alice').waitFor(); await page.waitForLoadState('networkidle'); await page.getByTestId('friend-person-Alice').scrollIntoViewIfNeeded();
    const friendsFrame = await page.getByTestId('friends-panel').boundingBox(); assert.ok(friendsFrame.height > 400);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/friends-mobile.png', animations: 'disabled' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (let i = 0; i < 21; i++) people.push(person('Paged ' + i, 'friends'));
    await page.getByRole('textbox', { name: 'Tìm bạn theo tên hoặc nickname', exact: true }).fill('Paged');
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByTestId('friend-person-Paged 20').getByRole('button', { name: 'Tùy chọn bạn bè với Paged 20', exact: true }).click(); await page.getByRole('menuitem', { name: 'Hủy kết bạn', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận hủy kết bạn', exact: true }).click();
    await page.getByTestId('friend-person-Paged 0').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Trang sau', exact: true }).count(), 0);
    people.find(p => p.accountId === 'Friend').relationship = 'friends';
    await page.goto(origin + '/group/' + project.id); await page.getByRole('tab', { name: /Thành viên/ }).click();
    await page.getByRole('button', { name: 'Lời mời', exact: true }).click(); await page.getByRole('button', { name: 'Mời', exact: true }).click();
    await page.getByRole('radio', { name: 'Friend', exact: true }).click();
    await page.getByRole('radio', { name: 'Other friend', exact: true }).click();
    assert.equal(await page.getByRole('radio', { checked: true }).count(), 1);
    await page.getByRole('textbox', { name: 'Vị trí mời tham gia', exact: true }).fill('UX researcher');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/friends-single-invite.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
    await page.getByRole('dialog', { name: 'Lời mời', exact: true }).waitFor();
    await page.getByRole('dialog', { name: 'Lời mời', exact: true }).getByText('Other friend', { exact: true }).waitFor();
    await page.getByRole('dialog', { name: 'Lời mời', exact: true }).getByText('Đang chờ', { exact: true }).waitFor();
    assert.equal(projectInvites.length, 1); assert.equal(projectRequests[0].role, 'UX researcher'); assert.equal(project.members.length, 0);
    assert.equal(project.status, 2);
    await page.getByRole('dialog', { name: 'Lời mời', exact: true }).getByRole('button', { name: 'Đóng', exact: true }).last().click();
    project.isOwner = false; project.isMember = false;
    project.creator = { id: 'different-owner', fullName: 'Different owner', avatarUrl: null };
    projectRequests.push({ id: 'incoming-project', projectId: project.id, requestType: 1, userId: data.profile.id, role: 'QA engineer', status: 0 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Từ chối lời mời', exact: true }).click();
    await page.getByRole('button', { name: 'Từ chối lời mời', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(project.members.length, 0); assert.equal(projectRequests.at(-1).status, 2);
    projectRequests.push({ id: 'incoming-again', projectId: project.id, requestType: 1, userId: data.profile.id, role: 'QA engineer', status: 0 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Chấp nhận lời mời', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ứng tuyển tham gia', exact: true }).count(), 0);
    assert.equal(project.members.length, 0);
    await page.getByRole('button', { name: 'Chấp nhận lời mời', exact: true }).click();
    await page.getByRole('tab', { name: /Thành viên \(2\)/ }).click();
    await page.getByTestId('project-member-row').first().getByText('QA engineer', { exact: true }).waitFor();
    assert.equal(project.members.length, 1);
    assert.equal(project.status, 2);
    account.role = 6;
    await page.goto(origin + '/profile/friends'); await page.waitForURL(url => url.pathname === '/profile');
    assert.equal(await page.getByRole('tab', { name: 'Bạn bè', exact: true }).count(), 0);
    await page.goto(origin + '/profile/view/profile-Alice'); await page.waitForLoadState('networkidle');
    for (const name of ['Kết bạn', 'Hủy lời mời', 'Chấp nhận', 'Từ chối', 'Hủy kết bạn']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('Friends browser checks passed: two tabs, mutual counts, popup keyboard/dismissal, accept/reject/remove, errors/retry, pagination, responsive layouts and project/profile regressions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
