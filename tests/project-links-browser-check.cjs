const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_LINKS_TEST_ORIGIN || 'http://localhost:8084';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(20000);
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = true;
    data.profile = { ...data.profile, id: 'links-profile', isVerified: true };
    const account = { id: 'links-account', email: 'links@example.test', role: 0, profileComplete: true, profile: data.profile };
    const project = { id: 'links-fixture', title: 'Links fixture', description: 'Project links editor', logoUrl: null,
      technologies: [], status: 1, visibility: 0, isOwner: true, isMember: false,
      creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null }, members: [],
      details: { description: 'Preserve overview', features: ['Feature'], results: { problem: 'Problem' }, documents: [], media: [], links: [], startDate: null, actualEndDate: null, startDateIsCreationDate: false, completedAt: null },
      recruitment: null, myReview: null, chatRoomId: null, createdAt: '2026-11-17T00:00:00Z', updatedAt: '2026-11-17T00:00:00Z' };
    const original = structuredClone(project.details);
    let failSave = false;
    const requests = [
      { id: 'app-a', requestType: 0, fullName: 'Applicant A', userId: 'applicant-a', role: 'Frontend', status: 0, avatarUrl: null },
      { id: 'app-b', requestType: 0, fullName: 'Applicant B', userId: 'applicant-b', role: 'Backend', status: 0, avatarUrl: null },
      { id: 'inv-a', requestType: 1, fullName: 'Invited person', userId: 'invited-a', role: 'Tester', status: 0, avatarUrl: null },
    ];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = json => route.fulfill({ json });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/project-hub/requests/mine')) return ok({ items: [] });
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/friendships') || path.endsWith('/friendships/people')) return ok({ items: [{ accountId: 'new-account', profileId: 'new-invitee', fullName: 'New invited person', nickname: 'new', avatarUrl: null, role: 0, relationship: 'friends', friendshipId: 'friend-fixture', friendshipVersion: 1 }], page: 1, pageSize: 20, total: 1 });
      if (path.endsWith('/project-hub/people')) return ok({ items: [{ id: 'new-invitee', fullName: 'New invited person', avatarUrl: null }] });
      if (path.endsWith('/project-hub/' + project.id + '/requests')) {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          assert.equal(body.requestType, 1);
          assert.equal(body.invitedUserId, 'new-invitee');
          const added = { ...body, id: 'inv-new', userId: body.invitedUserId, fullName: 'New invited person', status: 0, avatarUrl: null };
          requests.push(added);
          return ok(added);
        }
        return ok({ items: requests });
      }
      const decision = requests.find(item => path.endsWith('/project-hub/requests/' + item.id + '/decision'));
      if (decision) {
        const action = route.request().postDataJSON().decision;
        decision.status = action === 'accept' ? 1 : action === 'reject' ? 2 : 3;
        return ok(decision);
      }
      if (path.endsWith('/projects/' + project.id)) return ok({ ...project, isCreator: project.isOwner, roleRequirements: [], skills: [] });
      if (path.endsWith('/projects/' + project.id + '/verifications')) {
        assert.equal(route.request().method(), 'GET');
        return ok({ verifications: [], page: 1, pageSize: 1, totalPages: 0, totalItems: 0 });
      }
      if (path.endsWith('/packages')) return ok({ packages: [], totalPages: 1 });
      if (path.endsWith('/project-hub/' + project.id)) {
        if (route.request().method() === 'PATCH') {
          const payload = route.request().postDataJSON();
          if (payload.timeline) {
            const timeline = payload.timeline;
            assert.deepEqual(Object.keys(payload), ['timeline']);
            project.details = { ...project.details, startDate: timeline.startDate, actualEndDate: timeline.actualEndDate };
            return ok(project);
          }
          writes.push(payload);
          assert.deepEqual(Object.keys(payload), ['details']);
          assert.deepEqual({ ...payload.details, links: [] }, original);
          if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { message: 'Links save fixture failure' } }); }
          project.details = payload.details;
          project.updatedAt = '2026-11-17T10:30:00Z';
        }
        return ok(project);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    if (process.env.PROJECT_LINKS_CLIENT_RENDER === '1') await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('input').length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const detailUrl = origin + '/group/' + project.id;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('project-last-updated').getByText('07:00 17/11/2026', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Thẩm định dự án', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Thẩm định dự án', exact: true }).count(), 0);
    if (process.env.PROJECT_VERIFICATION_CARD_SMOKE === '1') {
      const card = page.getByRole('heading', { name: 'Thẩm định dự án', exact: true });
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await card.scrollIntoViewIfNeeded();
        await card.locator('..').locator('..').screenshot({ path: `C:/Users/minec/UniNet/project-verification-active-${width}.png`, animations: 'disabled' });
      }
      for (const status of [0, 3, 2]) {
        project.status = status;
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: project.title, exact: true }).waitFor();
        if (status === 3) assert.equal(await card.count(), 0);
        else await card.waitFor();
        assert.equal(await page.getByRole('button', { name: 'Thẩm định dự án', exact: true }).count(), status === 2 ? 1 : 0);
      }
      await page.getByRole('button', { name: 'Thẩm định dự án', exact: true }).click();
      await page.waitForURL('**/group/verification/' + project.id);
      project.isOwner = false;
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: project.title, exact: true }).waitFor();
      assert.equal(await card.count(), 0);
      assert.deepEqual(errors, []);
      console.log('Verification card checks passed: active/pending owners, rejected/visitor gating, completed booking and desktop/mobile layout.');
      return;
    }
    assert.equal(await page.getByRole('button', { name: 'Tuyển', exact: true }).count(), 0);
    await page.getByRole('tab', { name: /Tài liệu/ }).click();
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      const heading = page.getByRole('heading', { name: 'Tài liệu dự án', exact: true });
      const upload = page.getByRole('button', { name: 'Tải lên tài liệu', exact: true });
      await upload.waitFor();
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      const titleBox = await heading.boundingBox(), uploadBox = await upload.boundingBox();
      if (width >= 600) {
        assert.ok(uploadBox.x > titleBox.x);
        const headerBox = await heading.locator('..').boundingBox();
        assert.ok(Math.abs(headerBox.y + headerBox.height / 2 - uploadBox.y - uploadBox.height / 2) < 2);
      } else assert.ok(uploadBox.y > titleBox.y);
      assert.equal(await page.getByRole('button', { name: 'Thêm tài liệu', exact: true }).count(), 0);
      await page.screenshot({ path: `C:/Users/minec/UniNet/project-documents-${width}.png`, animations: 'disabled' });
    }
    for (const width of [320, 375, 768, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [tab, title] of [[/Tài liệu/, 'Tài liệu dự án'], [/Hình ảnh & Video demo/, 'Hình ảnh & Video demo'], [/Thành viên/, /^Thành viên/], [/Cài đặt/, 'Quản lý dự án']]) {
        await page.getByRole('tab', { name: tab }).click();
        const heading = page.getByRole('heading', { name: title, exact: typeof title === 'string' });
        await heading.waitFor();
        assert.equal(await page.getByRole('button', { name: 'Tuyển', exact: true }).count(), 0);
        const panel = await heading.evaluate(node => { const box = (node.closest('[role="region"]') ?? node.parentElement.parentElement).getBoundingClientRect(); return { x: box.x, width: box.width }; });
        const reference = await page.getByRole('heading', { name: 'Thông tin dự án', exact: true }).evaluate(node => { const box = node.parentElement.parentElement.getBoundingClientRect(); return { x: box.x, width: box.width }; });
        assert.ok(Math.abs(panel.width - reference.width) < 2, `${width}px ${String(title)}: ${panel.width} vs ${reference.width}`);
        assert.ok(Math.abs(panel.x - reference.x) < 2);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('tab', { name: /Cài đặt/ }).click();
    const dateLabels = ['Cập nhật ngày bắt đầu', 'Cập nhật ngày kết thúc'];
    const chosenDate = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7) + '-01';
    const shownDate = chosenDate.split('-').reverse().join('/');
    async function editDate(label, clear = false) {
      await page.getByRole('button', { name: label, exact: true }).click();
      const modal = page.getByRole('dialog', { name: label, exact: true });
      await modal.getByRole('button', { name: clear ? 'Xóa ngày' : `Chọn ngày ${shownDate}`, exact: true }).click();
      await modal.getByRole('button', { name: 'Xác nhận', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
    }
    for (const key of ['startDate', 'actualEndDate']) assert.equal(project.details[key], null);
    for (const label of dateLabels) await editDate(label);
    await page.getByText('Đã lưu thời gian dự án.', { exact: true }).waitFor();
    assert.equal(project.status, 1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Cài đặt/ }).click();
    for (const label of dateLabels) await page.getByRole('button', { name: label, exact: true }).getByText(shownDate, { exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-timeline-settings-mobile.png', animations: 'disabled' });
    for (const label of dateLabels) await editDate(label, true);
    await page.getByText('Đã lưu thời gian dự án.', { exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('tab', { name: /Tổng quan/ }).click();
    for (const label of ['Loại dự án', 'Nguồn dự án', 'Dự án cá nhân', 'Dự án cộng đồng']) assert.equal(await page.getByText(label, { exact: true }).count(), 0);
    const edit = page.getByRole('button', { name: 'Chỉnh sửa liên kết dự án', exact: true });
    await edit.click();
    const save = page.getByRole('button', { name: 'Lưu thay đổi', exact: true });
    await save.click();
    await page.getByRole('alert').last().waitFor();
    assert.equal(writes.length, 0);
    await page.getByRole('button', { name: 'Loại liên kết 1', exact: true }).click();
    const types = ['GitHub', 'Website / Demo', 'Figma', 'Google Play', 'App Store', 'API (Swagger)', 'Khác'];
    assert.deepEqual(await page.getByRole('radio').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), types);
    for (const name of types) assert.equal(await page.getByRole('radio', { name, exact: true }).getByRole('img', { name: `Icon ${name}`, exact: true }).count(), 1);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-links-type-menu.png', animations: 'disabled' });
    await page.getByRole('radio', { name: 'GitHub', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('radiogroup').waitFor({ state: 'hidden' });
    await page.getByRole('textbox', { name: 'Địa chỉ URL 1', exact: true }).fill('https://github.com/example/project');
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes.length, 0);
    await edit.click();
    assert.equal(await page.getByRole('button', { name: 'Loại liên kết 1', exact: true }).innerText().then(text => text.includes('Chọn loại liên kết')), true);
    await page.getByRole('button', { name: 'Loại liên kết 1', exact: true }).click();
    await page.getByRole('radio', { name: 'GitHub', exact: true }).click();
    await page.getByRole('textbox', { name: 'Địa chỉ URL 1', exact: true }).fill('https://github.com/example/project');
    await page.getByRole('button', { name: 'Thêm liên kết', exact: true }).click();
    await page.getByRole('button', { name: 'Loại liên kết 2', exact: true }).click();
    for (const name of types) {
      await page.getByRole('radio', { name, exact: true }).click();
      await page.getByRole('button', { name: 'Loại liên kết 2', exact: true }).click();
      assert.equal(await page.getByRole('radio', { name, exact: true }).getAttribute('aria-checked'), 'true');
    }
    await page.getByRole('radio', { name: 'Website / Demo', exact: true }).click();
    await page.getByRole('textbox', { name: 'Địa chỉ URL 2', exact: true }).fill('https://example.com/demo');
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-links-desktop.png', animations: 'disabled' });
    failSave = true;
    await save.click();
    await page.getByRole('alert').last().waitFor();
    await save.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Loại liên kết 2', exact: true }).getByText('Website / Demo', { exact: true }).count(), 1);
    await save.click();
    await save.waitFor({ state: 'hidden' });
    assert.equal(writes.length, 2);
    await page.getByTestId('project-last-updated').getByText('17:30 17/11/2026', { exact: true }).waitFor();
    assert.deepEqual(project.details.links.map(link => link.label), ['GitHub', 'Website / Demo']);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await edit.waitFor();
    await page.getByRole('link').filter({ hasText: 'GitHub' }).waitFor();
    for (const name of ['GitHub', 'Website / Demo']) assert.equal(await page.getByRole('link').filter({ hasText: name }).getByRole('img', { name: `Icon ${name}`, exact: true }).count(), 1);
    for (const [label, file] of [
      ['Chỉnh sửa dự án', 'summary'],
      ['Chỉnh sửa nội dung dự án', 'overview'],
      ['Chỉnh sửa công nghệ sử dụng', 'technologies'],
      ['Chỉnh sửa tổng kết cá nhân', 'review'],
    ]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.screenshot({ path: `C:/Users/minec/UniNet/project-modal-${file}.png`, animations: 'disabled' });
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    for (const width of [1440, 1024, 768, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await edit.click();
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement)), true);
      const bounds = await page.getByRole('dialog').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 900);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await edit.click();
    await page.getByRole('button', { name: 'Xóa liên kết 1', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Loại liên kết 1', exact: true }).getByText('Website / Demo', { exact: true }).count(), 1);
    const box = await save.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 812);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-links-mobile.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Xóa liên kết 1', exact: true }).click();
    await save.click();
    await save.waitFor({ state: 'hidden' });
    assert.deepEqual(project.details.links, []);
    const verification = page.getByRole('button', { name: 'Thẩm định dự án', exact: true });
    await page.getByRole('heading', { name: 'Thẩm định dự án', exact: true }).waitFor();
    await page.getByText('Bạn có thể đăng ký thẩm định sau khi dự án hoàn thành.', { exact: true }).waitFor();
    assert.equal(await verification.count(), 0);
    project.mode = 'community';
    project.recruitment = { status: 2, positions: [], description: 'Old recruitment', deadline: null };
    for (const status of [0, 1, 3]) {
      project.status = status;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: project.title, exact: true }).waitFor();
      if (status === 3) assert.equal(await page.getByRole('heading', { name: 'Thẩm định dự án', exact: true }).count(), 0);
      else await page.getByRole('heading', { name: 'Thẩm định dự án', exact: true }).waitFor();
      assert.equal(await verification.count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'Tuyển thành viên', exact: true }).count(), 0);
    }
    const verificationCard = page.getByRole('heading', { name: 'Thẩm định dự án', exact: true }).locator('..').locator('..');
    project.status = 2;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await verification.waitFor();
    await verificationCard.scrollIntoViewIfNeeded();
    await verificationCard.screenshot({ path: 'C:/Users/minec/UniNet/project-verification-card-mobile.png', animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await verification.waitFor();
    await verificationCard.screenshot({ path: 'C:/Users/minec/UniNet/project-verification-card-completed.png', animations: 'disabled' });
    const writeCount = writes.length;
    await verification.click();
    await page.waitForURL('**/group/verification/' + project.id);
    await page.getByText('Điều kiện đăng ký', { exact: true }).waitFor();
    assert.equal(writes.length, writeCount);
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    await verification.waitFor();
    await page.getByRole('tab', { name: /Thành viên \(1\)/ }).click();
    await page.getByRole('heading', { name: 'Thành viên (1)', exact: true }).waitFor();
    const rows = page.getByTestId('project-member-row');
    assert.equal(await rows.count(), 1);
    await rows.first().getByText(data.profile.fullName + ' (Bạn)', { exact: true }).waitFor();
    assert.equal(await rows.first().getByRole('button', { name: 'Quản lý', exact: true }).count(), 0);
    assert.equal(await page.getByText('Dự án chưa có thành viên khác.', { exact: true }).count(), 0);
    await page.getByText('1 thành viên', { exact: true }).waitFor();
    const invitations = page.getByRole('button', { name: 'Lời mời', exact: true });
    await invitations.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Mời', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Đơn ứng tuyển & lời mời', exact: true }).count(), 0);
    const headingBox = await page.getByRole('heading', { name: 'Thành viên (1)', exact: true }).boundingBox();
    const invitationsBox = await invitations.boundingBox();
    assert.ok(invitationsBox.x > headingBox.x + headingBox.width && Math.abs(invitationsBox.y + invitationsBox.height / 2 - headingBox.y - headingBox.height / 2) < 2);
    await invitations.click();
    const invitationsModal = page.getByRole('dialog', { name: 'Lời mời', exact: true });
    await invitationsModal.getByText('Applicant A', { exact: true }).waitFor();
    await invitationsModal.getByText('Invited person', { exact: true }).waitFor();
    assert.equal(await invitationsModal.getByRole('tab').count(), 0);
    assert.equal(await invitationsModal.getByText('Xin tham gia', { exact: true }).count(), 2);
    assert.equal(await invitationsModal.getByText('Được mời', { exact: true }).count(), 1);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-invitations-unified.png', animations: 'disabled' });
    await invitationsModal.getByTestId('project-request-app-a').getByRole('button', { name: 'Chấp nhận', exact: true }).click();
    await invitationsModal.getByTestId('project-request-app-a').getByText('Đã chấp nhận', { exact: true }).waitFor();
    await invitationsModal.getByTestId('project-request-app-b').getByRole('button', { name: 'Từ chối', exact: true }).click();
    await invitationsModal.getByTestId('project-request-app-b').getByText('Đã từ chối', { exact: true }).waitFor();
    await invitationsModal.getByTestId('project-request-inv-a').getByRole('button', { name: 'Hủy lời mời', exact: true }).click();
    await invitationsModal.getByTestId('project-request-inv-a').getByText('Đã hủy', { exact: true }).waitFor();
    await invitationsModal.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    const memberFixture = (userId, fullName, role = 'Developer') => ({ id: `membership-${userId}`, userId, fullName, avatarUrl: null, role, positionId: null, status: 0, joinedAt: project.createdAt });
    project.members = [memberFixture('colleague', 'Other member'), memberFixture(project.creator.id, data.profile.fullName, 'Team leader')];
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Thành viên \(2\)/ }).click();
    assert.equal(await rows.count(), 2);
    await rows.first().getByText(data.profile.fullName + ' (Bạn)', { exact: true }).waitFor();
    await rows.first().getByText('Team leader', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Thành viên (2)', exact: true }).locator('..').locator('..').screenshot({ path: 'C:/Users/minec/UniNet/project-members-self-first.png', animations: 'disabled' });
    project.status = 1;
    project.recruitment = { ...project.recruitment, status: 1, positions: [{ id: 'designer', name: 'Designer', quantity: 2, technologies: [], skills: [], requirements: [], benefits: [], jobDescription: '' }], deadline: null };
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Thành viên \(2\)/ }).click();
    const mobileAction = await invitations.boundingBox();
    const mobileHeading = await page.getByRole('heading', { name: 'Thành viên (2)', exact: true }).boundingBox();
    assert.ok(mobileAction.y >= mobileHeading.y + mobileHeading.height);
    assert.equal(await page.getByRole('button', { name: 'Tuyển', exact: true }).count(), 0);
    assert.ok(mobileAction.height <= 32);
    await page.getByRole('heading', { name: 'Thành viên (2)', exact: true }).locator('..').locator('..').screenshot({ path: 'C:/Users/minec/UniNet/project-member-invitations-mobile.png', animations: 'disabled' });
    await invitations.click();
    const mobileInviteButton = await invitationsModal.getByRole('button', { name: 'Mời', exact: true }).boundingBox();
    const mobileRecruitButton = await invitationsModal.getByRole('button', { name: 'Tuyển', exact: true }).boundingBox();
    assert.ok(mobileRecruitButton.x >= mobileInviteButton.x + mobileInviteButton.width && Math.abs(mobileRecruitButton.y - mobileInviteButton.y) < 2);
    assert.ok(mobileRecruitButton.height <= 30 && mobileInviteButton.height <= 30);
    await invitationsModal.getByRole('button', { name: 'Tuyển', exact: true }).click();
    await page.getByRole('dialog', { name: 'Quản lý tuyển thành viên', exact: true }).getByRole('button', { name: 'Hủy', exact: true }).click();
    await invitationsModal.waitFor();
    await invitationsModal.getByRole('button', { name: 'Mời', exact: true }).click();
    await page.getByRole('dialog', { name: 'Mời thành viên', exact: true }).getByRole('button', { name: 'Hủy', exact: true }).click();
    await invitationsModal.getByText('Invited person', { exact: true }).waitFor();
    await invitationsModal.getByRole('button', { name: 'Mời', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tìm kiếm bạn bè', exact: true }).fill('New');
    await page.getByRole('radio', { name: 'New invited person', exact: true }).click();
    await page.getByRole('textbox', { name: 'Vị trí mời tham gia', exact: true }).fill('Designer');
    await page.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
    await invitationsModal.getByText('New invited person', { exact: true }).waitFor();
    await invitationsModal.getByText('4 yêu cầu & lời mời', { exact: true }).waitFor();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-invitations-unified-mobile.png', animations: 'disabled' });
    await invitationsModal.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    requests.splice(0);
    await invitations.click();
    await invitationsModal.getByText('Chưa có yêu cầu tham gia hoặc lời mời.', { exact: true }).waitFor();
    await invitationsModal.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    project.creator = { id: 'another-owner', fullName: 'Project owner', avatarUrl: null };
    project.isOwner = false;
    project.isMember = true;
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Thành viên \(3\)/ }).click();
    await rows.first().getByText(data.profile.fullName + ' (Bạn)', { exact: true }).waitFor();
    assert.equal(await rows.count(), 3);
    assert.equal(await rows.getByRole('button', { name: 'Quản lý', exact: true }).count(), 0);
    assert.equal(await invitations.count(), 0);
    project.isMember = false;
    project.members = [memberFixture('colleague', 'Other member')];
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Chưa có liên kết dự án.', { exact: true }).waitFor();
    assert.equal(await edit.count(), 0);
    assert.equal(await verification.count(), 0);
    await page.getByRole('tab', { name: /Thành viên \(2\)/ }).click();
    assert.equal(await rows.count(), 2);
    assert.equal(await rows.getByText(/\(Bạn\)/).count(), 0);
    assert.deepEqual(errors, []);
    console.log('Links browser checks passed: validation, cancel, retry, save/reload, remove, mobile and owner gating.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
