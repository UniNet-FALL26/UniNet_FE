const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const job = { id: 'job-one', title: 'Backend Developer Intern', workType: 1, employmentType: 0, jobField: 'Công nghệ thông tin', minSalaryVnd: null, maxSalaryVnd: 10000000, location: 'TP. Hồ Chí Minh', description: 'Mô tả công việc', status: 1, startAt: null, deadline: '2026-11-30T00:00:00Z', responsibilities: [], requiredQualifications: [], preferredQualifications: [], projectAreas: [], skills: [], benefits: [], applicantCount: 0, viewCount: 0, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
const roleRoutes = [
  { role: 0, header: 'desktop-app-header', footer: 'mobile-app-footer', routes: ['/settings', '/cv', '/cv/manage', '/cv/templates', '/cv/cv-one', '/post/post-one', '/profile/templates', '/profile/preview', '/profile/editor', '/profile/view/student-one', '/group/create', '/group/import', '/group/recommendations', '/group/external-draft/draft-one', '/group/project-one', '/group/level1/project-one', '/group/verification/project-one', '/group/checkout/verification-one', '/group/verification-dossier/verification-one', '/group/verification-meeting/verification-one', '/group/verification-result/verification-one', '/workspace/project-one', '/payment/result'] },
  { role: 1, header: 'company-header', footer: 'company-footer-navigation', routes: ['/(company)/job-detail?jobId=job-one', '/(company)/create', '/(company)/verification', '/(company)/advertisement', '/settings'] },
  { role: 2, header: 'assessor-header', footer: 'assessor-footer-navigation', routes: ['/(assessor)/assessor-assessments/assignment-one', '/(assessor)/assessor-availability', '/wallet', '/settings'] },
];
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  fs.mkdirSync('dist/persistent-navigation', { recursive: true });
  try {
    for (const fixture of roleRoutes.filter(item => !process.env.NAV_TEST_ROLE || item.role === Number(process.env.NAV_TEST_ROLE))) {
      const page = await browser.newPage(); page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const profile = { ...sample.profile, id: `profile-${fixture.role}`, fullName: 'Navigation User', nickname: 'navigation', organizationName: 'Navigation Company', partnerType: 0, websites: [], isVerified: true };
      const account = { id: `account-${fixture.role}`, email: 'navigation@example.test', role: fixture.role, profileComplete: true, profile };
      const portfolio = { ...structuredClone(sample), isOwner: true, profile };
      await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        const ok = json => route.fulfill({ json });
        if (path.endsWith('/auth/me')) return ok(account);
        if (path.endsWith('/profile/me')) return ok({ profile });
        if (path.includes('/profile/portfolio/')) return ok(portfolio);
        if (path.endsWith('/partner/dashboard')) return ok({ organizationName: profile.organizationName, openJobs: [] });
        if (path.endsWith('/partner/verification/me')) return ok({ status: 1 });
        if (path.endsWith('/partner/jobs/job-one')) return ok(job);
        if (path.endsWith('/partner/jobs/job-one/applications')) return ok([]);
        if (path.includes('/skills') || path.endsWith('/unread-count') || path.includes('/catalog')) return ok([]);
        return route.fulfill({ status: 404, json: { message: 'Fixture: no data for this screen.' } });
      });
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of fixture.routes.filter(path => !process.env.NAV_TEST_PATH || path.includes(process.env.NAV_TEST_PATH))) {
          await page.goto(origin + path, { timeout: 120000 });
          const nav = page.getByTestId('detail-navigation'); await nav.waitFor();
          assert.equal(await nav.count(), 1, `One toolbar: ${fixture.role} ${path} ${width}`);
          await page.getByTestId(width >= 1024 ? fixture.header : fixture.footer).waitFor();
          const back = nav.getByRole('button').first(); await back.waitFor();
          await back.scrollIntoViewIfNeeded();
          const box = await back.boundingBox();
          assert.ok(box && box.x < (width === 375 ? 60 : width / 3), `Left back arrow: ${path}`);
          if (width >= 1024) {
            await page.getByTestId(fixture.header).waitFor();
            assert.equal(await page.getByTestId(fixture.header).count(), 1);
            await page.getByTestId('detail-breadcrumbs').waitFor();
            assert.equal(await page.getByTestId(fixture.footer).count(), 0);
          } else {
            const footer = page.getByTestId(fixture.footer); await footer.waitFor();
            assert.equal(await page.getByTestId(fixture.header).count(), 0);
            const footerBox = await footer.boundingBox();
            assert.ok(footerBox.y + footerBox.height <= 1001 && footerBox.y > 850, `Footer remains visible: ${path}`);
          }
          if (path.includes('job-detail')) {
            await page.getByRole('button', { name: 'Chỉnh sửa bài đăng', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa bài đăng', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Đóng bài đăng', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Xóa bài đăng', exact: true }).count(), 1);
            await page.screenshot({ path: `dist/persistent-navigation/job-${width}.png`, fullPage: true });
          }
          if (path === '/cv/templates') {
            assert.equal(await nav.getByTestId('detail-page-actions').count(), 0, 'No invented actions');
            if (width === 1440) await nav.getByRole('link', { name: 'CV', exact: true }).click();
          }
          if (path === '/profile/editor' || path === '/wallet') await page.screenshot({ path: `dist/persistent-navigation/${path.replaceAll('/', '-')}-${width}.png`, fullPage: true });
        }
      }
      if (fixture.role === 0) {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(origin + '/profile/preview?template=developer-modern', { timeout: 120000 });
        await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click();
        await page.waitForURL(url => url.pathname === '/profile/editor');
        await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).waitFor();
        await page.locator('[role="button"][aria-pressed="false"][aria-label^="Chọn màu"]:visible').first().click();
        await page.getByRole('button', { name: 'Quay lại xem mẫu', exact: true }).click();
        await page.getByText('Thay đổi chưa được lưu', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
        assert.equal(new URL(page.url()).pathname, '/profile/editor');
        await page.getByTestId('detail-breadcrumbs').getByRole('link', { name: 'Mẫu hồ sơ', exact: true }).click();
        await page.getByText('Thay đổi chưa được lưu', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Bỏ thay đổi và quay lại', exact: true }).click();
        await page.waitForURL(url => url.pathname === '/profile/templates');
        for (const width of [768, 1024]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.locator(`[data-testid="${width < 1024 ? fixture.footer : fixture.header}"]:visible`).waitFor();
          assert.equal(await page.locator('[data-testid="detail-navigation"]:visible').count(), 1);
        }
      }
      await page.setViewportSize({ width: 375, height: 1000 });
      const footer = page.locator(`[data-testid="${fixture.footer}"]:visible`);
      await footer.getByRole('tab', { name: 'Nhắn tin', exact: true }).click();
      await page.waitForURL(url => url.pathname === (fixture.role === 1 ? '/company-messages' : fixture.role === 2 ? '/assessor-messages' : '/messages'));
      await footer.waitFor();
      assert.equal(await page.locator('[data-testid="detail-navigation"]:visible').count(), 0, 'Main tab clears the detail toolbar');
      assert.deepEqual(errors, [], `No page errors for role ${fixture.role}`);
      console.log(`Role ${fixture.role}: ${fixture.routes.filter(path => !process.env.NAV_TEST_PATH || path.includes(process.env.NAV_TEST_PATH)).length} routes verified at 375/1440.`);
      await page.close();
    }
    console.log('Secondary navigation checks passed: role shells, back arrows, breadcrumbs, fixed footers, existing actions and main-tab navigation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
