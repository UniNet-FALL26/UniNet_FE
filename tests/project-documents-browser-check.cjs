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
      if (path.endsWith('/images')) return ok({ imageUrl: 'https://files.example.test/upload.xlsx', publicId: 'upload.xlsx', resourceType: 'raw', fileName: 'Bo_sung.xlsx', format: 'xlsx' });
      if (path.endsWith('/project-hub/' + project.id + '/requests')) return ok({ items: [] });
      if (path.endsWith('/project-hub/' + project.id)) {
        if (method === 'PATCH') {
          const body = route.request().postDataJSON(); writes.push(body);
          assert.deepEqual(Object.keys(body), ['details']);
          assert.deepEqual({ ...body.details, documents: preserved.documents }, preserved);
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
    await page.setViewportSize({ width: 375, height: 812 });
    await table.getByRole('button', { name: 'Thao tác với Document_11.pdf', exact: true }).click();
    const dropdown = page.getByRole('menu'); const box = await dropdown.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 812);
    await page.screenshot({ path: 'C:/Users/minec/UniNet/project-documents-table-mobile.png', animations: 'disabled' });
    await page.keyboard.press('Escape'); await dropdown.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    project.isOwner = false; await load();
    assert.equal(await page.getByRole('button', { name: 'Tải lên tài liệu', exact: true }).count(), 0);
    await table.getByRole('button', { name: 'Thao tác với Document_11.pdf', exact: true }).click();
    assert.equal(await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).count(), 0);
    assert.equal(await page.getByRole('menuitem', { name: 'Xóa tài liệu', exact: true }).count(), 0);
    await page.keyboard.press('Escape');
    project.details.documents = []; await load();
    await page.getByText('Chưa có tài liệu được chia sẻ.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Document table checks passed: pagination, rename, download, bulk cancel/delete retry, preserved details, mobile menu, permissions and empty state.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
