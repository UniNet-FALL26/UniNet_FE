const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const company = { id: 'partner-profile', organizationName: 'Public Partner', partnerType: 0, avatarUrl: origin + '/fixture/avatar.png', coverUrl: origin + '/fixture/cover.png', isVerified: true, industry: 'Software', bio: 'Company introduction', address: 'HCM', contactEmail: 'partner@example.test', phone: '0901234567', websites: [], introduction: { imageUrl: null, foundedOn: '2019-03-15', employeeRange: '51–200', branches: ['Ha Noi'], galleryUrls: [origin + '/fixture/gallery.png'] }, openJobs: [{ id: 'job-two', title: 'Second opportunity', workType: 0, employmentType: 0, jobField: 'Software', minSalaryVnd: null, maxSalaryVnd: null, location: 'HCM', deadline: null }] };
const job = { id: 'job-one', title: 'First opportunity', companyName: company.organizationName, companyPartnerType: 0, companyIsVerified: true, workType: 0, employmentType: 0, jobField: 'Software', skills: [], benefits: [], responsibilities: [], requiredQualifications: [], preferredQualifications: [], projectAreas: [], companyWebsites: [], isSaved: false, isApplied: false, createdAt: '2026-11-01T00:00:00Z' };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/fixture/**', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()), path = url.pathname;
      requests.push(path);
      let json = [];
      if (path.endsWith('/auth/me')) json = { id: 'student', role: 0, profileComplete: true, profile: { id: 'student-profile', fullName: 'Student', nickname: 'student' } };
      else if (path.endsWith('/partner-profile')) json = company;
      else if (path.endsWith('/opportunities/job-one')) json = job;
      else if (path.endsWith('/opportunities/job-two')) json = { ...job, id: 'job-two', title: 'Second opportunity' };
      else if (path.endsWith('/opportunities')) json = { page: 1, totalPages: 1, totalItems: 1, jobs: [job] };
      else if (path.endsWith('/community/posts')) {
        assert.equal(url.searchParams.get('authorUserId'), company.id);
        json = [{ id: 'company-post', authorUserId: company.id, authorName: company.organizationName, description: 'Public company post', mediaUrls: [], favoriteCount: 0, commentCount: 0, createdAt: '2026-11-01T00:00:00Z' }];
      }
      return route.fulfill({ json });
    });
    fs.mkdirSync('dist/partner-public-profile', { recursive: true });
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + '/opportunities?jobId=job-one', { timeout: 120000 });
      await page.getByRole('button', { name: 'Xem trang công ty Public Partner', exact: true }).first().click();
      await page.getByTestId('company-profile-hero').waitFor();
      await page.getByTestId('company-business-card').getByText('15/03/2019', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Chỉnh sửa|Thêm ảnh|Thêm hình ảnh|Mở cài đặt|Đăng xuất|Quản lý bài đăng/ }).count(), 0);
      assert.equal(await page.getByTestId('company-profile-settings-column').count(), 0);
      await page.getByRole('button', { name: 'Xem ảnh đại diện', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa ảnh', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Đóng xem ảnh', exact: true }).click({ position: { x: 10, y: 10 } });
      await page.getByRole('button', { name: 'Đóng xem ảnh', exact: true }).waitFor({ state: 'hidden' });
      await page.getByRole('tab', { name: 'Bài viết', exact: true }).click();
      await page.getByText('Public company post', { exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Giới thiệu', exact: true }).click();
      await page.screenshot({ path: `dist/partner-public-profile/student-${width}.png`, fullPage: true });
      await page.getByRole('tab', { name: 'Tuyển dụng', exact: true }).click();
      await page.getByRole('button').filter({ hasText: 'Second opportunity' }).click();
      await page.getByText('Second opportunity', { exact: true }).last().waitFor();
      await page.getByRole('button', { name: 'Xem trang công ty Public Partner', exact: true }).first().click();
      await page.getByTestId('company-profile-hero').waitFor();
      await page.getByRole('button', { name: 'Đóng trang đối tác', exact: true }).click();
      await page.getByText('Second opportunity', { exact: true }).last().waitFor();
      await page.getByRole('button', { name: 'Xem trang công ty Public Partner', exact: true }).first().click();
      await page.getByTestId('company-profile-hero').waitFor();
      const navigation = page.getByRole('dialog', { name: 'Public Partner', exact: true }).getByRole('tab', { name: 'Nhắn tin', exact: true });
      assert.equal(await navigation.count(), 1);
      await navigation.click();
      await page.waitForURL(url => url.pathname === '/messages');
      assert.equal(await page.getByRole('button', { name: 'Đóng trang đối tác', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Quay lại danh sách cơ hội', exact: true }).count(), 0);
    }
    assert.equal(requests.some(path => path.includes('/partner/dashboard') || path.includes('/partner/verification') || path.includes('/posts/mine')), false);
    assert.deepEqual(errors, []);
    console.log('Public company profile: shared screen, read-only actions, business date, author posts and student job navigation verified at 375/1440.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
