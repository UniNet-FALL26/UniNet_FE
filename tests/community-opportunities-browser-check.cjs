const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], listQueries = [], saved = new Set();
    let mode = 'jobs', saveCalls = 0;
    const account = { id: 'student', email: 'student@example.test', role: 0, profileComplete: true, profile: { id: 'profile', fullName: 'Sinh viên UniNet', nickname: 'student', isVerified: false } };
    const jobs = ['Frontend Intern', 'Backend Developer (Junior)', 'Fullstack Intern'].map((title, index) => ({ id: `job-${index}`, title, companyName: ['FPT Software', 'VNG Corporation', 'Tiki'][index], companyAvatarUrl: null, location: ['Hà Nội', 'TP. HCM', 'TP. HCM'][index], workType: index % 3, employmentType: 0, createdAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(), skills: [], benefits: [], responsibilities: [], requiredQualifications: [], preferredQualifications: [], projectAreas: [], description: 'Mô tả công việc', isApplied: false, companyWebsites: [], isSaved: false }));
    const posts = Array.from({ length: 10 }, (_, index) => ({ id: `post-${index}`, authorUserId: 'author', authorName: 'Sinh viên UniNet', authorNickname: 'author', authorActorType: 0, description: `Bài viết cộng đồng ${index + 1}.\nChia sẻ tiến độ dự án và kinh nghiệm làm việc nhóm.\nNội dung trao đổi dành cho thành viên cộng đồng.`, mediaUrls: [], favoriteCount: 0, commentCount: 0, isFavorited: false, isSaved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), pathname = url.pathname;
      if (pathname.endsWith('/auth/me')) return route.fulfill({ json: account });
      if (pathname.endsWith('/community/posts')) return route.fulfill({ json: { page: 1, totalPages: 1, data: url.searchParams.get('page') === '1' ? posts : [] } });
      if (/\/opportunities\/job-\d\/saved$/.test(pathname)) {
        saveCalls++;
        const id = pathname.split('/').at(-2);
        if (route.request().method() === 'PUT') saved.add(id); else saved.delete(id);
        return route.fulfill({ status: 204 });
      }
      if (pathname.endsWith('/opportunities')) {
        listQueries.push(Object.fromEntries(url.searchParams));
        if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
        return route.fulfill({ json: { page: 1, pageSize: 3, totalItems: mode === 'empty' ? 0 : 3, totalPages: 1, jobs: mode === 'empty' ? [] : jobs.map(job => ({ ...job, isSaved: saved.has(job.id) })) } });
      }
      const job = jobs.find(job => pathname.endsWith('/opportunities/' + job.id));
      return route.fulfill({ json: job || [] });
    });
    const origin = process.env.COMMUNITY_TEST_ORIGIN || 'http://localhost:8081';
    for (const width of [320, 768, 1080, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/community');
      const card = page.getByTestId('community-opportunities');
      await card.getByRole('link', { name: 'Xem cơ hội Frontend Intern tại FPT Software', exact: true }).waitFor();
      assert.equal(await card.locator('[data-testid^="community-opportunity-"]').count(), 3);
      assert.ok(listQueries.every(query => query.sort === 'newest' && query.pageSize === '3' && query.page === '1'));
      const bounds = await card.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      if (width >= 1280) {
        const feed = page.getByTestId('community-feed-column');
        const feedBounds = await feed.boundingBox();
        const postBounds = await page.getByTestId('community-post-post-0').boundingBox();
        assert.ok(Math.abs(postBounds.x + postBounds.width / 2 - width / 2) <= 1, 'Posts must remain centered in the viewport');
        assert.ok(bounds.x >= postBounds.x + postBounds.width, 'Card belongs to the right of posts');
        const scrolled = await feed.evaluate(element => {
          const scroller = [...element.querySelectorAll('*')].find(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight);
          if (!scroller) return false;
          scroller.scrollTop = 500;
          scroller.dispatchEvent(new Event('scroll'));
          return scroller.scrollTop > 0;
        });
        assert.ok(scrolled, 'Feed should scroll');
        assert.equal((await card.boundingBox()).y, bounds.y, 'Sidebar must stay stationary');
      } else assert.equal(await page.getByTestId('community-opportunities-sidebar').count(), 0);
      await card.getByRole('button', { name: 'Lưu cơ hội Frontend Intern', exact: true }).click();
      await card.getByRole('button', { name: 'Bỏ lưu cơ hội Frontend Intern', exact: true }).waitFor();
      await card.getByRole('button', { name: 'Bỏ lưu cơ hội Frontend Intern', exact: true }).click();
      await card.getByRole('button', { name: 'Lưu cơ hội Frontend Intern', exact: true }).waitFor();
      if (process.env.COMMUNITY_SCREENSHOTS && [320, 1440].includes(width)) await page.screenshot({ path: path.join(process.env.COMMUNITY_SCREENSHOTS, `community-opportunities-${width}.png`) });
    }
    assert.equal(saveCalls, 12);
    await page.getByTestId('community-opportunities').getByRole('link', { name: 'Xem cơ hội Frontend Intern tại FPT Software', exact: true }).click();
    await page.waitForURL('**/opportunities?jobId=job-0');
    await page.goto(origin + '/community');
    await page.getByTestId('community-opportunities').getByRole('link', { name: 'Xem tất cả cơ hội', exact: true }).click();
    await page.waitForURL('**/opportunities');
    mode = 'empty';
    await page.goto(origin + '/community');
    await page.getByText('Chưa có tin tuyển dụng mới.', { exact: true }).waitFor();
    mode = 'error';
    await page.reload();
    await page.getByText('Chưa tải được cơ hội mới.', { exact: true }).waitFor();
    mode = 'jobs';
    await page.getByTestId('community-opportunities').getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByTestId('community-opportunity-job-0').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: three newest request, six widths, centered posts, stationary desktop sidebar, save/unsave, links, empty and retry states.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
