const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROJECT_DOCUMENTS_TEST_ORIGIN || 'http://localhost:8086';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [], writes = [];
    let failNext = false;
    let mediaDetails = null;
    page.on('pageerror', error => errors.push(error.message));
    const account = { id: 'document-owner', email: 'documents@example.test', role: 0, profileComplete: true, profile: sample.profile };
    const names = ['Quy_trinh_du_an.docx', 'Tai_lieu.pdf', 'Danh_sach.xlsx', 'Bao_cao.pptx'];
    const project = { id: 'documents-fixture', title: 'Project documents', description: 'Documents table fixture', logoUrl: null, technologies: [], status: 1, visibility: 1, isOwner: true, isMember: true,
      creator: { id: sample.profile.id, fullName: sample.profile.fullName, avatarUrl: null }, members: [],
      details: { description: 'Preserve content', features: ['Feature'], results: { problem: 'Problem' }, documents: Array.from({ length: 12 }, (_, i) => ({ name: i < 4 ? names[i] : `Document_${i + 1}.pdf`, url: `https://files.example.test/doc-${i + 1}.pdf`, type: 'document' })), media: [], links: [], startDate: null, endDate: null, completedAt: null },
      recruitment: null, myReview: null, createdAt: '2026-11-17T00:00:00Z', updatedAt: '2026-11-17T00:00:00Z' };
    const preserved = structuredClone(project.details);
    const uploadMetadata = { sizeBytes: 2516582, uploadedAt: '2026-11-17T09:04:00Z', uploadedBy: { id: sample.profile.id, fullName: sample.profile.fullName, avatarUrl: null } };
    project.details.documents[0] = { ...project.details.documents[0], ...uploadMetadata };
    await page.context().route('https://files.example.test/**', route => route.fulfill({ contentType: 'application/pdf', headers: { 'Access-Control-Allow-Origin': '*' }, body: '%PDF-1.4 fixture' }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method();
      const ok = json => route.fulfill({ json });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
      if (path.endsWith('/auth/me')) return ok(account);
      if (path.endsWith('/profile/portfolio/me')) return ok({ ...sample, isOwner: true });
      if (path.endsWith('/images')) return ok(mediaDetails ? { imageUrl: 'https://files.example.test/upload.png', publicId: 'upload.png', resourceType: 'image', fileName: 'Upload.png', format: 'png' } : { imageUrl: 'https://files.example.test/upload.xlsx', publicId: 'upload.xlsx', resourceType: 'raw', fileName: 'Bo_sung.xlsx', format: 'xlsx' });
      if (path.endsWith('/project-hub/' + project.id + '/resources/documents') && method === 'POST') {
        project.details.documents.push({ ...route.request().postDataJSON(), ...uploadMetadata, sizeBytes: 1024 });
        return ok(project);
      }
      if (path.endsWith('/project-hub/' + project.id + '/resources/media') && method === 'POST') {
        project.details.media.push({ ...route.request().postDataJSON(), ...uploadMetadata });
        return ok(project);
      }
      if (path.endsWith('/project-hub/' + project.id + '/requests')) return ok({ items: [] });
      if (path.endsWith('/project-hub/' + project.id)) {
        if (method === 'PATCH') {
          const body = route.request().postDataJSON(); writes.push(body);
          assert.deepEqual(Object.keys(body), ['details']);
          if (mediaDetails) assert.deepEqual({ ...body.details, media: mediaDetails.media }, mediaDetails);
          else assert.deepEqual({ ...body.details, documents: preserved.documents }, preserved);
          if (failNext) { failNext = false; return route.fulfill({ status: 400, json: { message: 'Không thể lưu tài liệu.' } }); }
          project.details = { ...body.details, documents: body.details.documents.map(file => file.url.endsWith('/upload.xlsx') ? { ...file, ...uploadMetadata, sizeBytes: 1024 } : file) };
        }
        return ok(project);
      }
      if (path.endsWith('/notifications')) return ok({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 });
      if (path.endsWith('/notifications/unread-count')) return ok({ count: 0 });
      return ok([]);
    });
    await page.route('**/hubs/**', route => route.abort());
    await page.route(origin + '/**', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{overflow:hidden;display:flex}#root{display:flex;flex:1}</style></head><body><div id="root"></div><script src="/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&transform.routerRoot=src%2Fapp"></script></body></html>' }) : route.fallback());
    await page.goto(origin + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const load = async () => {
      await page.goto(origin + '/group/' + project.id, { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: /Tài liệu/ }).click();
    };
    await load();
    const table = page.getByRole('table', { name: 'Tài liệu dự án', exact: true });
    await table.waitFor();
    const region = page.getByRole('region', { name: 'Tài liệu dự án', exact: true });
    const panelBox = await region.boundingBox(), tableBox = await table.boundingBox();
    assert.ok(Math.abs((tableBox.x - panelBox.x) - (panelBox.x + panelBox.width - tableBox.x - tableBox.width)) < 2, 'Table must have equal card insets');
    for (const name of ['Tên tài liệu', 'Loại', 'Kích thước', 'Người tải lên', 'Ngày tải lên', 'Thao tác']) await table.getByRole('columnheader', { name, exact: true }).waitFor();
    assert.equal(await table.getByRole('row').count(), 11);
    const metadataRow = table.getByRole('row').filter({ hasText: 'Quy_trinh_du_an.docx' });
    await metadataRow.getByText('2.4 MB', { exact: true }).waitFor();
    await metadataRow.getByText(sample.profile.fullName, { exact: true }).waitFor();
    await metadataRow.getByText('17/11/2026, 16:04', { exact: true }).waitFor();
    for (const label of ['Word', 'PDF', 'Excel', 'PowerPoint']) assert.ok(await table.getByText(label, { exact: true }).count() > 0);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-documents-table-types.png', animations: 'disabled' });
    assert.equal(await page.getByRole('textbox').count(), 0);
    await page.getByRole('button', { name: 'Trang tài liệu sau', exact: true }).click();
    assert.equal(await table.getByRole('row').count(), 3);
    await page.getByRole('button', { name: 'Trang tài liệu trước', exact: true }).click();
    const menu = () => page.getByRole('button', { name: 'Thao tác với Quy_trinh_du_an.docx', exact: true }).click();
    await menu(); await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).click();
    const rename = page.getByRole('dialog', { name: 'Đổi tên tài liệu', exact: true });
    await rename.getByRole('textbox', { name: 'Tên tài liệu', exact: true }).fill('');
    await rename.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await rename.getByRole('alert').waitFor(); assert.equal(writes.length, 0);
    await rename.getByRole('textbox', { name: 'Tên tài liệu', exact: true }).fill('Quy trình mới');
    await rename.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await rename.waitFor({ state: 'hidden' });
    assert.equal(project.details.documents[0].name, 'Quy trình mới.docx');
    assert.equal(project.details.documents[0].url, preserved.documents[0].url);
    await load();
    await table.getByRole('link', { name: 'Mở Quy trình mới.docx', exact: true }).waitFor();
    await table.getByRole('row').filter({ hasText: 'Quy trình mới.docx' }).getByText('2.4 MB', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Thao tác với Quy trình mới.docx', exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).click();
    assert.equal((await downloadEvent).suggestedFilename(), 'Quy trình mới.docx');
    await page.getByRole('checkbox', { name: 'Chọn tất cả tài liệu trang này', exact: true }).click();
    await page.getByRole('button', { name: 'Xóa đã chọn', exact: true }).click();
    const deletion = page.getByRole('dialog', { name: 'Xóa tài liệu?', exact: true });
    await deletion.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes.length, 1);
    await page.getByRole('button', { name: 'Xóa đã chọn', exact: true }).click();
    failNext = true;
    await deletion.getByRole('button', { name: 'Xóa tài liệu', exact: true }).click();
    await deletion.getByRole('alert').waitFor(); assert.equal(project.details.documents.length, 12);
    await deletion.getByRole('button', { name: 'Xóa tài liệu', exact: true }).click();
    await deletion.waitFor({ state: 'hidden' }); assert.equal(project.details.documents.length, 2);
    const chooserEvent = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Tải lên tài liệu', exact: true }).click();
    const chooser = await chooserEvent;
    assert.ok((await chooser.element().getAttribute('accept')).includes('spreadsheetml'));
    await chooser.setFiles({ name: 'Bo_sung.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('fixture spreadsheet') });
    await table.getByRole('link', { name: 'Mở Bo_sung.xlsx', exact: true }).waitFor();
    await table.getByRole('row').filter({ hasText: 'Bo_sung.xlsx' }).getByText('1.0 KB', { exact: true }).waitFor();
    assert.equal(project.details.documents.length, 3);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-documents-table-desktop.png', animations: 'disabled' });
    const longName = 'Tai_lieu_quan_ly_du_an_'.repeat(6) + '.pdf';
    project.details.documents[0] = { ...project.details.documents[0], name: longName, ...uploadMetadata };
    await load();
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const compactList = page.getByRole('list', { name: 'Tài liệu dự án', exact: true });
      const presentation = width < 1024 ? compactList : table;
      await presentation.waitFor();
      const upload = page.getByRole('button', { name: 'Tải lên tài liệu', exact: true });
      const uploadBox = await upload.boundingBox();
      const titleBox = await region.getByRole('heading', { name: 'Tài liệu dự án', exact: true }).boundingBox();
      assert.ok(Math.abs(uploadBox.y + uploadBox.height / 2 - titleBox.y - titleBox.height / 2) < 2, `Upload aligned with title at ${width}px`);
      assert.equal(await upload.getByText('Tải lên tài liệu', { exact: true }).count(), 0, 'Upload is icon only');
      assert.equal(await upload.evaluate(el => getComputedStyle(el).borderTopWidth), '0px', 'Upload has no border');
      const bounds = await region.boundingBox(), content = await presentation.boundingBox();
      assert.ok(content.x >= bounds.x && content.x + content.width <= bounds.x + bounds.width, `Content inside card at ${width}px`);
      assert.ok(Math.abs((content.x - bounds.x) - (bounds.x + bounds.width - content.x - content.width)) < 2, `Equal insets at ${width}px`);
      assert.equal(await region.evaluate(el => el.scrollWidth > el.clientWidth), false, `No panel overflow at ${width}px`);
      if (width < 1024) {
        const borders = await compactList.getByRole('listitem').first().evaluate(el => {
          const style = getComputedStyle(el);
          return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth];
        });
        assert.deepEqual(borders, ['0px', '0px', '1px', '0px'], 'Files separated by bottom rules');
        const link = compactList.getByRole('link', { name: 'Mở ' + longName, exact: true });
        assert.equal(await link.evaluate(el => el.scrollWidth > el.clientWidth), false, 'Long filename wraps');
        assert.equal(await compactList.getByText(sample.profile.fullName, { exact: false }).count(), 0);
        assert.equal(await compactList.getByText('2.4 MB', { exact: true }).count(), 0);
        assert.equal(await compactList.getByRole('checkbox').count(), 0);
        const action = await compactList.getByRole('button', { name: 'Thao tác với ' + longName, exact: true }).boundingBox();
        assert.ok(action.width >= 44 && action.height >= 44, 'Touch-friendly file action');
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    const list = page.getByRole('list', { name: 'Tài liệu dự án', exact: true });
    await list.waitFor();
    await list.getByRole('button', { name: 'Thao tác với ' + longName, exact: true }).click();
    const dropdown = page.getByRole('menu'); const box = await dropdown.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 812);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-documents-table-mobile.png', animations: 'disabled' });
    await page.keyboard.press('Escape'); await dropdown.waitFor({ state: 'hidden' });
    const info = page.getByRole('dialog', { name: 'Thông tin tài liệu', exact: true });
    const openInfo = async name => {
      await list.getByRole('button', { name: 'Thao tác với ' + name, exact: true }).click();
      await page.getByRole('menuitem', { name: 'Xem thông tin', exact: true }).click();
      await info.waitFor();
      await info.getByText(name, { exact: true }).waitFor();
    };
    await openInfo(longName);
    await info.getByText('2.4 MB', { exact: true }).waitFor();
    await info.getByText(sample.profile.fullName, { exact: true }).waitFor();
    await info.getByText('17/11/2026, 16:04', { exact: true }).waitFor();
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-document-info-mobile.png', animations: 'disabled' });
    await info.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await info.waitFor({ state: 'hidden' });
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-documents-compact-mobile.png', animations: 'disabled' });
    await openInfo('Document_12.pdf');
    assert.equal(await info.getByText('—', { exact: true }).count(), 3);
    await info.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    project.isOwner = false; await load();
    assert.equal(await page.getByRole('button', { name: 'Tải lên tài liệu', exact: true }).count(), 1);
    await list.getByRole('button', { name: 'Thao tác với ' + longName, exact: true }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).count(), 0);
    assert.equal(await page.getByRole('menuitem', { name: 'Xóa tài liệu', exact: true }).count(), 0);
    await page.getByRole('menuitem', { name: 'Xem thông tin', exact: true }).click();
    await info.getByText(longName, { exact: true }).waitFor();
    await info.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    project.isMember = false; await load();
    assert.equal(await page.getByRole('button', { name: 'Tải lên tài liệu', exact: true }).count(), 0);
    project.details.documents = []; await load();
    await page.getByText('Chưa có tài liệu được chia sẻ.', { exact: true }).waitFor();
    project.isOwner = true; project.isMember = true;
    project.details.media = [
      { name: 'Portrait.png', type: 'image', url: 'https://files.example.test/portrait.png', ...uploadMetadata },
      { name: 'Landscape.png', type: 'image', url: 'https://files.example.test/landscape.png' },
      { name: 'Demo.webm', type: 'video', url: 'https://files.example.test/demo.webm' },
      { name: 'Demo_2.webm', type: 'video', url: 'https://files.example.test/demo.webm' },
    ];
    mediaDetails = structuredClone(project.details);
    await page.route('https://files.example.test/*.png', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="#1769e0"/></svg>' }));
    const mediaTab = async () => {
      await page.goto(origin + '/group/' + project.id, { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: /Hình ảnh & Video demo/ }).click();
    };
    await mediaTab();
    const gallery = page.getByRole('list', { name: 'Hình ảnh và video dự án', exact: true });
    await gallery.waitFor();
    await page.route('https://files.example.test/*.webm', route => route.fulfill({ contentType: 'video/webm', path: require('node:path').join(__dirname, 'fixtures/project-media.webm') }));
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const cards = await gallery.getByRole('listitem').all();
      const boxes = await Promise.all(cards.map(card => card.boundingBox()));
      assert.equal(boxes.length, 4);
      if (width >= 768) {
        assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 2, 'Two images per row');
        assert.ok(Math.abs(boxes[2].y - boxes[3].y) < 2 && boxes[2].y > boxes[0].y, 'Two videos per row');
      } else assert.ok(boxes.every((box, index) => index === 0 || box.y > boxes[index - 1].y), 'One item per mobile row');
      assert.equal(await page.locator('video').count(), 0, 'No video players in the list');
      const imageFit = await gallery.getByRole('img', { name: 'Portrait.png', exact: true }).evaluate(el =>
        [el.parentElement, el, ...el.parentElement.querySelectorAll('*')].some(node => getComputedStyle(node).backgroundSize === 'contain' || getComputedStyle(node).objectFit === 'contain'));
      assert.ok(imageFit, 'Entire image fits the thumbnail');
      const uploader = page.getByRole('button', { name: 'Tải lên hình ảnh hoặc video', exact: true });
      const buttonBox = await uploader.boundingBox();
      const headingBox = await page.getByRole('heading', { name: 'Hình ảnh & Video demo', exact: true }).boundingBox();
      assert.ok(Math.abs(buttonBox.y + buttonBox.height / 2 - headingBox.y - headingBox.height / 2) < 2);
    }
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-media-desktop.png', animations: 'disabled' });
    await gallery.getByRole('button', { name: 'Xem lớn Demo.webm', exact: true }).click();
    await page.waitForFunction(() => { const video = document.querySelector('video'); return video && !video.paused && video.currentTime > 0; }).catch(async error => {
      console.error('Video state:', await page.locator('video').evaluate(el => ({ paused: el.paused, readyState: el.readyState, networkState: el.networkState, error: el.error?.message, duration: el.duration, currentTime: el.currentTime })));
      throw error;
    });
    assert.ok(await page.locator('video').getAttribute('controls') !== null);
    await page.getByRole('dialog', { name: 'Xem hình ảnh và video', exact: true }).getByRole('button', { name: 'Đóng', exact: true }).click();
    assert.equal(await page.locator('video').count(), 0, 'Video unmounted when preview closes');
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-media-mobile.png', animations: 'disabled' });
    await gallery.getByRole('button', { name: 'Xem lớn Portrait.png', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Xem hình ảnh và video', exact: true });
    await preview.getByRole('img', { name: 'Portrait.png', exact: true }).waitFor();
    await preview.getByRole('button', { name: 'Đóng', exact: true }).click();
    await gallery.getByRole('button', { name: 'Thao tác với Portrait.png', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Xem thông tin', exact: true }).click();
    const mediaInfo = page.getByRole('dialog', { name: 'Thông tin tệp', exact: true });
    await mediaInfo.getByText('2.4 MB', { exact: true }).waitFor();
    await mediaInfo.getByRole('button', { name: 'Đóng', exact: true }).click();
    await gallery.getByRole('button', { name: 'Thao tác với Portrait.png', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).click();
    const mediaRename = page.getByRole('dialog', { name: 'Đổi tên tệp', exact: true });
    await mediaRename.getByRole('textbox', { name: 'Tên tệp', exact: true }).fill('Ảnh dự án');
    await mediaRename.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await mediaRename.waitFor({ state: 'hidden' });
    assert.equal(project.details.media[0].name, 'Ảnh dự án.png');
    await gallery.getByRole('button', { name: 'Thao tác với Ảnh dự án.png', exact: true }).click();
    const mediaDownload = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).click();
    assert.equal((await mediaDownload).suggestedFilename(), 'Ảnh dự án.png');
    await gallery.getByRole('button', { name: 'Thao tác với Ảnh dự án.png', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Xóa tệp', exact: true }).click();
    const mediaDelete = page.getByRole('dialog', { name: 'Xóa tệp?', exact: true });
    failNext = true;
    await mediaDelete.getByRole('button', { name: 'Xóa tệp', exact: true }).click();
    await mediaDelete.getByRole('alert').waitFor();
    assert.equal(project.details.media.length, 4);
    await mediaDelete.getByRole('button', { name: 'Xóa tệp', exact: true }).click();
    await mediaDelete.waitFor({ state: 'hidden' });
    assert.equal(project.details.media.length, 3);
    const mediaChooserEvent = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Tải lên hình ảnh hoặc video', exact: true }).click();
    const mediaChooser = await mediaChooserEvent;
    assert.ok((await mediaChooser.element().getAttribute('accept')).includes('video/*'));
    await mediaChooser.setFiles({ name: 'Upload.png', mimeType: 'image/png', buffer: Buffer.from('fixture image') });
    await gallery.getByRole('button', { name: 'Xem lớn Upload.png', exact: true }).waitFor();
    assert.equal(project.details.media.length, 4);
    project.isOwner = false; await mediaTab();
    await gallery.getByRole('button', { name: 'Thao tác với Landscape.png', exact: true }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).count(), 0);
    assert.equal(await page.getByRole('menuitem', { name: 'Xóa tệp', exact: true }).count(), 0);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    console.log('Document and media checks passed: responsive layouts, metadata, upload/download, rename/delete retry, preserved details, permissions and expanded video playback lifecycle.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
