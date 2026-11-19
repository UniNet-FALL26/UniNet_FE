const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://127.0.0.1:8105';
const account = { id: 'default-student', email: 'default@fixture.test', role: 0, profileComplete: true, profile: { id: 'default-profile', fullName: 'Nguyễn Mai An', displayName: 'Nguyễn Mai An', nickname: 'maian', avatarUrl: null, coverUrl: null, bio: null, isVerified: false } };
const data = structuredClone(sample); data.profile = { ...sample.profile, ...account.profile }; data.isOwner = true;
for (const key of ['headline','careerObjective','location','availability','contactEmail','cvUrl','gpa','yearsOfExperience']) data.portfolio[key] = null;
for (const key of ['skills','projects','education','experience','certificates','articles','socialLinks','activities','languages']) data.portfolio[key] = [];
data.portfolio.appearance.profile = { sectionOrder: [], hiddenSections: [], showPortfolio: false };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(15000); const errors = [], loginErrors = []; let writes = 0;
  page.on('pageerror', error => { if (new URL(page.url()).pathname === '/login' && error.message.startsWith('Minified React error #418;')) loginErrors.push(error.message); else errors.push(error.message); });
  await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(message => { if (String(message).includes('"protocol"')) socket.send('{}\x1e'); }));
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'default-fixture', refreshToken: 'default-refresh', expiresAt: '2099-01-01T00:00:00Z', requiresProfileCompletion: false } });
    if (req.method() !== 'GET') writes++;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
    if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
    if (path.endsWith('/profile/portfolio/' + data.profile.id)) return route.fulfill({ json: { ...data, isOwner: false } });
    if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { count: 0 } });
    if (path.endsWith('/notifications')) return route.fulfill({ json: { items: [], unreadCount: 0, total: 0, page: 1, pageSize: 20 } });
    return route.fulfill({ json: [] });
  });
  fs.mkdirSync('dist/student-profile-default-check', { recursive: true });
  try {
    await page.goto(origin + '/login');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.getByTestId('modern-hero').waitFor();
    await page.goto(origin + '/(tabs)/profile');
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByTestId('modern-hero').waitFor();
      assert.equal(await page.getByTestId('student-profile-starter').count(), 0);
      assert.equal(await page.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).count(), 0);
      assert.equal(await page.getByTestId('modern-hero').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(12, 24, 43)');
      for (const title of ['Kỹ năng','Hành trình phát triển','Dự án bản thân','Chứng chỉ','Blog & Chia sẻ']) assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 0);
      assert.equal(await page.getByText('Trịnh Trọng Quyền', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('img', { name: 'Ảnh đại diện ' + account.profile.fullName }).count(), 0);
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await page.screenshot({ path: `dist/student-profile-default-check/empty-${width}.png`, fullPage: true });
    }
    await page.reload(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await page.getByTestId('modern-hero').waitFor();
    data.portfolio.headline = 'Sinh viên Kỹ thuật phần mềm'; data.portfolio.education = [structuredClone(sample.portfolio.education[0])];
    await page.reload(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await page.getByRole('heading', { name: 'Hành trình phát triển', exact: true }).waitFor();
    await page.getByText(data.portfolio.headline, { exact: true }).first().waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Kỹ năng', exact: true }).count(), 0);
    await page.screenshot({ path: 'dist/student-profile-default-check/partial-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    await page.waitForURL(/profile\/editor/); assert.equal(new URL(page.url()).searchParams.get('template'), 'developer-modern');
    await page.goto(origin + '/settings'); await page.getByRole('button', { name: 'Đổi mẫu hồ sơ', exact: true }).waitFor();
    assert.equal(await page.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ' }).count(), 0);
    await page.goto(origin + '/profile/view/' + data.profile.id); await page.getByTestId('modern-hero').waitFor();
    assert.equal(await page.getByTestId('student-profile-starter').count(), 0);
    assert.equal(writes, 0, 'reads, navigation and login must not save preferences or profile content');
    assert.deepEqual(errors, []);
    if (loginErrors.length) console.warn('Known baseline login hydration #418 reported separately.');
    console.log('PASS: empty/default and legacy-disabled student templates, partial data, reload, editor, settings, visitor and 320/768/1440px; zero writes.');
  } catch (error) { await page.screenshot({ path: 'dist/student-profile-default-check/failure.png', fullPage: true }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
