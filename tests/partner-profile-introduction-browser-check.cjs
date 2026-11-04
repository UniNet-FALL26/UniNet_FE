const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const photo = { name: 'company-photo.png', mimeType: 'image/png', buffer: fs.readFileSync('assets/images/uninet-mark.png') };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }); page.setDefaultTimeout(12000);
    const profile = { id: 'partner-profile', fullName: 'SkillSnap Company', organizationName: 'SkillSnap Company', nickname: 'SkillSnap', partnerType: 0, industry: 'Công nghệ thông tin', bio: 'SkillSnap đồng hành cùng sinh viên trong hành trình phát triển nghề nghiệp.', contactEmail: 'contact@skillsnap.test', phone: '0968110347', address: 'TP. Hồ Chí Minh', avatarUrl: origin + '/fixture/logo.png', coverUrl: origin + '/fixture/cover.png', websites: ['https://facebook.com/skillsnap', 'https://youtube.com/@skillsnap', 'https://tiktok.com/@skillsnap'], isVerified: true, introduction: null };
    const account = { id: 'partner', email: 'partner@example.test', role: 1, profileComplete: true, profile };
    const errors = [], updates = [], cloudUrls = []; let failNext = false, uploads = 0, writes = 0, failUploadAt = -1, holdUpload = false, uploadStarted, releaseUpload;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/fixture/**', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/partner-campus.png') }));
    await page.route('https://res.cloudinary.com/fixture/**', route => route.fulfill({ contentType: 'image/png', body: photo.buffer }));
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (path.endsWith('/profile/me')) return route.fulfill({ json: { ...account, profile } });
      if (path.endsWith('/partner/dashboard')) return route.fulfill({ json: { organizationName: profile.organizationName, openJobs: [] } });
      if (path.endsWith('/partner/verification/me')) return route.fulfill({ json: { status: 1 } });
      if (path.endsWith('/images') && request.method() === 'POST') {
        uploads++; uploadStarted?.();
        assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
        assert.ok(request.postDataBuffer().length > photo.buffer.length);
        if (holdUpload) await new Promise(resolve => { releaseUpload = resolve; });
        if (uploads === failUploadAt) return route.fulfill({ status: 503, json: { message: 'Cloudinary đang lỗi.' } });
        const publicId = `uninet/company/photo-${uploads}`, imageUrl = `https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.png`;
        cloudUrls.push(imageUrl);
        return route.fulfill({ json: { imageUrl, publicId, format: 'png' } });
      }
      if (path.endsWith('/profile/partner') && request.method() === 'PUT') {
        writes++;
        if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { message: 'Thử lưu lại sau.' } }); }
        const data = request.postDataJSON();
        for (const url of [data.introduction?.imageUrl, ...(data.introduction?.galleryUrls ?? [])].filter(Boolean)) assert.ok(cloudUrls.includes(url), 'Only successfully uploaded Cloudinary URLs reach the profile database');
        updates.push(data); Object.assign(profile, data); return route.fulfill({ json: { ...account, profile } });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(origin + '/(company)/profile');
    const about = page.getByTestId('company-about-card'), business = page.getByTestId('company-business-card'), gallery = page.getByTestId('company-gallery-card');
    await about.waitFor(); await business.waitFor(); await gallery.waitFor();
    await page.getByTestId('company-profile-socials').getByRole('link', { name: 'Mở Facebook', exact: true }).waitFor();
    const open = async (card, name) => { await card.getByRole('button', { name, exact: true }).click(); const dialog = page.getByRole('dialog', { name: name.replace('phần giới thiệu', 'Giới thiệu'), exact: true }); await dialog.waitFor(); return dialog; };
    const save = async (dialog, label = 'Xác nhận') => { await dialog.getByRole('button', { name: label, exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); };
    const choose = async (dialog, label, file = photo) => {
      const chooser = page.waitForEvent('filechooser'); await dialog.getByRole('button', { name: label, exact: true }).click(); await (await chooser).setFiles(file);
    };
    let dialog = await open(about, 'Chỉnh sửa phần giới thiệu');
    assert.equal(await dialog.getByRole('textbox').count(), 1);
    assert.equal(await dialog.getByRole('textbox', { name: 'URL ảnh giới thiệu', exact: true }).count(), 0);
    await choose(dialog, 'Chọn ảnh giới thiệu'); await dialog.getByRole('img', { name: 'Ảnh đã chọn 1', exact: true }).waitFor();
    assert.equal(uploads, 0); assert.equal(writes, 0);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(uploads, 0); assert.equal(writes, 0);
    dialog = await open(about, 'Chỉnh sửa phần giới thiệu');
    await choose(dialog, 'Chọn ảnh giới thiệu'); await dialog.getByRole('img', { name: 'Ảnh đã chọn 1', exact: true }).waitFor();
    await dialog.getByRole('textbox', { name: 'Nội dung giới thiệu', exact: true }).fill('SkillSnap phát triển các giải pháp phần mềm, nền tảng số và ứng dụng công nghệ hiện đại.\n\nChúng tôi xây dựng môi trường làm việc cởi mở, khuyến khích sáng tạo và hợp tác.');
    holdUpload = true;
    const started = new Promise(resolve => { uploadStarted = resolve; });
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await started;
    assert.equal(uploads, 1); assert.equal(writes, 0);
    assert.equal(await dialog.getByRole('button', { name: 'Hủy', exact: true }).isDisabled(), true);
    profile.phone = '0901234567'; holdUpload = false; releaseUpload(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(profile.phone, '0901234567'); assert.equal(await about.getByRole('img', { name: 'Ảnh giới thiệu SkillSnap Company', exact: true }).count(), 1);
    dialog = await open(business, 'Chỉnh sửa Thông tin doanh nghiệp');
    assert.equal(await dialog.getByRole('textbox').count(), 5);
    for (const [label, value] of [['Trụ sở chính', 'Tòa nhà SkillSnap, TP. Hồ Chí Minh'], ['Ngày thành lập (YYYY-MM-DD)', '2019-03-15'], ['Quy mô nhân sự', '51 – 200'], ['Chi nhánh (mỗi dòng một chi nhánh)', 'Hà Nội\nĐà Nẵng\nCần Thơ']]) await dialog.getByRole('textbox', { name: label, exact: true }).fill(value);
    await save(dialog, 'Lưu thay đổi'); await business.getByText('15/03/2019', { exact: true }).waitFor();
    const introUrl = profile.introduction.imageUrl;
    dialog = await open(gallery, 'Chỉnh sửa Hình ảnh công ty');
    const uploadsBeforeGallery = uploads, writesBeforeGallery = writes;
    for (let i = 1; i <= 5; i++) { await choose(dialog, 'Thêm ảnh từ thiết bị', { ...photo, name: `office-${i}.png` }); await dialog.getByRole('img', { name: `Ảnh đã chọn ${i}`, exact: true }).waitFor(); }
    assert.equal(uploads, uploadsBeforeGallery); assert.equal(writes, writesBeforeGallery);
    failUploadAt = uploads + 2; await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await dialog.getByRole('alert').waitFor();
    assert.equal(writes, writesBeforeGallery, 'A failed upload prevents the profile database write');
    failNext = true; await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await dialog.getByRole('alert').waitFor();
    const uploadsBeforeRetry = uploads;
    await save(dialog); assert.equal(profile.introduction.imageUrl, introUrl); assert.equal(profile.introduction.galleryUrls.length, 5);
    assert.equal(uploads, uploadsBeforeRetry, 'Database retry reuses successfully uploaded images');
    assert.equal(await gallery.getByRole('img').count(), 4);
    await gallery.getByRole('button', { name: 'Xem tất cả (5)', exact: true }).click();
    const lightbox = page.getByRole('dialog', { name: 'Thư viện hình ảnh công ty', exact: true }); await lightbox.waitFor(); assert.equal(await lightbox.getByRole('img').count(), 5); await lightbox.getByRole('button', { name: 'Đóng thư viện ảnh', exact: true }).click();
    await page.reload(); await about.waitFor(); assert.equal(await about.getByRole('img').count(), 1); await business.getByText('51 – 200', { exact: true }).waitFor();
    fs.mkdirSync('dist/partner-profile-introduction', { recursive: true });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 }); await about.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await page.screenshot({ path: `dist/partner-profile-introduction/profile-${width}.png`, fullPage: true });
      dialog = await open(about, 'Chỉnh sửa phần giới thiệu');
      const previousUploads = uploads; await choose(dialog, 'Chọn ảnh khác'); await dialog.getByRole('img', { name: 'Ảnh đã chọn 1', exact: true }).waitFor();
      await dialog.evaluate(async element => {
        await new Promise(resolve => {
          const check = () => { for (let node = element; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) { requestAnimationFrame(check); return; } resolve(); };
          check();
        });
      });
      await dialog.screenshot({ path: `dist/partner-profile-introduction/image-picker-${width}.png` });
      await dialog.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(profile.introduction.imageUrl, introUrl); assert.equal(uploads, previousUploads);
    }
    await page.getByTestId('company-profile-tabs').getByRole('tab', { name: 'Bài viết', exact: true }).click(); await page.getByTestId('company-posts-empty').waitFor();
    await page.getByTestId('company-profile-tabs').getByRole('tab', { name: 'Tuyển dụng', exact: true }).click(); await page.getByText('Hiện chưa có bài tuyển dụng đang mở.', { exact: true }).waitFor();
    await page.getByTestId('company-profile-tabs').getByRole('tab', { name: 'Giới thiệu', exact: true }).click(); await about.waitFor();
    dialog = await open(about, 'Chỉnh sửa phần giới thiệu'); await dialog.getByRole('button', { name: 'Xóa ảnh giới thiệu', exact: true }).click(); await save(dialog); assert.equal(await about.getByRole('img').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Partner introduction: device picker, previews, cancel without upload, confirm uploads to Cloudinary before DB, partial upload/DB failure retry, gallery and responsive layouts passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
