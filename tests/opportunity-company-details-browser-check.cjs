const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const websites = ['https://www.facebook.com/fixture', 'https://www.youtube.com/watch?v=fixture', 'https://www.tiktok.com/@fixture'];
const account = { id: 'student-detail', email: 'student@example.test', role: 0, profileComplete: true, profile: { id: 'student-profile', fullName: 'Student Test', nickname: 'student', isVerified: false } };
const baseJob = { id: 'company-job', title: 'IT Fullstack developer', workType: 0, employmentType: 0, jobField: 'Software', minSalaryVnd: null, maxSalaryVnd: null, location: 'HCM', description: 'Job description', startAt: null, deadline: null, responsibilities: [], requiredQualifications: [], preferredQualifications: [], projectAreas: [], skills: [], benefits: [], companyName: 'SkillSnap company', companyAvatarUrl: null, companyIndustry: 'Software', companyBio: null, companyAddress: null, companyWebsite: null, companyWebsites: websites, companyContactEmail: null, companyPhone: '0968110347', companyPartnerType: 0, isSaved: false, isApplied: false, applicationStatus: null, appliedAt: null, createdAt: '2026-11-01T00:00:00Z' };
const partner = { id: 'partner', organizationName: 'SkillSnap company', partnerType: 0, isVerified: true, websites, openJobs: [] };
async function assertNoPageAnimation(locator) {
  const animations = await locator.evaluate(element => {
    const names = [];
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.animationName !== 'none') names.push(style.animationName);
    }
    return names;
  });
  assert.deepEqual(animations, [], 'Detail pages should open without a page transition animation');
}
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  let verified = true;
  let deferDetail = false;
  let releaseDetail;
  let detailStarted;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const job = { ...baseJob, companyIsVerified: verified };
    if (path.endsWith('/partner-profile')) return route.fulfill({ json: partner });
    if (deferDetail && path.endsWith('/opportunities/company-job')) {
      detailStarted();
      await new Promise(resolve => { releaseDetail = resolve; });
    }
    return route.fulfill({ json: path.endsWith('/auth/me') ? account : path.endsWith('/opportunities/company-job') ? job : path.endsWith('/opportunities') ? { page: 1, pageSize: 15, totalItems: 1, totalPages: 1, jobs: [job] } : [] });
  });
  fs.mkdirSync('dist/opportunities-verification', { recursive: true });
  try {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const isVerified of [true, false]) {
        verified = isVerified;
        await page.goto(`${origin}/opportunities?jobId=company-job`);
        await page.getByText('IT Fullstack developer', { exact: true }).last().waitFor();
        const badges = page.getByRole('img', { name: 'C\u00f4ng ty \u0111\u00e3 x\u00e1c minh', exact: true });
        if (isVerified) await badges.first().waitFor();
        assert.equal(await badges.count(), isVerified ? 2 : 0, `Verification badges: ${width}/${isVerified}`);
        for (const name of ['Facebook', 'YouTube', 'TikTok']) {
          const link = page.getByRole('link', { name: `M\u1edf ${name}`, exact: true });
          await link.waitFor();
          assert.equal((await link.innerText()).includes('https://'), false);
          assert.ok((await link.innerText()).includes(name));
          assert.equal(await link.getByText('WEBSITE', { exact: true }).count(), 0);
        }
        const back = page.getByRole('button', { name: 'Quay lại danh sách cơ hội', exact: true });
        await back.waitFor();
        await assertNoPageAnimation(back);
        await page.getByRole('button', { name: 'Xem trang công ty SkillSnap company', exact: true }).first().click();
        const companyBack = page.getByRole('button', { name: 'Đóng trang đối tác', exact: true });
        await companyBack.waitFor();
        await assertNoPageAnimation(companyBack);
        await page.getByTestId('company-about-card').waitFor();
        await companyBack.click();
        await companyBack.waitFor({ state: 'detached' });
        await back.waitFor();
        await assertNoPageAnimation(back);
        assert.equal(await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).count(), 0);
        const backBounds = await back.boundingBox();
        const titleBounds = await page.getByText('Chi tiết cơ hội', { exact: true }).boundingBox();
        assert.ok(backBounds.x + backBounds.width <= titleBounds.x, 'Back arrow appears left of the title');
        if (isVerified) await page.screenshot({ path: `dist/opportunities-verification/detail-${width}.png`, fullPage: true });
        await back.click();
        await back.waitFor({ state: 'hidden' });
        assert.equal(new URL(page.url()).searchParams.has('jobId'), false, 'Closing details clears the deep link');
        await page.getByRole('heading', { name: 'Cơ hội', exact: true }).waitFor();
      }
      await page.goto(`${origin}/opportunities`);
      const started = new Promise(resolve => { detailStarted = resolve; });
      deferDetail = true;
      await page.getByRole('button', { name: 'Xem IT Fullstack developer tại SkillSnap company', exact: true }).click();
      await started;
      const back = page.getByRole('button', { name: 'Quay lại danh sách cơ hội', exact: true });
      await back.click();
      await back.waitFor({ state: 'hidden' });
      releaseDetail();
      deferDetail = false;
      // Give a late response time to reach React; the dialog must stay dismissed.
      await page.waitForTimeout(500);
      assert.equal(await back.count(), 0, 'A late detail response cannot reopen a dismissed job');
      await page.getByRole('button', { name: 'Xem IT Fullstack developer tại SkillSnap company', exact: true }).click();
      await back.waitFor();
      await back.click();
      await back.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    console.log('Student recruitment details: verified/unverified badges and named social links verified at 375/1440, no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
