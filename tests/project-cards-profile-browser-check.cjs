const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [], summaryWrites = [], settingsWrites = [], detailWrites = [], reviewWrites = [], technologyWrites = [];
    let failSummarySave = false, failOverviewSave = false, failReviewSave = false, failTechnologySave = false;
    page.on('pageerror', error => errors.push(error.message));
    const data = structuredClone(sample);
    data.isOwner = true;
    data.profile = { ...data.profile, id: 'card-profile', isVerified: true };
    data.portfolio.projects = [{ title: 'Portfolio card fixture', description: 'Saved portfolio project', coverUrl: 'https://example.com/uninet-samples/web.svg', technologies: ['React', 'TypeScript', 'CSS', 'Figma'], featured: false, role: 'Frontend', completedAt: '2026-11-16' }];
    const account = { id: 'card-account', email: 'cards@example.test', role: 0, profileComplete: true, profile: data.profile };
    const items = [0, 1, 2].map(status => ({
      id: `card-${status}`, title: `Project card ${status}`, description: 'Project description shown on the card', logoUrl: null,
      technologies: ['React', 'TypeScript', 'CSS', 'Figma', 'Canva'], origin: 0, status, visibility: 0, mode: status === 1 ? 'community' : 'personal', isOwner: true, isMember: true,
      creator: { id: data.profile.id, fullName: data.profile.fullName, avatarUrl: null },
      members: status === 0 ? [] : [{ id: 'membership', userId: data.profile.id, fullName: data.profile.fullName, avatarUrl: null, role: 'Leader', positionId: null, status: 0, joinedAt: '2026-11-16T00:00:00Z' }],
      details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, endDate: null, completedAt: null },
      recruitment: null, myReview: null, chatRoomId: null, createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z',
    }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const ok = json => route.fulfill({ json });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/skills')) return ok(['React', 'TypeScript', 'CSS', 'Figma', 'Canva', 'C#'].map(name => ({ id: name, name, iconUrl: 'https://res.cloudinary.com/test/image/upload/' + encodeURIComponent(name) + '.png', category: 'Technology' })));
      if (path.endsWith('/profile/portfolio/me')) return ok(data);
      if (path.endsWith('/images') && route.request().method() === 'POST') {
        const document = route.request().postDataBuffer().includes(Buffer.from('notes.pdf'));
        return ok({ imageUrl: `https://res.cloudinary.com/test/${document ? 'raw' : 'image'}/upload/${document ? 'notes.pdf' : 'media.png'}`, publicId: 'resource-fixture', resourceType: document ? 'raw' : 'image', fileName: document ? 'notes.pdf' : 'media.png', format: document ? 'pdf' : 'png' });
      }
      if (path.endsWith('/project-hub/mine')) return ok({ items, total: items.length, page: 1, pageSize: 12 });
      const reviewProject = items.find(item => path.endsWith('/project-hub/' + item.id + '/review'));
      if (reviewProject) {
        assert.equal(route.request().method(), 'PUT');
        const payload = route.request().postDataJSON();
        assert.deepEqual(Object.keys(payload).sort(), ['challenges', 'lessonsLearned']);
        reviewWrites.push(payload);
        if (failReviewSave) { failReviewSave = false; return route.fulfill({ status: 500, json: { message: 'Personal review fixture failure' } }); }
        reviewProject.myReview = payload;
        return ok(reviewProject);
      }
      const project = items.find(item => path.endsWith('/project-hub/' + item.id));
      if (project) {
        if (route.request().method() === 'PATCH') {
          const payload = route.request().postDataJSON();
          if (payload.details) {
            assert.deepEqual(Object.keys(payload), ['details']); detailWrites.push(structuredClone(payload.details));
            if (failOverviewSave) { failOverviewSave = false; return route.fulfill({ status: 500, json: { message: 'Overview save fixture failure' } }); }
          }
          else if (Object.hasOwn(payload, 'technologies')) { assert.deepEqual(Object.keys(payload), ['technologies']); technologyWrites.push(payload); if (failTechnologySave) { failTechnologySave = false; return route.fulfill({ status: 500, json: { message: 'Technology fixture failure' } }); } }
          else if (Object.hasOwn(payload, 'visibility')) { assert.deepEqual(Object.keys(payload), ['visibility']); settingsWrites.push(payload); }
          else {
            assert.deepEqual(Object.keys(payload).sort(), ['description', 'title']);
            summaryWrites.push(payload);
            if (failSummarySave) { failSummarySave = false; return route.fulfill({ status: 500, json: { message: 'Summary save fixture failure' } }); }
          }
          Object.assign(project, payload);
        }
        return ok(project);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 12 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      if (path.endsWith('/student/verification/me')) return ok({ id: 'verified', status: 1, isVerified: true });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route('https://res.cloudinary.com/test/image/upload/**', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(origin + '/profile/projects', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Xem dự án Project card 0', exact: true }).waitFor();
    assert.equal(await page.getByTestId('profile-settings-column').isVisible(), true);
    const main = await page.getByTestId('profile-main-column').boundingBox();
    const settings = await page.getByTestId('profile-settings-column').boundingBox();
    assert.ok(settings.x >= main.x + main.width, 'settings must remain to the right of project management');
    const panel = page.getByTestId('profile-projects-panel');
    assert.equal(await panel.getByText(/^(Chờ duyệt|Chưa bắt đầu|Đang thực hiện|Hoàn thành|Bị từ chối)$/).count(), 0);
    assert.equal(await panel.getByText('1 thành viên', { exact: true }).count(), 3);
    assert.equal(await panel.getByRole('button', { name: /^Tùy chọn dự án/ }).count(), 0);
    await page.getByTestId('profile-add-project').click();
    await page.getByRole('heading', { name: 'Tạo dự án mới', exact: true }).waitFor();
    const types = page.getByRole('radiogroup', { name: 'Loại dự án', exact: true }).getByRole('radio');
    assert.deepEqual(await types.evaluateAll(elements => elements.map(element => element.getAttribute('aria-label'))), ['Tạo mới', 'Có sẵn']);
    assert.equal(await page.getByRole('radio', { name: 'Có sẵn', exact: true }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('radiogroup', { name: 'Tiến độ dự án', exact: true }).count(), 0);
    await page.getByRole('radio', { name: 'Tạo mới', exact: true }).click();
    assert.equal(await page.getByRole('radio', { name: 'Tạo mới', exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByRole('radio', { name: 'Có sẵn', exact: true }).click();
    assert.equal(await page.getByRole('radiogroup', { name: 'Tiến độ dự án', exact: true }).count(), 0);
    await page.getByTestId('project-create-title').fill('Popup preview fixture');
    await page.getByTestId('project-create-description').fill('Short description fixture');
    await page.getByRole('heading', { name: 'Popup preview fixture', exact: true }).waitFor();
    const submit = await page.getByTestId('project-create-submit').boundingBox();
    assert.ok(submit.height <= 44 && submit.y + submit.height <= 1000, 'compact footer button must fit the viewport');
    if (process.env.PROJECT_CREATE_SCREENSHOT) {
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-testid="project-create-submit"]');
        for (let node = button; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        return !!button;
      });
      await page.screenshot({ path: process.env.PROJECT_CREATE_SCREENSHOT, animations: 'disabled' });
    }
    await page.keyboard.press('Escape');
    await page.getByTestId('project-create-submit').waitFor({ state: 'hidden' });
    assert.equal(await panel.getByRole('button', { name: 'Tìm kiếm dự án', exact: true }).count(), 0);
    assert.equal(await panel.getByRole('button', { name: 'Lời mời & ứng tuyển', exact: true }).count(), 0);
    assert.equal(await panel.getByRole('textbox', { name: 'Tìm dự án của tôi' }).count(), 0);
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}px`);
      const card = await page.getByRole('button', { name: 'Xem dự án Project card 0', exact: true }).boundingBox();
      assert.ok(card.width >= 220 && card.x >= 0 && card.x + card.width <= width + 1, `card must fit at ${width}px`);
      if (width === 320) {
        await page.getByTestId('profile-add-project').click();
        const button = await page.getByTestId('project-create-submit').boundingBox();
        assert.ok(button.x >= 0 && button.x + button.width <= width && button.y + button.height <= 1000, 'mobile create button must remain visible');
        await page.keyboard.press('Escape');
      }
    }
    await page.goto(origin + '/group/card-1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Project card 1', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Thao tác dự án', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Chỉnh sửa dự án', exact: true }).click();
    await page.getByRole('heading', { name: 'Chỉnh sửa thông tin dự án', exact: true }).waitFor();
    assert.equal(await page.getByRole('textbox').count(), 2);
    const shortIntroduction = page.getByRole('textbox', { name: 'Giới thiệu ngắn', exact: true });
    await shortIntroduction.fill(Array.from({ length: 14 }, (_, index) => `Short introduction ${index + 1}`).join('\n'));
    const expandedSummary = await shortIntroduction.evaluate(element => ({ height: element.getBoundingClientRect().height, scroll: element.scrollHeight, client: element.clientHeight }));
    assert.ok(expandedSummary.height > 200 && expandedSummary.scroll <= expandedSummary.client + 1, `short introduction must grow with its lines: ${JSON.stringify(expandedSummary)}`);
    await shortIntroduction.fill('Short introduction');
    assert.ok(await shortIntroduction.evaluate(element => element.getBoundingClientRect().height) < expandedSummary.height, 'short introduction must shrink when lines are deleted');
    await page.getByRole('textbox', { name: 'Tên dự án', exact: true }).fill('');
    await page.getByTestId('project-summary-save').click();
    await page.getByRole('alert').filter({ hasText: 'Vui lòng nhập tên dự án và giới thiệu ngắn.' }).waitFor();
    assert.equal(summaryWrites.length, 0);
    await page.keyboard.press('Escape');
    await page.getByTestId('project-summary-save').waitFor({ state: 'hidden' });
    assert.equal(summaryWrites.length, 0);
    await page.getByRole('button', { name: 'Chỉnh sửa dự án', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Tên dự án', exact: true }).inputValue(), 'Project card 1');
    await page.getByRole('textbox', { name: 'Tên dự án', exact: true }).fill('Updated project title');
    await page.getByRole('textbox', { name: 'Giới thiệu ngắn', exact: true }).fill('Updated short introduction');
    failSummarySave = true;
    await page.getByTestId('project-summary-save').click();
    await page.getByRole('alert').last().waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="project-summary-save"]').hasAttribute('disabled'));
    assert.equal(await page.getByRole('textbox', { name: 'Giới thiệu ngắn', exact: true }).inputValue(), 'Updated short introduction');
    await page.getByTestId('project-summary-save').click();
    await page.getByTestId('project-summary-save').waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name: 'Updated project title', exact: true }).waitFor();
    assert.equal(summaryWrites.length, 2);
    await page.getByRole('link', { name: 'Dự án', exact: true }).click();
    await page.getByRole('button', { name: 'Xem dự án Updated project title', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem dự án Updated project title', exact: true }).click();
    await page.getByRole('heading', { name: 'Updated project title', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Chia sẻ', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Mời thành viên', exact: true }).count(), 0);
    const hero = await page.locator('[data-testid="project-detail-hero"]:visible').boundingBox();
    const tabs = await page.locator('[data-testid="project-detail-tabs"]:visible').boundingBox();
    assert.ok(tabs.y >= hero.y + hero.height + 16, 'tabs must have space below the introduction');
    await page.getByRole('tab', { name: /Cài đặt/ }).click();
    await page.getByRole('heading', { name: 'Quyền hiển thị', exact: true }).waitFor();
    await page.getByRole('radio', { name: 'Công khai', exact: true }).click();
    const visibilitySave = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/project-hub/card-1'));
    await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
    await visibilitySave;
    assert.deepEqual(settingsWrites, [{ visibility: 1 }]);
    const action = await page.getByRole('button', { name: 'Xóa dự án', exact: true }).boundingBox();
    assert.ok(action.height <= 40, 'project detail actions must use compact sizing');
    await page.getByRole('button', { name: 'Xóa dự án', exact: true }).click();
    await page.getByRole('heading', { name: 'Xóa dự án?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByRole('heading', { name: 'Xóa dự án?', exact: true }).waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Cài đặt/ }).click();
    assert.equal(await page.getByRole('radio', { name: 'Công khai', exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByRole('tab', { name: /Tổng quan/ }).click();
    if (process.env.PROJECT_DETAIL_SCREENSHOT) await page.screenshot({ path: process.env.PROJECT_DETAIL_SCREENSHOT, animations: 'disabled' });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `detail overflow at ${width}px`);
    }
    await page.getByRole('tab', { name: /Thành viên/ }).click();
    await page.getByRole('heading', { name: /Thành viên dự án/ }).waitFor();
    await page.getByRole('tab', { name: /Tài liệu/ }).click();
    await page.getByRole('heading', { name: 'Tài liệu dự án', exact: true }).waitFor();
    const documentPicker = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Thêm tài liệu', exact: true }).click();
    await (await documentPicker).setFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nfixture\n%%EOF') });
    await page.getByRole('link', { name: 'Mở notes.pdf', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Chỉnh sửa thông tin dự án', exact: true }).count(), 0);
    await page.getByRole('tab', { name: /Hình ảnh/ }).click();
    await page.getByRole('heading', { name: 'Hình ảnh & Video demo', exact: true }).waitFor();
    const mediaPicker = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Thêm hình ảnh / video', exact: true }).click();
    await (await mediaPicker).setFiles({ name: 'media.png', mimeType: 'image/png', buffer: fs.readFileSync('assets/images/uninet-mark.png') });
    await page.getByRole('link', { name: 'Mở media.png', exact: true }).waitFor();
    await page.getByRole('tab', { name: /Tổng quan/ }).click();
    for (const section of ['Giới thiệu dự án', 'Vấn đề & Giải pháp', 'Mục tiêu dự án', 'Chức năng chính', 'Kết quả mong đợi']) {
      await page.getByRole('button', { name: `Hướng dẫn: ${section}`, exact: true }).click();
      const help = page.getByRole('dialog', { name: `Hướng dẫn: ${section}`, exact: true });
      await help.getByRole('heading', { name: 'Ví dụ minh họa', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await help.waitFor({ state: 'hidden' });
    }
    const beforeOverview = structuredClone(items[1].details), writesBefore = detailWrites.length;
    await page.getByRole('button', { name: 'Chỉnh sửa nội dung dự án', exact: true }).click();
    const overviewEditor = page.getByRole('dialog', { name: 'Chỉnh sửa nội dung dự án', exact: true });
    assert.equal(await overviewEditor.getByRole('heading', { level: 3 }).count(), 5);
    for (const input of await overviewEditor.getByRole('textbox').all()) {
      await input.fill(Array.from({ length: 14 }, (_, index) => `Content line ${index + 1}`).join('\n'));
      const expanded = await input.evaluate(element => ({ height: element.getBoundingClientRect().height, scroll: element.scrollHeight, client: element.clientHeight }));
      assert.ok(expanded.height > 200 && expanded.scroll <= expanded.client + 1, 'each overview input must expand to fit its lines');
      await input.fill('Short content');
      assert.ok(await input.evaluate(element => element.getBoundingClientRect().height) < expanded.height, 'overview input must shrink after deleting lines');
    }
    const introductionInput = overviewEditor.getByRole('textbox', { name: 'Giới thiệu dự án', exact: true });
    await introductionInput.fill('Long wrapped overview content without explicit line breaks. '.repeat(80));
    assert.ok(await introductionInput.evaluate(element => element.getBoundingClientRect().height) > 200, 'wrapped text must also expand the input');
    await page.setViewportSize({ width: 320, height: 1000 });
    await introductionInput.evaluate(element => element.getBoundingClientRect().width);
    await page.waitForFunction(() => {
      const element = document.querySelector('textarea[aria-label="Giới thiệu dự án"]');
      return element && element.getBoundingClientRect().width < 320 && element.scrollHeight <= element.clientHeight + 1;
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (process.env.PROJECT_OVERVIEW_EDITOR_SCREENSHOT) {
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-testid="project-overview-save"]');
        for (let node = button; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        return !!button;
      });
      await page.screenshot({ path: process.env.PROJECT_OVERVIEW_EDITOR_SCREENSHOT, animations: 'disabled' });
    }
    await overviewEditor.getByRole('textbox', { name: 'Giới thiệu dự án', exact: true }).fill('Unsaved overview draft');
    await overviewEditor.getByRole('button', { name: 'Hướng dẫn: Giới thiệu dự án', exact: true }).click();
    await page.getByRole('dialog', { name: 'Hướng dẫn: Giới thiệu dự án', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await overviewEditor.waitFor();
    assert.equal(await overviewEditor.getByRole('textbox', { name: 'Giới thiệu dự án', exact: true }).inputValue(), 'Unsaved overview draft');
    await overviewEditor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await overviewEditor.waitFor({ state: 'hidden' });
    assert.equal(detailWrites.length, writesBefore);
    await page.getByRole('button', { name: 'Chỉnh sửa nội dung dự án', exact: true }).click();
    await overviewEditor.getByRole('textbox', { name: 'Giới thiệu dự án', exact: true }).fill('Overview introduction saved');
    await overviewEditor.getByRole('textbox', { name: 'Vấn đề', exact: true }).fill('Observed user problem');
    await overviewEditor.getByRole('textbox', { name: 'Giải pháp', exact: true }).fill('Proposed project solution');
    await overviewEditor.getByRole('textbox', { name: 'Mục tiêu dự án', exact: true }).fill('First goal\nSecond goal');
    await overviewEditor.getByRole('textbox', { name: 'Chức năng chính', exact: true }).fill('First feature\nSecond feature');
    await overviewEditor.getByRole('textbox', { name: 'Sản phẩm mong đợi', exact: true }).fill('Planned product');
    await overviewEditor.getByRole('textbox', { name: 'Giá trị mang lại', exact: true }).fill('Expected user value');
    await overviewEditor.getByRole('textbox', { name: 'Hướng phát triển', exact: true }).fill('Next development step');
    failOverviewSave = true;
    await page.getByTestId('project-overview-save').click();
    await overviewEditor.getByRole('alert').waitFor();
    assert.equal(await overviewEditor.getByRole('textbox', { name: 'Giải pháp', exact: true }).inputValue(), 'Proposed project solution');
    await page.getByTestId('project-overview-save').click();
    await overviewEditor.waitFor({ state: 'hidden' });
    assert.equal(items[1].details.description, 'Overview introduction saved');
    assert.deepEqual(items[1].details.documents, beforeOverview.documents);
    assert.deepEqual(items[1].details.media, beforeOverview.media);
    assert.deepEqual(items[1].details.links, beforeOverview.links);
    assert.equal(items[1].details.startDate, beforeOverview.startDate);
    assert.equal(items[1].description, 'Updated short introduction');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Overview introduction saved', { exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.getByRole('button', { name: 'Chỉnh sửa nội dung dự án', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await overviewEditor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByAltText('Icon React', { exact: true }).first().waitFor();
    const technologyEditor = page.getByRole('dialog', { name: 'Chỉnh sửa công nghệ sử dụng', exact: true });
    // Selection is shown in one searchable grid; selected chips above it are removed.
    await page.getByRole('button', { name: 'Chỉnh sửa công nghệ sử dụng', exact: true }).click();
    assert.equal(await technologyEditor.getByText(/^Đã chọn/).count(), 0);
    await technologyEditor.getByRole('checkbox', { name: 'React', exact: true }).click();
    await technologyEditor.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(technologyWrites.length, 0);
    await page.getByRole('button', { name: 'Chỉnh sửa công nghệ sử dụng', exact: true }).click();
    await technologyEditor.getByRole('checkbox', { name: 'React', exact: true }).click();
    await technologyEditor.getByRole('textbox', { name: 'Tìm hoặc nhập công nghệ' }).fill('C#');
    await technologyEditor.getByRole('checkbox', { name: 'C#', exact: true }).click();
    await technologyEditor.getByRole('textbox', { name: 'Tìm hoặc nhập công nghệ' }).fill('CustomTool');
    await technologyEditor.getByRole('button', { name: 'Thêm “CustomTool”', exact: true }).click();
    failTechnologySave = true;
    await technologyEditor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await technologyEditor.getByRole('alert').waitFor();
    assert.equal(await technologyEditor.getByRole('checkbox', { name: 'CustomTool', exact: true, checked: true }).count(), 1);
    await technologyEditor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await technologyEditor.waitFor({ state: 'hidden' });
    assert.equal(technologyWrites.length, 2);
    assert.deepEqual(items[1].technologies, ['TypeScript', 'CSS', 'Figma', 'Canva', 'C#', 'CustomTool']);
    assert.equal(items[1].details.description, 'Overview introduction saved');
    assert.equal(items[1].description, 'Updated short introduction');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByAltText('Icon C#', { exact: true }).waitFor();
    await page.getByText('CustomTool', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Viết tổng kết cá nhân', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Chỉnh sửa tổng kết cá nhân', exact: true }).click();
    const reviewEditor = page.getByRole('dialog', { name: 'Tổng kết cá nhân', exact: true });
    await reviewEditor.waitFor();
    assert.equal(await reviewEditor.getByRole('textbox').count(), 2);
    if (process.env.PROJECT_REVIEW_MODAL_SCREENSHOT) {
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-testid="project-review-save"]');
        for (let node = button; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        return !!button;
      });
      await page.screenshot({ path: process.env.PROJECT_REVIEW_MODAL_SCREENSHOT, animations: 'disabled' });
    }
    for (const input of await reviewEditor.getByRole('textbox').all()) {
      await input.fill(Array.from({ length: 14 }, (_, index) => `Personal review line ${index + 1}`).join('\n'));
      const expanded = await input.evaluate(element => ({ height: element.getBoundingClientRect().height, scroll: element.scrollHeight, client: element.clientHeight }));
      assert.ok(expanded.height > 200 && expanded.scroll <= expanded.client + 1);
      await input.fill('Short personal note');
      assert.ok(await input.evaluate(element => element.getBoundingClientRect().height) < expanded.height);
    }
    await reviewEditor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await reviewEditor.waitFor({ state: 'hidden' });
    assert.equal(reviewWrites.length, 0);
    await page.getByRole('button', { name: 'Chỉnh sửa tổng kết cá nhân', exact: true }).click();
    await reviewEditor.getByRole('textbox', { name: 'Khó khăn đã gặp', exact: true }).fill('Personal challenge saved');
    await reviewEditor.getByRole('textbox', { name: 'Bài học kinh nghiệm', exact: true }).fill('Personal lesson saved');
    failReviewSave = true;
    await page.getByTestId('project-review-save').click();
    await reviewEditor.getByRole('alert').waitFor();
    assert.equal(await reviewEditor.getByRole('textbox', { name: 'Khó khăn đã gặp', exact: true }).inputValue(), 'Personal challenge saved');
    await page.getByTestId('project-review-save').click();
    await reviewEditor.waitFor({ state: 'hidden' });
    await page.getByText('Personal challenge saved', { exact: true }).waitFor();
    await page.getByText('Personal lesson saved', { exact: true }).waitFor();
    assert.equal(reviewWrites.length, 2);
    assert.equal(items[1].details.description, 'Overview introduction saved');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Personal lesson saved', { exact: true }).waitFor();
    if (process.env.PROJECT_REVIEW_CARD_SCREENSHOT) await page.getByRole('heading', { name: 'Tổng kết cá nhân', exact: true }).locator('..').locator('..').screenshot({ path: process.env.PROJECT_REVIEW_CARD_SCREENSHOT, animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.getByRole('button', { name: 'Chỉnh sửa tổng kết cá nhân', exact: true }).click();
    const reviewSave = await page.getByTestId('project-review-save').boundingBox();
    assert.ok(reviewSave.x >= 0 && reviewSave.x + reviewSave.width <= 320 && reviewSave.y + reviewSave.height <= 1000);
    await reviewEditor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) {
      data.portfolio.appearance.profile.template = template;
      await page.goto(origin + '/(tabs)/profile', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Portfolio card fixture', exact: true }).waitFor();
      assert.equal(await page.getByTestId('profile-settings-column').isVisible(), true);
      assert.equal(await page.getByRole('heading', { name: 'Portfolio card fixture', exact: true }).locator('..').getByText('Frontend', { exact: true }).count(), 1);
    }
    assert.deepEqual(errors, []);
    console.log('Project cards/profile browser checks passed: statuses hidden, settings/sidebar, no overflow/search/inbox actions, four widths, three templates.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
