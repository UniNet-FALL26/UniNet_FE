const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const portfolio = structuredClone(sample);
portfolio.portfolio.appearance.profile.template = 'developer-landscape';
const profile = { id: 'partner', organizationName: 'Fixture Company', partnerType: 0, websites: [], isVerified: true };
const account = { id: 'partner', email: 'partner@example.test', role: 1, profileComplete: true, profile };
const job = { id: 'job', title: 'CV layout fixture', status: 1, workType: 0, employmentType: 0, requiredQualifications: [], preferredQualifications: [], projectAreas: [], skills: [], benefits: [] };
const applicant = { id: 'applicant', fullName: 'Student Fixture', status: 0, applicationRound: 1, appliedAt: '2026-11-01', submittedPortfolio: portfolio };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const json = path.endsWith('/auth/me') ? account : path.endsWith('/applications') ? [applicant] : path.endsWith('/partner/jobs/job') ? job : path.endsWith('/profile/me') ? account : [];
      return route.fulfill({ json });
    });
    for (const width of [1920, 1440, 1024, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/job-detail?jobId=job`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: width < 1024 ? 'Xem hồ sơ đã nộp của Student Fixture' : 'Xem CV của Student Fixture', exact: true }).click();
      const cv = page.getByTestId('developer-landscape');
      await cv.waitFor();
      const expectedWidth = width >= 1200 ? Math.min(width, 1800) - 456 : Math.min(width, 1120);
      await page.waitForFunction(({ expectedWidth }) => {
        const element = document.querySelector('[data-testid="developer-landscape"]');
        return element && Math.abs(element.getBoundingClientRect().width - expectedWidth) < 2;
      }, { expectedWidth });
      const bounds = await cv.boundingBox();
      assert.ok(Math.abs(bounds.x + bounds.width / 2 - width / 2) < 2, `CV centered at ${width}px`);
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'CV fits the viewport');
      await page.getByRole('button', { name: 'Đóng CV', exact: true }).click();
      await cv.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    console.log('Submitted CV centered and matches student profile width at 375/1024/1440/1920.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
