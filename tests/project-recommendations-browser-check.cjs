const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], invitations = [];
    let mode = 'members';
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    const project = { id: 'review-project', title: 'Nền tảng học tập cho sinh viên', memberTarget: 4, minimumQuantity: 2, currentMemberCount: 1, creator: { id: 'student', fullName: 'Student' }, members: [], skills: [], isCreator: true, isMember: true, roleRequirements: ['BE', 'FE', 'Tester'].map((name, i) => ({ id: `role-${i}`, roleName: name, quantity: 1 })) };
    const member = { userId: 'member-1', fullName: 'Nguyễn Phước Thịnh', avatarUrl: null, finalScore: 32, matchScore: 15, skillMatch: 15, diversityScore: 100, collaborationCount: 0, matchedSkills: ['.NET', 'Docker', 'React'], missingSkills: ['ASP.NET Core', 'C#', 'Canva', 'Figma', 'Firebase', 'Git', 'Illustrator', 'Linux'] };
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'student', email: 'student@example.test', role: 0, profileComplete: true, profile: { id: 'profile', fullName: 'Sinh viên', nickname: 'student', isVerified: false } } });
      if (pathname.endsWith('/recommended-members')) return mode === 'error' ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: mode === 'empty' ? [] : [member] });
      if (pathname.endsWith('/invitations')) { invitations.push(route.request().postDataJSON()); return route.fulfill({ json: { id: 'invitation', status: 0 } }); }
      if (pathname.endsWith('/projects/review-project')) return route.fulfill({ json: project });
      return route.fulfill({ json: [] });
    });
    const origin = process.env.PROJECT_CREATE_ORIGIN || 'http://localhost:8081';
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/group/recommendations?projectId=review-project');
      const card = page.getByTestId('recommended-member-member-1');
      await card.getByText(member.fullName, { exact: true }).waitFor();
      assert.equal(await card.getByText('Linux', { exact: true }).count(), 0);
      await card.getByRole('button', { name: 'Xem thêm 3 kỹ năng', exact: true }).click();
      await card.getByText('Linux', { exact: true }).waitFor();
      await card.getByRole('button', { name: 'Thu gọn kỹ năng', exact: true }).click();
      await card.getByRole('button', { name: 'Chi tiết gợi ý', exact: true }).click();
      await card.getByText('Điểm tổng hợp', { exact: true }).waitFor();
      await card.getByRole('button', { name: 'Ẩn chi tiết gợi ý', exact: true }).click();
      await card.getByRole('button', { name: 'FE', exact: true }).click();
      assert.equal(await card.getByRole('button', { name: 'FE', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await card.locator('*').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < 0 || r.right > innerWidth + 1); }).map(el => el.textContent)), [], `Member content must fit ${width}px`);
      if (process.env.RECOMMENDATION_SCREENSHOTS && [320, 1440].includes(width)) {
        await page.evaluate(() => document.querySelectorAll('*').forEach(el => { if (['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) el.scrollTop = 0; }));
        await page.screenshot({ path: path.join(process.env.RECOMMENDATION_SCREENSHOTS, `recommendations-${width}.png`) });
      }
      const before = invitations.length;
      await card.getByRole('button', { name: 'Mời tham gia', exact: true }).click();
      await card.getByText('Đã gửi lời mời', { exact: true }).waitFor();
      assert.equal(invitations.length, before + 1);
      assert.equal(invitations.at(-1).role, 'FE');
      assert.equal(await card.getByRole('button', { name: 'Mời tham gia', exact: true }).count(), 0);
    }
    mode = 'empty';
    await page.reload();
    await page.getByText('Chưa có đề xuất nào', { exact: true }).waitFor();
    mode = 'error';
    await page.reload();
    await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
    mode = 'members';
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByTestId('recommended-member-member-1').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: responsive recommendations, skills/details toggles, role selection, invite state, empty state and retry.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
